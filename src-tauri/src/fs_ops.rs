//! Filesystem transport commands. Thin wrappers over `std::fs` (ADR-0003).

use std::fs;
use std::path::{Path, PathBuf};

/// Create the directory at `path`, including parents. Idempotent.
#[tauri::command]
pub fn ensure_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

/// Write `contents` to `path`, creating or truncating the file.
#[tauri::command]
pub fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

/// Read the file at `path` as UTF-8.
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// True when a file or directory exists at `path`.
#[tauri::command]
pub fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

/// Recursively list Markdown (`.md`) file paths under `root`, skipping dot-dirs
/// (e.g. `.git`). Returns absolute paths. Thin transport — the service decides
/// what to do with them.
#[tauri::command]
pub fn list_markdown(root: String) -> Result<Vec<String>, String> {
    let mut out = Vec::new();
    walk_md(Path::new(&root), &mut out).map_err(|e| e.to_string())?;
    out.sort();
    Ok(out)
}

fn walk_md(dir: &Path, out: &mut Vec<String>) -> std::io::Result<()> {
    if !dir.is_dir() {
        return Ok(());
    }
    for entry in fs::read_dir(dir)? {
        let path: PathBuf = entry?.path();
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if name.starts_with('.') {
            continue; // skip .git, .github, etc.
        }
        if path.is_dir() {
            walk_md(&path, out)?;
        } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
            if let Some(s) = path.to_str() {
                out.push(s.to_string());
            }
        }
    }
    Ok(())
}
