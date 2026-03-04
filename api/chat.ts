type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  message?: string;
  conversationHistory?: ChatMessage[];
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey) {
    res.status(500).json({ message: "OPENAI_API_KEY is not set on the server." });
    return;
  }

  try {
    const body: ChatRequestBody =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};

    const userMessage = (body.message ?? "").trim();
    const conversationHistory = Array.isArray(body.conversationHistory)
      ? body.conversationHistory
      : [];

    if (!userMessage) {
      res.status(400).json({ message: "Missing message" });
      return;
    }

    const messages = [
      {
        role: "system",
        content:
          "You are vitaltech bot, a clear Kubernetes learning assistant. Keep answers concise, practical, and beginner-friendly.",
      },
      ...conversationHistory
        .filter(
          (m) =>
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string" &&
            m.content.trim().length > 0,
        )
        .map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
      }),
    });

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      let detail = errorText;
      try {
        const parsed = JSON.parse(errorText);
        detail =
          parsed?.error?.message ||
          parsed?.message ||
          errorText;
      } catch {
        // Keep raw text if it's not JSON
      }

      res.status(openaiRes.status).json({
        message: `OpenAI request failed (${openaiRes.status}): ${detail}`,
      });
      return;
    }

    const data = await openaiRes.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    res.status(200).json({ message: text || "I could not generate a response." });
  } catch (error: any) {
    res.status(500).json({
      message: "Server error while generating chatbot response.",
      error: error?.message || "unknown_error",
    });
  }
}
