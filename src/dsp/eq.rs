use std::sync::Arc;

use fundsp::hacker32::*;

use crate::{dsp::nodes::*, params::PluginParams};

pub fn build_eq(p: &Arc<PluginParams>) -> An<impl AudioNode<Inputs = U2, Outputs = U2>> {
    lp_with_params(p) >> bell_with_params(p) >> hp_with_params(p)
}

fn lp_with_params(p: &Arc<PluginParams>) -> An<impl AudioNode<Inputs = U2, Outputs = U2>> {
    stacki::<U2, _, _>(|_| (pass() | lp_freq::<U1>(p) | lp_q::<U1>(p)) >> lowpass())
}

fn hp_with_params(p: &Arc<PluginParams>) -> An<impl AudioNode<Inputs = U2, Outputs = U2>> {
    stacki::<U2, _, _>(|_| (pass() | hp_freq::<U1>(p) | hp_q::<U1>(p)) >> highpass())
}

fn bell_with_params(p: &Arc<PluginParams>) -> An<impl AudioNode<Inputs = U2, Outputs = U2>> {
    stacki::<U2, _, _>(|_| {
        (pass() | bell_freq::<U1>(p) | crate::dsp::nodes::bell_q::<U1>(p) | bell_gain::<U1>(p))
            >> bell()
    })
}
