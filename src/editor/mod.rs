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
use nih_plug::{editor::Editor, prelude::AtomicF32};
use nih_plug_webview::{
    Context, EditorHandler, WebViewConfig, WebViewEditor, WebViewSource, WebViewState,
};
use serde_json::json;
use std::{path::PathBuf, sync::Arc};

use crate::{
    editor::{component::RenderingComponent, freq_response::FrequencyResponse},
    params::PluginParams,
};

pub struct PluginGui {
    dry_spectrum_analyzer: SpectrumAnalyzer,
    wet_spectrum_analyzer: SpectrumAnalyzer,
    frequency_response: FrequencyResponse,
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
                builder = builder.with_devtools(!cfg!(feature = "embedded-gui"));
                builder
            },
        )))
    }

    fn handle_message(&mut self, message: Message, cx: &mut Context) {
        match message {
            Message::Init => {}
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
                let message = Message::DrawData(DrawData::Spectrum {
                    dry: self.dry_spectrum_analyzer.handle_request(),
                    wet: self.wet_spectrum_analyzer.handle_request(),
                });

                cx.send_message(json!(message).to_string());
            }
        }
    }
}

impl EditorHandler for PluginGui {
    fn on_frame(&mut self, _: &mut Context) {}

    fn on_message(&mut self, cx: &mut Context, message: String) {
        let message: Message = serde_json::from_str(&message).expect("Error reading message");
        self.handle_message(message, cx);
    }

    fn on_params_changed(&mut self, cx: &mut Context) {
        let message = Message::DrawData(DrawData::FrequencyResponse(
            self.frequency_response.handle_request(),
        ));
        // TODO: wrap in utility fn
        cx.send_message(json!(message).to_string());
    }
}
