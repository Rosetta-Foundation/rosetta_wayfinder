//! Path resolution transport commands (ADR-0003). Resolves OS-specific default
//! locations; the service layer decides how to use them.

/// The default chronicle repository path: `<home>/Wayfinder/chronicle`.
#[tauri::command]
pub fn default_chronicle_path() -> Result<String, String> {
    let home = dirs::home_dir().ok_or_else(|| "could not resolve home directory".to_string())?;
    let path = home.join("Wayfinder").join("chronicle");
    path.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "chronicle path is not valid UTF-8".to_string())
}

/// The Wayfinder config file path: `<home>/.wayfinder/config.json`.
#[tauri::command]
pub fn config_path() -> Result<String, String> {
    let home = dirs::home_dir().ok_or_else(|| "could not resolve home directory".to_string())?;
    let path = home.join(".wayfinder").join("config.json");
    path.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "config path is not valid UTF-8".to_string())
}
