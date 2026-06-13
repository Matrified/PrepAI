"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Question {
  question: string;
  modelAnswer: string;
  keyPoints: string[];
  answerType: string;
  idealDuration: number;
  promptHints: string;
}

interface GradeResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

const TOTAL_TIME_SECONDS = 10 * 60;

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function QuizContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const topic = searchParams.get("topic") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [grades, setGrades] = useState<(GradeResult | null)[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [timer, setTimer] = useState(TOTAL_TIME_SECONDS);
  const [finishedByTimer, setFinishedByTimer] = useState(false);
  const [gradeError, setGradeError] = useState("");

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, difficulty }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load questions");
        setQuestions(data.questions);
        setUserAnswers(new Array(data.questions.length).fill(""));
        setGrades(new Array(data.questions.length).fill(null));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load questions";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, [topic, difficulty]);

  useEffect(() => {
    if (loading || finishedByTimer) return;
    const interval = setInterval(() => {
      setTimer((current) => {
        if (current <= 1) {
          clearInterval(interval);
          setFinishedByTimer(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, finishedByTimer]);

  const current = questions[currentIndex];
  const progress = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleAnswerChange = (value: string) => {
    const updated = [...userAnswers];
    updated[currentIndex] = value;
    setUserAnswers(updated);
  };

  const handleGradeAnswer = async () => {
    if (!current) return;
    setGradeError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: current.question,
          modelAnswer: current.modelAnswer,
          keyPoints: current.keyPoints,
          userAnswer: userAnswers[currentIndex] ?? "",
          answerType: current.answerType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to grade answer.");

      const updatedGrades = [...grades];
      updatedGrades[currentIndex] = {
        score: data.score,
        feedback: data.feedback,
        strengths: data.strengths ?? [],
        improvements: data.improvements ?? [],
      };
      setGrades(updatedGrades);
      setRevealed(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to grade answer.";
      setGradeError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const finishSession = () => {
    const session = {
      topic,
      difficulty,
      date: new Date().toISOString(),
      questions,
      userAnswers,
      grades,
      totalSeconds: TOTAL_TIME_SECONDS - timer,
      finishedByTimer,
    };
    localStorage.setItem("prepai-current-session", JSON.stringify(session));
    router.push("/results");
  };

  const handleNext = () => {
    setRevealed(false);
    setGradeError("");
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishSession();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-3xl px-4 py-28 text-center">
          <div className="inline-flex animate-pulse flex-col rounded-3xl border border-white/10 bg-white/5 px-8 py-12 text-left shadow-xl shadow-sky-500/10">
            <p className="text-3xl font-semibold">Building your tailored interview session…</p>
            <p className="mt-4 text-slate-300">One moment while the AI generates strong questions for {difficulty} {topic} practice.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !current) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-3xl px-4 py-28 text-center">
          <p className="text-xl font-semibold text-red-400">{error || "Unable to load the quiz."}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const currentGrade = grades[currentIndex];
  const remainingMinutes = Math.ceil(timer / 60);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Live simulation</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Interview Practice Session</h1>
            <p className="mt-2 text-slate-300">Answer each question with confidence and get AI-graded feedback instantly.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-slate-950/70 p-4 text-center ring-1 ring-white/10">
              <p className="text-sm text-slate-400">Question</p>
              <p className="mt-2 text-xl font-semibold text-white">{currentIndex + 1}/{questions.length}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/70 p-4 text-center ring-1 ring-white/10">
              <p className="text-sm text-slate-400">Remaining</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatTime(timer)}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/70 p-4 text-center ring-1 ring-white/10">
              <p className="text-sm text-slate-400">Mode</p>
              <p className="mt-2 text-xl font-semibold text-cyan-300">{topic} / {difficulty}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-3xl bg-slate-900/80 p-5 ring-1 ring-white/10">
          <div className="flex items-center justify-between gap-4 text-sm text-slate-400">
            <span>Timer pressure: {remainingMinutes} min left</span>
            <span className="font-medium">Ideal pace: {current.idealDuration} min</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-xl shadow-slate-950/40">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-cyan-200">{current.answerType}</span>
                <span className="px-2">•</span>
                <span>For best results, answer with {current.promptHints.toLowerCase()}</span>
              </div>
              <h2 className="text-2xl font-semibold text-white">{current.question}</h2>
            </div>

            <textarea
              value={userAnswers[currentIndex]}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Compose your response here..."
              rows={10}
              disabled={finishedByTimer}
              className="w-full rounded-3xl border border-white/10 bg-slate-950/90 p-5 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            />

            {finishedByTimer && (
              <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                Time is up for this session. Save your progress and review performance on the results screen.
              </div>
            )}

            {gradeError && (
              <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                {gradeError}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={handleGradeAnswer}
                disabled={submitting || finishedByTimer}
                className="rounded-3xl bg-cyan-500 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
              >
                {submitting ? "Grading answer…" : "Grade my answer"}
              </button>
              <div className="space-y-1 text-right text-sm text-slate-400 sm:text-left">
                <p className="font-medium text-slate-200">Answer hints</p>
                <p>Answer fully, then grade it to see AI guidance before moving on.</p>
              </div>
            </div>

            {finishedByTimer && !revealed && (
              <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/90 p-4 text-sm text-slate-300">
                <p className="font-semibold text-white">Session ended due to the timer.</p>
                <p className="mt-2">Your current progress is saved for review. Finish to see the summary.</p>
                <button
                  onClick={finishSession}
                  className="mt-4 inline-flex rounded-3xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Finish session
                </button>
              </div>
            )}
          </section>

          <aside className="space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl shadow-slate-950/10">
            <div className="rounded-3xl bg-slate-950/80 p-5 ring-1 ring-white/10">
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Session Brief</p>
              <p className="mt-4 text-sm text-slate-300">
                {questions.length} questions, AI scoring and review built for fast, realistic practice.
              </p>
            </div>

            <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Current question</span>
                <span>{currentIndex + 1}/{questions.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Model answer length</span>
                <span>{Math.max(3, current.modelAnswer.split(" ").length)} words</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Key points to target</span>
                <span>{current.keyPoints.length}</span>
              </div>
            </div>

            {revealed && currentGrade && (
              <div className="space-y-4 rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">AI Score</p>
                  <span className="rounded-full bg-slate-950/90 px-3 py-1 text-sm font-semibold text-white">{currentGrade.score}/100</span>
                </div>
                <p className="text-sm text-slate-200">{currentGrade.feedback}</p>
                <button
                  onClick={handleNext}
                  className="w-full rounded-3xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  {currentIndex < questions.length - 1 ? "Next Question" : "Finish Session"}
                </button>
              </div>
            )}

            {!revealed && (
              <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Tip</p>
                <p className="text-sm text-slate-300">
                  If you want the strongest results, answer fully then grade it before moving on. The AI compares relevance, coverage, and structure.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
      <QuizContent />
    </Suspense>
  );
}
