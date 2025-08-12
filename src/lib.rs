mod dsp;
mod editor;
mod params;

use crossbeam_channel::{bounded, Receiver, Sender};
use fundsp::hacker32::*;
use nih_plug::prelude::*;
use params::PluginParams;
use std::sync::{atomic::Ordering, Arc};

use crate::{dsp::build_graph, editor::PluginGui};

// This is a shortened version of the gain example with most comments removed, check out
// https://github.com/robbert-vdh/nih-plug/blob/master/plugins/examples/gain/src/lib.rs to get
// started

struct PluginStruct {
    params: Arc<PluginParams>,
    graph: BigBlockAdapter,
    buffers: Vec<Vec<f32>>,

    dry_tx: Sender<f32>,
    dry_rx: Receiver<f32>,

    wet_tx: Sender<f32>,
    wet_rx: Receiver<f32>,

    sample_rate: Arc<AtomicF32>,
}

impl Default for PluginStruct {
    fn default() -> Self {
        let (dry_tx, dry_rx) = bounded(1024);
        let (wet_tx, wet_rx) = bounded(1024);
        Self {
            params: Arc::new(PluginParams::default()),
            graph: BigBlockAdapter::new(Box::new(sink())),
            buffers: Vec::new(),
            dry_tx,
            dry_rx,

            wet_rx,
            wet_tx,
            sample_rate: Arc::new(AtomicF32::new(0.0)),
        }
    }
}

impl Plugin for PluginStruct {
    const NAME: &'static str = "Eq Plug";
    const VENDOR: &'static str = "dvub";
    const URL: &'static str = env!("CARGO_PKG_HOMEPAGE");
    const EMAIL: &'static str = "todo";

    const VERSION: &'static str = env!("CARGO_PKG_VERSION");

    // The first audio IO layout is used as the default. The other layouts may be selected either
    // explicitly or automatically by the host or the user depending on the plugin API/backend.
    const AUDIO_IO_LAYOUTS: &'static [AudioIOLayout] = &[AudioIOLayout {
        main_input_channels: NonZeroU32::new(2),
        main_output_channels: NonZeroU32::new(2),

        aux_input_ports: &[],
        aux_output_ports: &[],

        // Individual ports and the layout as a whole can be named here. By default these names
        // are generated as needed. This layout will be called 'Stereo', while a layout with
        // only one input and output channel would be called 'Mono'.
        names: PortNames::const_default(),
    }];

    const MIDI_INPUT: MidiConfig = MidiConfig::None;
    const MIDI_OUTPUT: MidiConfig = MidiConfig::None;

    const SAMPLE_ACCURATE_AUTOMATION: bool = true;

    // If the plugin can send or receive SysEx messages, it can define a type to wrap around those
    // messages here. The type implements the `SysExMessage` trait, which allows conversion to and
    // from plain byte buffers.
    type SysExMessage = ();
    // More advanced plugins can use this to run expensive background tasks. See the field's
    // documentation for more information. `()` means that the plugin does not have any background
    // tasks.
    type BackgroundTask = ();

    fn params(&self) -> Arc<dyn Params> {
        self.params.clone()
    }
    fn editor(&mut self, _: AsyncExecutor<Self>) -> Option<Box<dyn Editor>> {
        PluginGui::new_editor(
            &self.params.state,
            self.dry_rx.clone(),
            self.wet_rx.clone(),
            self.sample_rate.clone(),
        )
    }

    fn initialize(
        &mut self,
        _audio_io_layout: &AudioIOLayout,
        buffer_config: &BufferConfig,
        _context: &mut impl InitContext<Self>,
    ) -> bool {
        self.buffers = vec![vec![0.0; buffer_config.max_buffer_size as usize]; 2];
        self.sample_rate
            .store(buffer_config.sample_rate, Ordering::Relaxed);

        let graph = build_graph(
            self.dry_tx.clone(),
            self.wet_tx.clone(),
            &self.params.clone(),
        );

        self.graph = BigBlockAdapter::new(graph);
        self.graph
            .set_sample_rate(f64::from(buffer_config.sample_rate));
        self.graph.allocate();

        true
    }

    // not sure if this is needed..
    fn reset(&mut self) {
        self.graph.reset();
    }

    fn process(
        &mut self,
        buffer: &mut Buffer,
        _aux: &mut AuxiliaryBuffers,
        _context: &mut impl ProcessContext<Self>,
    ) -> ProcessStatus {
        for (i, chan) in buffer.as_slice_immutable().iter().enumerate() {
            self.buffers[i][..buffer.samples()].copy_from_slice(chan);
        }

        self.graph
            .process_big(buffer.samples(), &self.buffers, buffer.as_slice());

        ProcessStatus::Normal
    }
}

impl ClapPlugin for PluginStruct {
    const CLAP_ID: &'static str = "com.your-domain.eq-plug";
    const CLAP_DESCRIPTION: Option<&'static str> = Some("todo");
    const CLAP_MANUAL_URL: Option<&'static str> = Some(Self::URL);
    const CLAP_SUPPORT_URL: Option<&'static str> = None;

    // Don't forget to change these features
    const CLAP_FEATURES: &'static [ClapFeature] = &[ClapFeature::AudioEffect, ClapFeature::Stereo];
}

impl Vst3Plugin for PluginStruct {
    const VST3_CLASS_ID: [u8; 16] = *b"Exactly16Chars!!";

    // And also don't forget to change these categories
    const VST3_SUBCATEGORIES: &'static [Vst3SubCategory] =
        &[Vst3SubCategory::Fx, Vst3SubCategory::Dynamics];
}

nih_export_clap!(PluginStruct);
nih_export_vst3!(PluginStruct);
