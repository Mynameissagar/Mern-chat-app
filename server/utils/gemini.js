const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ✅ Updated model name — llama-3.3-70b-versatile
const GROQ_MODEL = "llama-3.3-70b-versatile";

const summarizeThread = async (messages) => {
  try {
    const chatText = messages
      .map((m) => `${m.sender?.name || "User"}: ${m.content}`)
      .join("\n");

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You summarize chat conversations clearly and concisely.",
        },
        {
          role: "user",
          content: `Summarize this chat in 2-3 sentences. Mention key points and decisions:\n\n${chatText}`,
        },
      ],
      model: GROQ_MODEL,
      max_tokens: 300,
    });

    return completion.choices[0]?.message?.content
      || "Could not generate summary.";

  } catch (error) {
    console.error("Groq error:", error.message);
    throw new Error("AI summarization failed: " + error.message);
  }
};

const generateReplySuggestions = async (messages) => {
  try {
    const chatText = messages
      .slice(-5)
      .map((m) => `${m.sender?.name || "User"}: ${m.content}`)
      .join("\n");

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Return ONLY a valid JSON array of 3 short reply strings. No explanation, just JSON.",
        },
        {
          role: "user",
          content: `Suggest 3 short replies (under 10 words each) for this chat:\n\n${chatText}`,
        },
      ],
      model: GROQ_MODEL,
      max_tokens: 100,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "[]";
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : ["Sounds good!", "I'll check.", "Thanks!"];
    } catch {
      return ["Sounds good!", "I will check it.", "Thanks!"];
    }

  } catch (error) {
    console.error("Groq suggestions error:", error.message);
    return ["Sounds good!", "I will get back to you.", "Thanks!"];
  }
};

module.exports = { summarizeThread, generateReplySuggestions };