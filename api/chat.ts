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

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";
  const fallbackModels = (process.env.OPENROUTER_FALLBACK_MODELS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const siteUrl = process.env.OPENROUTER_SITE_URL || "https://co.waiyan.dev";
  const appName = process.env.OPENROUTER_APP_NAME || "Container Orchestration";
  if (!apiKey) {
    res.status(500).json({ message: "OPENROUTER_API_KEY is not set on the server." });
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

    const modelCandidates = [model, ...fallbackModels.filter((m) => m !== model)];
    const attemptErrors: string[] = [];
    let finalData: any = null;

    for (const candidateModel of modelCandidates) {
      const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": siteUrl,
          "X-Title": appName,
        },
        body: JSON.stringify({
          model: candidateModel,
          messages,
          temperature: 0.4,
        }),
      });

      if (openrouterRes.ok) {
        finalData = await openrouterRes.json();
        break;
      }

      const errorText = await openrouterRes.text();
      let detail = errorText;
      try {
        const parsed = JSON.parse(errorText);
        detail = parsed?.error?.message || parsed?.message || errorText;
      } catch {
        // Keep raw text if it's not JSON
      }
      attemptErrors.push(`${candidateModel} -> (${openrouterRes.status}) ${detail}`);
    }

    if (!finalData) {
      res.status(400).json({
        message: `OpenRouter request failed for all models: ${attemptErrors.join(" | ")}`,
      });
      return;
    }

    const text = finalData?.choices?.[0]?.message?.content?.trim();
    res.status(200).json({ message: text || "I could not generate a response." });
  } catch (error: any) {
    res.status(500).json({
      message: "Server error while generating chatbot response.",
      error: error?.message || "unknown_error",
    });
  }
}
