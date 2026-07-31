//! Claude API transport command (ADR-0003). This is the credential-bearing seam:
//! `ANTHROPIC_API_KEY` lives in the native process and never touches the webview.
//! TypeScript services shape the Messages request; this command only posts it.

use serde::Serialize;

const ANTHROPIC_MESSAGES_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2023-06-01";

/// The result of one Claude Messages invocation, serialized to the frontend.
#[derive(Serialize)]
pub struct ClaudeReply {
    /// Concatenated assistant text from the response content blocks.
    pub text: String,
    /// Tokens billed for the request.
    pub input_tokens: u32,
    /// Tokens billed for the response.
    pub output_tokens: u32,
    /// The model id that produced the reply.
    pub model: String,
}

/// POST a fully-formed Anthropic Messages request body to the Claude API.
///
/// `body_json` must already include `model`, `max_tokens`, and `messages`
/// (and optional `system`). This command does not shape the payload.
#[tauri::command]
pub async fn claude_invoke(body_json: String) -> Result<ClaudeReply, String> {
    let api_key = std::env::var("ANTHROPIC_API_KEY").map_err(|_| {
        "ANTHROPIC_API_KEY is not set. Export your Anthropic API key before starting Wayfinder."
            .to_string()
    })?;

    let client = reqwest::Client::new();
    let resp = client
        .post(ANTHROPIC_MESSAGES_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("content-type", "application/json")
        .body(body_json)
        .send()
        .await
        .map_err(|e| format!("claude request failed: {e}"))?;

    let status = resp.status();
    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("claude response read failed: {e}"))?;

    if !status.is_success() {
        let body = String::from_utf8_lossy(&bytes);
        return Err(format!("claude API error ({status}): {body}"));
    }

    let payload: serde_json::Value =
        serde_json::from_slice(&bytes).map_err(|e| format!("bad claude response: {e}"))?;

    Ok(parse_reply(&payload))
}

/// Pull text + usage out of an Anthropic Messages response body.
fn parse_reply(payload: &serde_json::Value) -> ClaudeReply {
    let text = payload
        .get("content")
        .and_then(|c| c.as_array())
        .map(|blocks| {
            blocks
                .iter()
                .filter_map(|b| b.get("text").and_then(|t| t.as_str()))
                .collect::<Vec<_>>()
                .join("")
        })
        .unwrap_or_default();

    let input_tokens = payload
        .get("usage")
        .and_then(|u| u.get("input_tokens"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;

    let output_tokens = payload
        .get("usage")
        .and_then(|u| u.get("output_tokens"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;

    let model = payload
        .get("model")
        .and_then(|m| m.as_str())
        .unwrap_or("")
        .to_string();

    ClaudeReply {
        text,
        input_tokens,
        output_tokens,
        model,
    }
}
