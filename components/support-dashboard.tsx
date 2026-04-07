"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";

import { ChatTranscript } from "@/components/chat-transcript";
import { quickPrompts, statusCards, supportPlaybooks, trustHighlights } from "@/lib/support-content";
import {
  createStarterConversation,
  createTranscriptMessage,
  getLatestInsight,
} from "@/lib/support-assistant";
import type { SupportMode, SupportReply, TranscriptMessage } from "@/lib/support-types";

type ChatResponse = {
  reply: SupportReply;
  message: TranscriptMessage;
};

const iconByIntent = {
  account_access: "Identity",
  billing: "Finance",
  damaged_item: "Quality",
  order_tracking: "Logistics",
  refund: "Returns",
  subscription: "Retention",
  unknown: "Triage",
} as const;

const formatModeLabel = (mode: SupportMode) =>
  mode === "openrouter" ? "OpenRouter free" : "Demo fallback";

type SupportDashboardProps = {
  initialMode: SupportMode;
};

export function SupportDashboard({ initialMode }: SupportDashboardProps) {
  const [messages, setMessages] = useState<TranscriptMessage[]>(createStarterConversation);
  const [draft, setDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [isPending, startTransition] = useTransition();

  const latestInsight = useMemo(() => getLatestInsight(messages), [messages]);
  const busy = isReplying || isPending;
  const activeMode = latestInsight?.mode ?? initialMode;

  const sendConversation = async (conversation: TranscriptMessage[]) => {
    setIsReplying(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: conversation }),
      });

      if (!response.ok) {
        throw new Error("Assistant request failed");
      }

      const payload = (await response.json()) as ChatResponse;

      startTransition(() => {
        setMessages([...conversation, payload.message]);
        setErrorMessage(null);
      });
    } catch {
      startTransition(() => {
        setErrorMessage("The assistant could not complete that handoff. Resend the message to retry.");
        setMessages([
          ...conversation,
          createTranscriptMessage(
            "assistant",
            "I hit a temporary handoff issue before the policy-backed reply completed. Please resend the last message and I’ll try again.",
          ),
        ]);
      });
    } finally {
      setIsReplying(false);
    }
  };

  const submitMessage = (content: string) => {
    const trimmed = content.trim();

    if (!trimmed || busy) {
      return;
    }

    const nextConversation = [...messages, createTranscriptMessage("user", trimmed)];

    startTransition(() => {
      setMessages(nextConversation);
      setDraft("");
      setErrorMessage(null);
    });

    void sendConversation(nextConversation);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitMessage(draft);
  };

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero__copy">
          <span className="hero__eyebrow">LLM Customer Support Assistant</span>
          <h1>Ship a calm, policy-grounded support copilot that feels ready for production.</h1>
          <p>
            This demo combines deterministic support playbooks, escalation signals, and a polished
            Next.js interface so we can deploy a convincing assistant immediately and still keep the
            logic fully testable.
          </p>

          <div className="hero__chips">
            <span>Functional core</span>
            <span>App Router</span>
            <span>Vitest coverage gates</span>
          </div>
        </div>

        <div className="hero__cards">
          {statusCards.map((card) => (
            <article className="status-card" key={card.label}>
              <span className="status-card__label">{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace">
        <div className="panel panel--chat">
          <div className="panel__header">
            <div>
              <span className="panel__eyebrow">Live Demo</span>
              <h2>Support desk copilot</h2>
            </div>

            <div className="panel__badges">
              <span className={`mode-badge mode-badge--${busy ? "busy" : "ready"}`}>
                {busy ? "Drafting reply" : "Ready for triage"}
              </span>
              <span className={`runtime-badge runtime-badge--${activeMode}`}>
                Mode: {formatModeLabel(activeMode)}
              </span>
            </div>
          </div>

          <div className="quick-prompts" aria-label="Demo prompts">
            {quickPrompts.map((prompt) => (
              <button
                className="quick-prompts__button"
                key={prompt}
                onClick={() => submitMessage(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>

          <ChatTranscript isReplying={isReplying} messages={messages} />

          <form className="composer" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="customer-message">
              Customer issue
            </label>
            <textarea
              className="composer__input"
              id="customer-message"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Paste the customer issue or write the response scenario you want to demo."
              rows={4}
              value={draft}
            />

            <div className="composer__footer">
              <p>{errorMessage ?? "The assistant will return a draft, actions, escalation lane, and policy signal."}</p>
              <button className="composer__submit" disabled={busy} type="submit">
                {busy ? "Working..." : "Generate reply"}
              </button>
            </div>
          </form>
        </div>

        <aside className="panel panel--insights">
          <div className="panel__header">
            <div>
              <span className="panel__eyebrow">Operational View</span>
              <h2>Why this feels production-ready</h2>
            </div>
          </div>

          {latestInsight ? (
            <section className="insight-card">
              <div className="insight-card__header">
                <span>{iconByIntent[latestInsight.intent]}</span>
                <strong>{latestInsight.intent.replaceAll("_", " ")}</strong>
              </div>

              <dl className="insight-card__grid">
                <div>
                  <dt>Confidence</dt>
                  <dd>{Math.round(latestInsight.confidence * 100)}%</dd>
                </div>
                <div>
                  <dt>Escalation</dt>
                  <dd>{latestInsight.escalationTarget}</dd>
                </div>
                <div>
                  <dt>Sentiment</dt>
                  <dd>{latestInsight.sentiment}</dd>
                </div>
                <div>
                  <dt>Follow-up</dt>
                  <dd>{latestInsight.followUp}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          <section className="playbook-list">
            <h3>Support playbooks</h3>

            {supportPlaybooks.map((playbook) => (
              <article className="playbook" key={playbook.intent}>
                <div className="playbook__header">
                  <strong>{playbook.label}</strong>
                  <span>{playbook.intent.replaceAll("_", " ")}</span>
                </div>
                <p>{playbook.referenceDetail}</p>
              </article>
            ))}
          </section>

          <section className="trust-list">
            <h3>Build quality</h3>
            <ul>
              {trustHighlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
}
