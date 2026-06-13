import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const { question, modelAnswer, keyPoints, userAnswer, answerType } = await request.json();

  if (!question || !modelAnswer || !keyPoints || userAnswer === undefined) {
    return NextResponse.json({ error: "Missing grading payload" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You are an expert technical interviewer grader. Compare the candidate's answer to the model answer, the key points, and the answer type.

Return only valid JSON with the following fields:
{
  "score": number,
  "feedback": string,
  "strengths": string[],
  "improvements": string[]
}

Question: "${question.replace(/"/g, '\\"')}"
Answer type: "${answerType.replace(/"/g, '\\"')}"
Model answer: "${modelAnswer.replace(/"/g, '\\"')}"
Key points: ${JSON.stringify(keyPoints)}
Candidate answer: "${userAnswer.replace(/"/g, '\\"')}"

Evaluate clarity, relevance, completeness, and structure. Base the score on how well the response matches the model answer and addresses the key points. Keep feedback concise and actionable.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const text = response.text ?? "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : cleaned;
    const result = JSON.parse(jsonText);

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
