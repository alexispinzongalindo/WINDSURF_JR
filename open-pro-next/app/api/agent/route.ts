import { NextResponse } from "next/server";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type AgentRequestBody = {
  model?: string;
  effort?: "low" | "medium" | "high";
  messages?: ChatMessage[];
};

function extractResponseText(payload: any): string {
  const output = Array.isArray(payload?.output) ? payload.output : [];
  const parts: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const chunk of content) {
      if (chunk?.type === "output_text" && typeof chunk?.text === "string") {
        parts.push(chunk.text);
      }
    }
  }
  return parts.join("\n").trim();
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server is missing OPENAI_API_KEY." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as AgentRequestBody;
    const model = String(body.model || process.env.OPENAI_MODEL || "gpt-4.1-mini");
    const effort = body.effort || "medium";
    const incoming = Array.isArray(body.messages) ? body.messages : [];

    const cleanedMessages = incoming
      .map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: String(msg.content || "").trim(),
      }))
      .filter((msg) => msg.content.length > 0)
      .slice(-20);

    if (cleanedMessages.length === 0) {
      return NextResponse.json(
        { error: "No user message was provided." },
        { status: 400 },
      );
    }

    const systemPrompt =
      "You are islaAPP's AI agent. Ask clarifying questions, then provide concrete steps to help the user launch or improve their app quickly.";

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        reasoning: { effort },
        input: [
          { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
          ...cleanedMessages.map((m) => ({
            role: m.role,
            content: [{ type: "input_text", text: m.content }],
          })),
        ],
      }),
    });

    const payload = await upstream.json();
    if (!upstream.ok) {
      const errorMessage =
        payload?.error?.message || "Agent request failed. Check model/API settings.";
      return NextResponse.json({ error: errorMessage }, { status: upstream.status });
    }

    const text = extractResponseText(payload);
    if (!text) {
      return NextResponse.json(
        { error: "The AI response was empty. Try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply: text });
  } catch (_error) {
    return NextResponse.json(
      { error: "Unexpected server error while contacting the AI agent." },
      { status: 500 },
    );
  }
}
