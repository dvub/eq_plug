use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Serialize, Deserialize, TS, Debug)]
#[serde(rename_all = "camelCase", tag = "type", content = "data")]
#[ts(export)]
pub enum Message {
    Init,
    Resize { width: f64, height: f64 },
    DrawData(DrawData),
    DrawRequest(DrawRequest),
}
pub type Coordinates = Vec<(f32, f32)>;
// TODO: change tag/content for clarity
#[derive(Serialize, Deserialize, TS, Debug)]
#[serde(rename_all = "camelCase", tag = "type", content = "data")]
#[ts(export)]
pub enum DrawData {
    // TODO: probably should rename this to Eq or something
    Spectrum { dry: Coordinates, wet: Coordinates },
    FrequencyResponse(Coordinates),
}
// TODO: change tag/content for clarity
#[derive(Serialize, Deserialize, TS, Debug)]
#[serde(rename_all = "camelCase", tag = "type", content = "data")]
#[ts(export)]
pub enum DrawRequest {
    Spectrum,
}
