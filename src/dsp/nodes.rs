// opcodes for all params

use std::sync::Arc;

use fundsp::hacker32::*;

use crate::{
    dsp::param_node::{Accessor, ParamNode},
    params::PluginParams,
};

pub fn lp_freq<N: Size<f32>>(
    p: &Arc<PluginParams>,
) -> An<ParamNode<PluginParams, impl Accessor<PluginParams>, N>> {
    ParamNode::new(p, |p| p.lowpass_freq.value())
}

pub fn lp_q<N: Size<f32>>(
    p: &Arc<PluginParams>,
) -> An<ParamNode<PluginParams, impl Accessor<PluginParams>, N>> {
    ParamNode::new(p, |p| p.lowpass_q.value())
}

// highpass

pub fn hp_freq<N: Size<f32>>(
    p: &Arc<PluginParams>,
) -> An<ParamNode<PluginParams, impl Accessor<PluginParams>, N>> {
    ParamNode::new(p, |p| p.highpass_freq.value())
}
pub fn hp_q<N: Size<f32>>(
    p: &Arc<PluginParams>,
) -> An<ParamNode<PluginParams, impl Accessor<PluginParams>, N>> {
    ParamNode::new(p, |p| p.highpass_q.value())
}

// bell

pub fn bell_freq<N: Size<f32>>(
    p: &Arc<PluginParams>,
) -> An<ParamNode<PluginParams, impl Accessor<PluginParams>, N>> {
    ParamNode::new(p, |p| p.bell_freq.value())
}
pub fn bell_q<N: Size<f32>>(
    p: &Arc<PluginParams>,
) -> An<ParamNode<PluginParams, impl Accessor<PluginParams>, N>> {
    ParamNode::new(p, |p| p.bell_q.value())
}

pub fn bell_gain<N: Size<f32>>(
    p: &Arc<PluginParams>,
) -> An<ParamNode<PluginParams, impl Accessor<PluginParams>, N>> {
    ParamNode::new(p, |p| p.bell_gain.value())
}
