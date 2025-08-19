mod component;
mod embedded;
mod freq_response;
mod ipc;
mod spectrum_analyzer;
mod util;

#[cfg(feature = "embedded-gui")]
use embedded::build_protocol;

use ipc::{DrawData, DrawRequest, Message};
use spectrum_analyzer::SpectrumAnalyzer;

use crossbeam_channel::Receiver;
use nih_plug::{editor::Editor, params::Params, prelude::AtomicF32};
use nih_plug_webview::{Context, EditorHandler, WebViewConfig, WebViewEditor, WebViewSource};
use std::{path::PathBuf, sync::Arc};

use crate::{
    editor::{
        component::RenderingComponent,
        freq_response::FrequencyResponse,
        ipc::{InitResponse, ParameterUpdate},
        util::send_message,
    },
    params::PluginParams,
};

pub struct PluginGui {
    dry_spectrum_analyzer: SpectrumAnalyzer,
    wet_spectrum_analyzer: SpectrumAnalyzer,
    frequency_response: FrequencyResponse,
    params: Arc<PluginParams>,
}

impl PluginGui {
    pub fn new_editor(
        params: &Arc<PluginParams>,
        dry_rx: Receiver<f32>,
        wet_rx: Receiver<f32>,
        sample_rate: Arc<AtomicF32>,
    ) -> Option<Box<dyn Editor>> {
        // SOURCE
        let protocol_name = "assets".to_string();
        let source = if cfg!(feature = "embedded-gui") {
            // this protocol will bundle the GUI in the plugin
            WebViewSource::CustomProtocol {
                protocol: protocol_name.clone(),
                url: String::new(),
            }
        } else {
            WebViewSource::URL(String::from("http://localhost:3000"))
        };
        // CONFIG
        let config = WebViewConfig {
            title: "Spectrum Analyzer".to_string(),
            source,
            // QUESTION: should we change this?
            workdir: PathBuf::from(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/target/webview-workdir"
            )),
        };
        // EDITOR
        let editor_base = PluginGui {
            dry_spectrum_analyzer: SpectrumAnalyzer::new(sample_rate.clone(), dry_rx.clone()),
            wet_spectrum_analyzer: SpectrumAnalyzer::new(sample_rate.clone(), wet_rx.clone()),
            frequency_response: FrequencyResponse::new(params, sample_rate.clone()),
            params: params.clone(),
        };

        Some(Box::new(WebViewEditor::new_with_webview(
            editor_base,
            &params.state,
            config,
            move |mut builder| {
                #[cfg(feature = "embedded-gui")]
                {
                    builder = builder.with_custom_protocol(protocol_name.clone(), build_protocol());
                }
                builder = builder
                    .with_devtools(!cfg!(feature = "embedded-gui"))
                    .with_background_color((0, 0, 0, 1));
                builder
            },
        )))
    }

    fn handle_message(&mut self, message: Message, cx: &mut Context) {
        match message {
            Message::InitResponse(_) => todo!(),
            Message::ParameterUpdate(parameter_update) => {
                self.handle_parameter_update(cx, &parameter_update)
            }
            Message::Init => self.handle_init(cx),
            Message::Resize { width, height } => {
                let resize_result = cx.resize_window(width, height);
                if !resize_result {
                    println!("WARNING: the window was not resized upon request");
                }
            }
            // !!
            Message::DrawRequest(draw_request) => self.handle_draw_request(draw_request, cx),

            // still not sure what to do here
            Message::DrawData(_) => todo!(),
        }
    }

    fn handle_draw_request(&mut self, draw_request: DrawRequest, cx: &mut Context) {
        match draw_request {
            DrawRequest::Spectrum => {
                let dry = self.dry_spectrum_analyzer.handle_request();
                let wet = self.wet_spectrum_analyzer.handle_request();

                if dry.is_empty() && wet.is_empty() {
                    return;
                }
                let message = Message::DrawData(DrawData::Spectrum { dry, wet });
                send_message(cx, message);
            }
        }
    }
    fn handle_parameter_update(&self, cx: &mut Context, param_update: &ParameterUpdate) {
        let param_map = self.params.param_map();
        let param_setter = cx.get_param_setter();

        let normalize_new_value = param_update.value;

        let id = &param_update.parameter_id;
        let param_ptr = param_map
            .iter()
            .find(|(map_id, _, _)| map_id == id)
            .unwrap()
            .1;

        unsafe {
            param_setter.raw_context.raw_begin_set_parameter(param_ptr);
            param_setter
                .raw_context
                .raw_set_parameter_normalized(param_ptr, normalize_new_value);
            param_setter.raw_context.raw_end_set_parameter(param_ptr);
        }
    }
    fn handle_init(&mut self, cx: &mut Context) {
        let init_params = build_param_update_array(&self.params);

        send_message(
            cx,
            Message::DrawData(DrawData::FrequencyResponse(
                self.frequency_response.handle_request(),
            )),
        );
        send_message(cx, Message::InitResponse(InitResponse { init_params }));
    }
}

impl EditorHandler for PluginGui {
    fn on_frame(&mut self, _: &mut Context) {}

    fn on_message(&mut self, cx: &mut Context, message: String) {
        let message: Message = serde_json::from_str(&message).expect("Error reading message");
        self.handle_message(message, cx);
    }

    // TODO:!!!!! only handle new frequency response when any params change, not PER EVERY SINGLE PARAM CHANGE
    fn on_params_changed(&mut self, cx: &mut Context) {}
    fn on_param_value_changed(&mut self, cx: &mut Context, id: &str, normalized_value: f32) {
        send_message(
            cx,
            Message::ParameterUpdate(ParameterUpdate {
                parameter_id: id.to_string(),
                value: normalized_value,
            }),
        );
        // NOTE: in the future, don't update if an EQ param wasn't changed
        send_message(
            cx,
            Message::DrawData(DrawData::FrequencyResponse(
                self.frequency_response.handle_request(),
            )),
        );
    }
}

fn build_param_update_array(params: &Arc<PluginParams>) -> Vec<ParameterUpdate> {
    let param_map = params.param_map();
    param_map
        // TODO: issue with into_iter?
        .into_iter()
        .map(|(id, ptr, _)| ParameterUpdate {
            parameter_id: id,
            value: unsafe { ptr.unmodulated_normalized_value() },
        })
        .collect()
}
