pub mod eq;
mod nodes;
mod param_node;

use fundsp::hacker32::*;
use std::sync::Arc;

use crossbeam_channel::Sender;

use crate::{dsp::eq::build_eq, params::PluginParams};

pub fn build_graph(
    dry_tx: Sender<f32>,
    wet_tx: Sender<f32>,
    p: &Arc<PluginParams>,
) -> Box<dyn AudioUnit> {
    let eq = build_eq(p);
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
