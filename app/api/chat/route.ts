import { createTranscriptMessage } from "@/lib/support-assistant";
import { generateSupportReply } from "@/lib/support-runtime";
import type { TranscriptMessage } from "@/lib/support-types";

type ChatRequest = {
  messages: TranscriptMessage[];
};

const isTranscriptMessage = (value: unknown): value is TranscriptMessage => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<TranscriptMessage>;

  return (
    (candidate.role === "assistant" || candidate.role === "user") &&
    typeof candidate.id === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.createdAt === "string"
  );
};

export const parseChatRequest = (body: unknown): ChatRequest | null => {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const candidate = body as Partial<ChatRequest>;

  if (!Array.isArray(candidate.messages) || !candidate.messages.every(isTranscriptMessage)) {
    return null;
  }

  return { messages: candidate.messages };
};

export const handleChatRequest = async (body: unknown) => {
  const parsedBody = parseChatRequest(body);

  if (!parsedBody) {
    return Response.json(
      {
        error: "Expected a messages array with transcript entries.",
      },
      { status: 400 },
    );
  }

  const reply = await generateSupportReply(parsedBody.messages);
  const message = createTranscriptMessage("assistant", reply.message, reply);

  return Response.json({ reply, message });
};

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null);

  return await handleChatRequest(body);
};
