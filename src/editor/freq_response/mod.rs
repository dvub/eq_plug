mod config;

use std::sync::{atomic::Ordering, Arc};

use fundsp::hacker32::*;
use nih_plug::prelude::AtomicF32;

use crate::{
    dsp::eq::build_eq,
    editor::{
        component::RenderingComponent, freq_response::config::FrequencyResponseConfig,
        util::normalize,
    },
    params::PluginParams,
};

pub struct FrequencyResponse {
    sample_rate: Arc<AtomicF32>,
    config: FrequencyResponseConfig,
    graph: Box<dyn AudioUnit>,
}

impl FrequencyResponse {
    pub fn new(p: &Arc<PluginParams>, sample_rate: Arc<AtomicF32>) -> Self {
        let mut eq: Box<dyn AudioUnit> = Box::new(build_eq(p));
        eq.filter_stereo(0.5, 0.5);

        Self {
            graph: eq,
            config: FrequencyResponseConfig::new(sample_rate.clone()),
            sample_rate: sample_rate.clone(),
        }
    }
}

impl RenderingComponent for FrequencyResponse {
    type RenderType = Vec<(f32, f32)>;

    fn tick(&mut self) {
        // TODO: fix this hack
        self.graph
            .set_sample_rate(self.sample_rate.load(Ordering::Relaxed) as f64);
        self.graph.filter_stereo(0.5, 0.5);
    }

    fn get_drawing_coordinates(&mut self) -> Self::RenderType {
        let min_freq = self.config.frequency_range.0;
        let max_freq = self.sample_rate.load(Ordering::Relaxed) / 2.0;
        (min_freq as u32..max_freq as u32)
            .step_by(100)
            .map(|freq| {
                let minl = min_freq.log2();
                let range = max_freq.log2() - minl;

                let normalized_freq = ((freq as f32).log2() - minl) / range;

                let response = self
                    .graph
                    .response_db(0, freq as f64)
                    .expect("ERROR GETTING FREQ RESPONSE") as f32;

                let normalized_response = normalize(
                    response,
                    self.config.magnitude_range.0,
                    self.config.magnitude_range.1,
                );

                (normalized_freq, normalized_response)
            })
            .collect()
    }
}
