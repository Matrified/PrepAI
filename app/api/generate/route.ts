import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const { topic, difficulty, types } = await request.json();

  if (!topic || !difficulty) {
    return NextResponse.json({ error: "Topic and difficulty are required" }, { status: 400 });
  }

  const requestedTypes = Array.isArray(types) && types.length > 0
    ? types
    : ["mcq", "short-answer", "design", "debugging", "open-ended"];

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a technical interviewer. Generate exactly 5 interview questions for a ${difficulty}-level software engineer on the topic of ${topic}.

Use the following requested question types: ${requestedTypes.join(", ")}.

For each question, return ONLY valid JSON in this exact format, no markdown:
[
  {
    "question": "...",
    "modelAnswer": "...",
    "keyPoints": ["...", "...", "..."],
    "answerType": "...",
    "questionType": "...",
    "idealDuration": 2,
    "promptHints": "...",
    "explanation": "...",
    "choices": ["...", "...", "..."],
    "correctAnswer": "..."
  }
]

- The field questionType must be one of: ${requestedTypes.map((type) => `\"${type}\"`).join(", ")}.
- If questionType is mcq, include the choices array and correctAnswer.
- If questionType is not mcq, omit choices and correctAnswer.
- explanation should be a short answer explanation that helps the candidate understand the right approach.
- Keep the JSON strictly valid and do not wrap it in markdown code fences.`;

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
