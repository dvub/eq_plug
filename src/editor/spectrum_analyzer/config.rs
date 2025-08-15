use crate::editor::{
    spectrum_analyzer::monitor::MonitorMode,
    util::{DEFAULT_FREQ_RANGE, DEFAULT_MAGNITUDE_RANGE},
};

const DEFAULT_SLOPE: f32 = 4.5; // db/oct (or at least should be)
const DEFAULT_PEAK_DECAY: f32 = 0.25; // seconds
const DEFAULT_INTERPOLATION: bool = true;
pub const DEFAULT_MONITOR_MODE: MonitorMode = MonitorMode::Rms(DEFAULT_PEAK_DECAY);

pub struct SpectrumAnalyzerConfig {
    pub interpolate: bool,
    pub slope: f32,
    pub frequency_range: (f32, f32),
    pub magnitude_range: (f32, f32),
}
// TODO: make aware of sample rate
impl Default for SpectrumAnalyzerConfig {
    fn default() -> Self {
        Self {
            interpolate: DEFAULT_INTERPOLATION,
            frequency_range: DEFAULT_FREQ_RANGE,
            magnitude_range: DEFAULT_MAGNITUDE_RANGE,
            slope: DEFAULT_SLOPE,
        }
    }
}
