"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Question {
  question: string;
  modelAnswer: string;
  keyPoints: string[];
  answerType: string;
  questionType: string;
  idealDuration: number;
  promptHints: string;
  explanation?: string;
  choices?: string[];
  correctAnswer?: string;
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
  const typesParam = searchParams.get("types") ?? "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [grades, setGrades] = useState<(GradeResult | null)[]>([]);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [timer, setTimer] = useState(TOTAL_TIME_SECONDS);
  const [finishedByTimer, setFinishedByTimer] = useState(false);
  const [gradeError, setGradeError] = useState("");

  useEffect(() => {
    async function fetchQuestions() {
      try {
        setLoading(true);
        const types = typesParam
          .split(",")
          .map((type) => type.trim())
          .filter(Boolean);

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, difficulty, types }),
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
  }, [topic, difficulty, typesParam]);

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
  const isChoiceQuestion = Boolean(current?.choices?.length) || /mcq/i.test(current?.questionType || current?.answerType);

  const handleAnswerChange = (value: string) => {
    const updated = [...userAnswers];
    updated[currentIndex] = value;
    setUserAnswers(updated);
  };

  const collectOpenAnswerGrades = async (currentGrades: (GradeResult | null)[]) => {
    const requests = questions
      .map((question, index) => ({
        question: question.question,
        modelAnswer: question.modelAnswer,
        keyPoints: question.keyPoints,
        userAnswer: userAnswers[index] ?? "",
        answerType: question.answerType,
        questionType: question.questionType,
        index,
      }))
      .filter((item) => !item.questionType || !/mcq/i.test(item.questionType));

    if (!requests.length) {
      return currentGrades;
    }

    const res = await fetch("/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to grade session answers.");
    }

    const resultGrades = [...currentGrades];
    data.results.forEach((result: any) => {
      resultGrades[result.index] = {
        score: Number(result.score ?? 0),
        feedback: result.feedback ?? "No feedback provided.",
        strengths: Array.isArray(result.strengths) ? result.strengths : [],
        improvements: Array.isArray(result.improvements) ? result.improvements : [],
      };
    });

    return resultGrades;
  };

  const handleSubmitAnswer = async () => {
    if (!current) return;
    setGradeError("");
    setSubmitting(true);

    try {
      if (isChoiceQuestion) {
        const selected = userAnswers[currentIndex] ?? "";
        const correct = current.correctAnswer?.trim() === selected.trim();
        const grade: GradeResult = {
          score: correct ? 100 : 0,
          feedback: correct ? "Correct choice — great job." : `The correct answer is "${current.correctAnswer}".`,
          strengths: correct ? ["You selected the right option."] : ["You selected an answer; review the explanation below."],
          improvements: correct ? ["Keep applying this understanding to similar prompts."] : ["Review the key points and try again later."],
        };
        const updated = [...grades];
        updated[currentIndex] = grade;
        setGrades(updated);
        setFeedbackMessage(current.explanation ?? (correct ? "Great job." : "Review the explanation below."));
      } else {
        setFeedbackMessage(current.explanation ?? "Your response is saved. It will be graded after the session.");
      }
      setFeedbackVisible(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setGradeError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const finishSession = async () => {
    setSubmitting(true);
    setGradeError("");
    try {
      const finalGrades = await collectOpenAnswerGrades(grades);
      const session = {
        topic,
        difficulty,
        date: new Date().toISOString(),
        questions,
        userAnswers,
        grades: finalGrades,
        totalSeconds: TOTAL_TIME_SECONDS - timer,
        finishedByTimer,
      };
      localStorage.setItem("prepai-current-session", JSON.stringify(session));
      router.push("/results");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to complete session.";
      setGradeError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    setFeedbackVisible(false);
    setFeedbackMessage("");
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await finishSession();
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

  const remainingMinutes = Math.ceil(timer / 60);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Live simulation</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Interview Practice Session</h1>
            <p className="mt-2 text-slate-300">Answer each question and get crisp feedback designed for performance improvement.</p>
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
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-cyan-200">{current.questionType || current.answerType}</span>
                <span className="px-2">•</span>
                <span>Answer using {current.promptHints.toLowerCase()}</span>
              </div>
              <h2 className="text-2xl font-semibold text-white">{current.question}</h2>
            </div>

            {current.choices && current.choices.length > 0 ? (
              <div className="grid gap-3">
                {current.choices.map((choice) => (
                  <button
                    key={choice}
                    onClick={() => handleAnswerChange(choice)}
                    className={`rounded-3xl border p-5 text-left transition ${
                      userAnswers[currentIndex] === choice
                        ? "border-cyan-400 bg-cyan-500/10 text-white"
                        : "border-white/10 bg-slate-950/90 text-slate-200 hover:border-slate-200"
                    }`}
                  >
                    <span className="block text-base font-semibold">{choice}</span>
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                value={userAnswers[currentIndex]}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Compose your response here..."
                rows={10}
                disabled={finishedByTimer}
                className="w-full rounded-3xl border border-white/10 bg-slate-950/90 p-5 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />
            )}

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

            {feedbackVisible && (
              <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-slate-100">
                <p className="font-semibold text-white">
                  {isChoiceQuestion
                    ? current.correctAnswer?.trim() === userAnswers[currentIndex]?.trim()
                      ? "Correct!"
                      : "Try the next one."
                    : "Answer saved."}
                </p>
                <p className="mt-3 text-slate-300">{feedbackMessage}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={handleSubmitAnswer}
                disabled={submitting || !userAnswers[currentIndex] || feedbackVisible}
                className="w-full rounded-3xl bg-cyan-500 px-6 py-4 text-lg font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {isChoiceQuestion ? "Submit answer" : "Save answer"}
              </button>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className="rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-sm text-slate-300 transition hover:border-slate-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  disabled={!feedbackVisible}
                  className="rounded-3xl bg-white/5 px-5 py-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {currentIndex < questions.length - 1 ? "Next question" : "Finish session"}
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/40">
            <div className="rounded-3xl bg-slate-900/90 p-5 ring-1 ring-white/10">
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Question insights</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <div className="rounded-3xl bg-slate-950/80 p-4">
                  <p className="text-slate-400">Type</p>
                  <p className="mt-2 text-white">{current.questionType || current.answerType}</p>
                </div>
                <div className="rounded-3xl bg-slate-950/80 p-4">
                  <p className="text-slate-400">Current answer</p>
                  <p className="mt-2 text-white truncate">{userAnswers[currentIndex] || "No answer yet"}</p>
                </div>
                <div className="rounded-3xl bg-slate-950/80 p-4">
                  <p className="text-slate-400">Progress</p>
                  <p className="mt-2 text-white">{currentIndex + 1}/{questions.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-500/10 bg-slate-900/90 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Session summary</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p>MCQs are scored instantly inside the session.</p>
                <p>Open-ended responses are graded once after you finish.</p>
                <p>Every answer reveals a concise explanation before you move on.</p>
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-cyan-500/10 via-slate-950/80 to-slate-900/80 p-5 text-sm text-slate-200 ring-1 ring-cyan-500/20">
              <p className="font-semibold text-white">Tips</p>
              <ul className="mt-3 space-y-2 text-slate-300">
                <li>• Answer MCQs directly and trust the instant feedback.</li>
                <li>• For text answers, be structured: context, decision, result.</li>
                <li>• Review each explanation before continuing.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-100"><div className="mx-auto max-w-3xl px-4 py-28 text-center"><p className="text-lg text-slate-300">Loading session...</p></div></div>}>
      <QuizContent />
    </Suspense>
  );
}
