//! Wayfinder's thin Rust core.
//!
//! Per ADR-0003, this layer is a logic-free transport shim. Each `#[tauri::command]`
//! is a near-1:1 wrapper over a native capability (libgit2, filesystem, path
//! resolution, Claude API HTTP). All business logic lives in the TypeScript
//! frontend under the Handler / Service / Repository pattern. Do not add decisions,
//! validation, or orchestration here — if it thinks, it belongs in a TypeScript service.

mod claude_ops;
mod fs_ops;
mod git_ops;
mod paths;

/// Wire up the Tauri app and register the primitive command surface.
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            fs_ops::ensure_dir,
            fs_ops::write_file,
            fs_ops::read_file,
            fs_ops::path_exists,
            fs_ops::list_markdown,
            git_ops::git_init,
            git_ops::git_is_repo,
            git_ops::git_commit_all,
            git_ops::git_log,
            paths::default_chronicle_path,
            paths::config_path,
            claude_ops::claude_invoke,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Wayfinder");
}
