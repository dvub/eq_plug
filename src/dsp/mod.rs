mod nodes;
mod param_node;

use fundsp::hacker32::*;
use std::sync::Arc;

use crossbeam_channel::Sender;

use nodes::*;

use crate::params::PluginParams;

pub fn build_graph(
    dry_tx: Sender<f32>,
    wet_tx: Sender<f32>,
    p: &Arc<PluginParams>,
) -> Box<dyn AudioUnit> {
    let eq = lp_with_params(p) >> bell_with_params(p) >> hp_with_params(p);

    let dry_watcher = join::<U2>()
    // TODO: use fundsp::snoop
        >> map(move |i| {
            let _ = dry_tx.try_send(i[0]);
            i[0]
        })
        >> sink();

    let wet_watcher = join::<U2>()
        >> map(move |i| {
            let _ = wet_tx.try_send(i[0]);
            i[0]
        })
        >> sink();

    let wet_out = multipass::<U2>() ^ wet_watcher;
    let dry_in = multipass::<U2>() ^ dry_watcher;

    let graph = dry_in >> eq >> wet_out;

    Box::new(graph)
}

fn lp_with_params(p: &Arc<PluginParams>) -> An<impl AudioNode<Inputs = U2, Outputs = U2>> {
    stacki::<U2, _, _>(|_| (pass() | lp_freq::<U1>(p) | lp_q::<U1>(p)) >> lowpass())
}

fn hp_with_params(p: &Arc<PluginParams>) -> An<impl AudioNode<Inputs = U2, Outputs = U2>> {
    stacki::<U2, _, _>(|_| (pass() | hp_freq::<U1>(p) | hp_q::<U1>(p)) >> highpass())
}

fn bell_with_params(p: &Arc<PluginParams>) -> An<impl AudioNode<Inputs = U2, Outputs = U2>> {
    stacki::<U2, _, _>(|_| {
        (pass() | bell_freq::<U1>(p) | nodes::bell_q::<U1>(p) | bell_gain::<U1>(p)) >> bell()
    })
}
