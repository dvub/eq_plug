pub const DEFAULT_FREQ_RANGE: (f32, f32) = (20.0, 20_000.0); // hz
pub const DEFAULT_MAGNITUDE_RANGE: (f32, f32) = (-76.0, 24.0); // db

pub fn normalize(value: f32, min: f32, max: f32) -> f32 {
    (value - min) / (max - min)
}
