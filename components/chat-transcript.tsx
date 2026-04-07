import type { TranscriptMessage } from "@/lib/support-types";

type ChatTranscriptProps = {
  messages: readonly TranscriptMessage[];
  isReplying: boolean;
};

const timestampFormatter = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
});

export function ChatTranscript({ messages, isReplying }: ChatTranscriptProps) {
  return (
    <div className="transcript" aria-live="polite">
      {messages.map((message) => (
        <article
          className={`message message--${message.role}`}
          data-role={message.role}
          key={message.id}
        >
          <header className="message__header">
            <span>{message.role === "assistant" ? "Support Copilot" : "Agent Draft"}</span>
            <time dateTime={message.createdAt}>
              {timestampFormatter.format(new Date(message.createdAt))}
            </time>
          </header>

          <p className="message__content">{message.content}</p>

          {message.insight ? (
            <div className="message__insight">
              <div className="message__pills">
                <span className="pill">Intent: {message.insight.intent.replaceAll("_", " ")}</span>
                <span className="pill">Sentiment: {message.insight.sentiment}</span>
                <span className="pill">Confidence: {Math.round(message.insight.confidence * 100)}%</span>
              </div>

              <ul className="message__actions">
                {message.insight.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>

              <div className="message__reference">
                <strong>{message.insight.references[0]?.label}</strong>
                <span>{message.insight.references[0]?.detail}</span>
              </div>
            </div>
          ) : null}
        </article>
      ))}

      {isReplying ? (
        <div className="typing-indicator" role="status">
          <span />
          <span />
          <span />
        </div>
      ) : null}
    </div>
  );
}
