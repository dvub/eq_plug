use std::{fs, path::PathBuf};

use directories::ProjectDirs;

// TODO: is pathbuf ok?
// TODO: fix unwraps
pub fn get_plugin_dir() -> ProjectDirs {
    ProjectDirs::from("com", "dvub", "eq plug").unwrap()
}

pub fn get_plugin_data_dir() -> PathBuf {
    let dir = get_plugin_dir();
    let data_dir = dir.data_dir();
    if !data_dir.exists() {
        fs::create_dir_all(data_dir).unwrap();
    }
    data_dir.to_path_buf()
}
