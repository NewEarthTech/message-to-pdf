use anyhow::Result;
use dialoguer::FuzzySelect;
use dialoguer::theme::ColorfulTheme;

use msg2pdf_core::conversations::ConversationSummary;
use msg2pdf_core::load::ChatRef;

/// Present a fuzzy picker over the 1:1 conversations and return the chosen chat.
pub fn pick(summaries: Vec<ConversationSummary>) -> Result<ChatRef> {
    let items: Vec<String> = summaries.iter().map(format_row).collect();

    let idx = FuzzySelect::with_theme(&ColorfulTheme::default())
        .with_prompt("Select a conversation")
        .items(&items)
        .default(0)
        .interact()?;

    Ok(summaries.into_iter().nth(idx).unwrap().into_chat_ref())
}

fn format_row(s: &ConversationSummary) -> String {
    let name = s.name();
    let suffix = if name != s.handle {
        format!(" ({})", s.handle)
    } else {
        String::new()
    };
    let when = s
        .last_message
        .map(|d| d.format("%Y-%m-%d").to_string())
        .unwrap_or_else(|| "never".into());
    let head = format!("{name}{suffix}");
    format!("{head:<40}  {count:>6} msgs  last: {when}", count = s.message_count)
}
