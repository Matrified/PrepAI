import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const { topic, difficulty } = await request.json();

  if (!topic || !difficulty) {
    return NextResponse.json({ error: "Topic and difficulty are required" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a technical interviewer. Generate exactly 5 interview questions for a ${difficulty}-level software engineer on the topic of ${topic}.

For each question, provide:
- A clear, specific technical question
- A comprehensive model answer
- 3 key points the candidate should mention
- The answer type (e.g. concept, design, strategy, debugging)
- The ideal duration in minutes
- A short prompt hint describing the best answer style

Return ONLY valid JSON in this exact format, no markdown:
[
  {
    "question": "...",
    "modelAnswer": "...",
    "keyPoints": ["...", "...", "..."],
    "answerType": "...",
    "idealDuration": 2,
    "promptHints": "..."
  }
]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const text = response.text ?? "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const match = cleaned.match(/\[([\s\S]*)\]/);
    const jsonText = match ? match[0] : cleaned;
    const questions = JSON.parse(jsonText);

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: "Failed to generate questions. Please try again." }, { status: 500 });
  }
}
