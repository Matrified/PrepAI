import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

interface GradeRequest {
  question: string;
  modelAnswer: string;
  keyPoints: string[];
  userAnswer: string;
  answerType?: string;
  questionType?: string;
  index?: number;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const body = await request.json();
  const requests = (Array.isArray(body.requests) ? body.requests : [body]) as GradeRequest[];

  if (!requests.length) {
    return NextResponse.json({ error: "Missing grading payload" }, { status: 400 });
  }

  const missing = requests.some(
    (item) => !item.question || !item.modelAnswer || !item.keyPoints || item.userAnswer === undefined
  );
  if (missing) {
    return NextResponse.json({ error: "Missing grading payload" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You are an expert technical interviewer grader. Grade each item below and return ONLY valid JSON as an array of objects.

Use this output format:
[
  {
    "index": 0,
    "score": number,
    "feedback": "...",
    "strengths": ["..."],
    "improvements": ["..."]
  }
]

Keep the JSON valid and do not include markdown fences.

${requests
    .map(
      (item, index) =>
        `Question ${index + 1}: "${item.question.replace(/"/g, '\"')}"
Answer type: "${(item.answerType ?? "").replace(/"/g, '\"')}"
Model answer: "${item.modelAnswer.replace(/"/g, '\"')}"
Key points: ${JSON.stringify(item.keyPoints)}
Candidate answer: "${(item.userAnswer ?? "").replace(/"/g, '\"')}"
Index: ${item.index ?? index}`
    )
    .join("\n\n")}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const text = response.text ?? "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    const jsonText = match ? match[0] : cleaned;
    const results = JSON.parse(jsonText);

    if (!Array.isArray(results)) {
      throw new Error("Grading response was not an array.");
    }

    if (Array.isArray(body.requests)) {
      return NextResponse.json({ results });
    }

    const [result] = results;
    return NextResponse.json({
      score: Number(result.score ?? 0),
      feedback: result.feedback ?? "No feedback provided.",
      strengths: Array.isArray(result.strengths) ? result.strengths : [],
      improvements: Array.isArray(result.improvements) ? result.improvements : [],
    });
  } catch (error) {
    console.error("Gemini grading error:", error);
    return NextResponse.json({ error: "Failed to grade answer. Please try again." }, { status: 500 });
  }
}
