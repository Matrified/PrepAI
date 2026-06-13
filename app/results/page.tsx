"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface GradeResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface Question {
  question: string;
  modelAnswer: string;
  keyPoints: string[];
  answerType: string;
  idealDuration: number;
  promptHints: string;
}

interface Session {
  topic: string;
  difficulty: string;
  date: string;
  questions: Question[];
  userAnswers: string[];
  grades: (GradeResult | null)[];
  totalSeconds: number;
  finishedByTimer: boolean;
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export default function ResultsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [history, setHistory] = useState<Session[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("prepai-current-session");
    if (raw) {
      const parsed: Session = JSON.parse(raw);
      setSession(parsed);

      const historyRaw = localStorage.getItem("prepai-history");
      const existingHistory: Session[] = historyRaw ? JSON.parse(historyRaw) : [];
      const updatedHistory = [parsed, ...existingHistory].slice(0, 20);
      localStorage.setItem("prepai-history", JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
      localStorage.removeItem("prepai-current-session");
    } else {
      const historyRaw = localStorage.getItem("prepai-history");
      if (historyRaw) setHistory(JSON.parse(historyRaw));
    }
  }, []);

  const averageScore = useMemo(() => {
    if (!session) return 0;
    const validScores = session.grades.filter((grade) => grade !== null) as GradeResult[];
    return validScores.length
      ? Math.round(validScores.reduce((sum, grade) => sum + grade.score, 0) / validScores.length)
      : 0;
  }, [session]);

  const summaryTone = averageScore >= 85 ? "Excellent" : averageScore >= 70 ? "Strong" : "Needs improvement";

  const clearHistory = () => {
    localStorage.removeItem("prepai-history");
    setHistory([]);
  };

  if (!session && history.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-3xl px-4 py-28 text-center">
          <p className="text-xl text-slate-300">No session data found.</p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Start practicing
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {session && (
          <section className="mb-10 rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Session performance</p>
                <h1 className="mt-3 text-4xl font-semibold text-white">Review your AI-scored interview practice</h1>
                <p className="mt-3 max-w-2xl text-slate-300">
                  {summaryTone} session. Answer quality, strengths, and improvement opportunities are surfaced for every question.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-950/80 p-6 ring-1 ring-white/10">
                  <p className="text-sm text-slate-400">Average Score</p>
                  <p className="mt-3 text-5xl font-semibold text-white">{averageScore}</p>
                  <p className="mt-2 text-sm text-slate-400">out of 100</p>
                </div>
                <div className="rounded-3xl bg-slate-950/80 p-6 ring-1 ring-white/10">
                  <p className="text-sm text-slate-400">Time used</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{formatDuration(session.totalSeconds)}</p>
                  <p className="mt-2 text-sm text-slate-400">{session.finishedByTimer ? "Timed session" : "Completed early"}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {session && (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-6">
              {session.questions.map((question, index) => {
                const grade = session.grades[index];
                return (
                  <div key={index} className="rounded-[2rem] border border-white/10 bg-slate-950/90 p-6 shadow-xl shadow-slate-950/20">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm uppercase tracking-[0.25em] text-cyan-300">Question {index + 1}</span>
                      {grade ? (
                        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm font-semibold text-cyan-200">
                          {grade.score}/100
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-400">Ungraded</span>
                      )}
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-white">{question.question}</h2>
                    <div className="mt-4 rounded-3xl bg-slate-900/90 p-4 ring-1 ring-white/10">
                      <p className="text-sm text-slate-400">Your answer</p>
                      <p className="mt-2 text-slate-200 whitespace-pre-wrap">{session.userAnswers[index] || "No answer submitted."}</p>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-3xl bg-slate-900/90 p-4 ring-1 ring-white/10">
                        <p className="text-sm text-slate-400">Model answer</p>
                        <p className="mt-2 text-slate-200 whitespace-pre-wrap">{question.modelAnswer}</p>
                      </div>
                      <div className="rounded-3xl bg-slate-900/90 p-4 ring-1 ring-white/10">
                        <p className="text-sm text-slate-400">Key points</p>
                        <ul className="mt-3 space-y-2 text-slate-200">
                          {question.keyPoints.map((point, key) => (
                            <li key={key} className="flex items-start gap-2">
                              <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {grade && (
                      <div className="mt-5 space-y-4 rounded-3xl bg-slate-900/90 p-5 ring-1 ring-cyan-500/20">
                        <div>
                          <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">AI feedback</p>
                          <p className="mt-3 text-slate-200">{grade.feedback}</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-3xl bg-slate-950/70 p-4">
                            <p className="text-sm font-semibold text-slate-200">Strengths</p>
                            <ul className="mt-3 space-y-2 text-slate-400">
                              {grade.strengths.map((item, idx) => (
                                <li key={idx}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-3xl bg-slate-950/70 p-4">
                            <p className="text-sm font-semibold text-slate-200">Improvements</p>
                            <ul className="mt-3 space-y-2 text-slate-400">
                              {grade.improvements.map((item, idx) => (
                                <li key={idx}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            <aside className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
              <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Top takeaways</p>
                <ul className="mt-4 space-y-3 text-slate-300">
                  <li>• {summaryTone} overall performance across the session.</li>
                  <li>• AI feedback is based on clarity, coverage, relevance, and structure.</li>
                  <li>• Use this review to identify which topics to revisit next.</li>
                </ul>
              </div>
              <div className="rounded-3xl bg-cyan-500/10 p-5 ring-1 ring-cyan-500/20">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Session Stats</p>
                <div className="mt-5 space-y-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Questions</span>
                    <span>{session.questions.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Graded items</span>
                    <span>{session.grades.filter(Boolean).length}/{session.questions.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Time spent</span>
                    <span>{formatDuration(session.totalSeconds)}</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {history.length > 0 && (
          <section className="mt-10 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-white">Practice History</h2>
              <button onClick={clearHistory} className="text-sm text-rose-400 transition hover:underline">
                Clear history
              </button>
            </div>
            <div className="mt-5 grid gap-3">
              {history.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                  <div>
                    <p className="font-semibold text-white">{entry.topic}</p>
                    <p className="text-sm text-slate-400">{entry.difficulty}</p>
                  </div>
                  <div className="text-right text-sm text-slate-400">
                    <p>{new Date(entry.date).toLocaleDateString()}</p>
                    <p>{entry.grades.filter(Boolean).length}/{entry.questions.length} graded</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10">
          <button
            onClick={() => router.push("/")}
            className="w-full rounded-full bg-cyan-500 px-6 py-4 text-base font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Practice again
          </button>
        </div>
      </div>
    </main>
  );
}
