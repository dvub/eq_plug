use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Serialize, Deserialize, TS, Debug)]
#[serde(rename_all = "camelCase", tag = "type", content = "data")]
#[ts(export)]
pub enum Message {
    Init,
    InitResponse(InitResponse),
    Resize { width: f64, height: f64 },
    DrawData(DrawData),
    DrawRequest(DrawRequest),
    ParameterUpdate(ParameterUpdate),
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[serde(rename_all = "camelCase", tag = "drawType", content = "drawData")]
#[ts(export)]
pub enum DrawData {
    Spectrum { dry: Vec<f32>, wet: Vec<f32> },
    FrequencyResponse(Vec<(f32, f32)>),
}
#[derive(Serialize, Deserialize, TS, Debug)]
#[serde(rename_all = "camelCase", tag = "requestType", content = "requestData")]
#[ts(export)]
pub enum DrawRequest {
    Spectrum,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ParameterUpdate {
    pub parameter_id: String,
    pub value: f32,
}

#[derive(Serialize, Deserialize, TS, Debug)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct InitResponse {
    pub init_params: Vec<ParameterUpdate>,
}
