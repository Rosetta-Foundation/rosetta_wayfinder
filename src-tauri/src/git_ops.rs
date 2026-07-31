//! Git transport commands. Thin wrappers over libgit2 via the `git2` crate
//! (ADR-0003). No business logic — the service layer decides when to commit and
//! with what message; these commands just execute the mechanical git operation.

use git2::{Repository, Signature};
use serde::Serialize;

/// A single commit in the ledger, serialized to the frontend `LedgerEntry` type.
#[derive(Serialize)]
pub struct LedgerEntry {
    pub sha: String,
    pub message: String,
    pub timestamp: String,
}

/// True when a git repository exists at `repo_path`.
#[tauri::command]
pub fn git_is_repo(repo_path: String) -> bool {
    Repository::open(&repo_path).is_ok()
}

/// Initialize a git repository at `repo_path` with `main` as the default branch.
/// Idempotent — re-init is a no-op for an existing repo.
#[tauri::command]
pub fn git_init(repo_path: String) -> Result<(), String> {
    let mut opts = git2::RepositoryInitOptions::new();
    opts.initial_head("main");
    Repository::init_opts(&repo_path, &opts).map_err(|e| e.to_string())?;
    Ok(())
}

/// Stage all changes and create a commit with `message`. Returns the new SHA.
///
/// Uses a fixed local signature; the app is single-user and the ledger records
/// actions, not authorship attribution.
#[tauri::command]
pub fn git_commit_all(repo_path: String, message: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    // Stage everything (including deletions).
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index
        .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;

    let tree_oid = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;

    let sig = Signature::now("Wayfinder", "wayfinder@rosetta.local")
        .map_err(|e| e.to_string())?;

    // Parent is HEAD when it exists (subsequent commits); none for the root commit.
    let parent = repo
        .head()
        .ok()
        .and_then(|h| h.target())
        .and_then(|oid| repo.find_commit(oid).ok());

    let parents: Vec<&git2::Commit> = parent.iter().collect();

    let oid = repo
        .commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents)
        .map_err(|e| e.to_string())?;

    Ok(oid.to_string())
}

/// Return up to `limit` most-recent commits, newest first.
#[tauri::command]
pub fn git_log(repo_path: String, limit: usize) -> Result<Vec<LedgerEntry>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    // An empty repo (no HEAD yet) has no history.
    if repo.head().is_err() {
        return Ok(Vec::new());
    }

    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push_head().map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for oid in revwalk.take(limit) {
        let oid = oid.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
        let seconds = commit.time().seconds();
        entries.push(LedgerEntry {
            sha: oid.to_string(),
            message: commit.summary().unwrap_or("").to_string(),
            timestamp: format_iso8601(seconds),
        });
    }
    Ok(entries)
}

/// Format a Unix timestamp (seconds) as a UTC ISO-8601 string, no extra deps.
fn format_iso8601(secs: i64) -> String {
    // Days from civil (Howard Hinnant's algorithm) for a dependency-free UTC date.
    let days = secs.div_euclid(86_400);
    let rem = secs.rem_euclid(86_400);
    let (hour, minute, second) = (rem / 3600, (rem % 3600) / 60, rem % 60);

    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if month <= 2 { y + 1 } else { y };

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, hour, minute, second
    )
}
