"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const topics = [
  { id: "frontend", title: "Frontend", description: "React, CSS, DOM, performance" },
  { id: "backend", title: "Backend", description: "APIs, databases, auth, scaling" },
  { id: "system-design", title: "System Design", description: "Architecture, trade-offs, scalability" },
  { id: "dsa", title: "DSA", description: "Algorithms, data structures, problem-solving" },
  { id: "fullstack", title: "Full-Stack", description: "End-to-end systems, integration, delivery" },
];

const difficulties = ["Junior", "Mid", "Senior"];

const questionTypes = [
  { id: "mcq", title: "MCQ", description: "Instant correctness and short explanations." },
  { id: "short-answer", title: "Short Answer", description: "Concise, written response questions." },
  { id: "design", title: "System Design", description: "Architecture and trade-off scenarios." },
  { id: "debugging", title: "Debugging", description: "Problem-solving and bug-fix questions." },
  { id: "open-ended", title: "Open Ended", description: "Thoughtful conceptual responses." },
];

export default function Home() {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("Junior");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["mcq", "short-answer", "design"]);
  const router = useRouter();

  const toggleType = (typeId: string) => {
    setSelectedTypes((current) =>
      current.includes(typeId) ? current.filter((item) => item !== typeId) : [...current, typeId]
    );
  };

  const handleStart = () => {
    if (!selectedTopic) return;
    const typeQuery = selectedTypes.length ? `&types=${selectedTypes.join(",")}` : "";
    router.push(`/quiz?topic=${selectedTopic}&difficulty=${selectedDifficulty}${typeQuery}`);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.24),_transparent_38%)] pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_0.9fr] items-start">
          <section className="space-y-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-3 rounded-full bg-cyan-500/15 px-5 py-2 text-sm font-semibold text-cyan-200 ring-1 ring-cyan-500/20">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                AI Interview Simulator • Mixed question formats • Fast feedback
              </div>
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                Practice smarter with a polished, creative interview experience.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Choose your topic, pick the formats you want, and launch a session built for speed, clarity, and instant insight.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_120px_-40px_rgba(14,165,233,0.35)]">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Focus</p>
                <p className="mt-3 text-xl font-semibold text-white">Flexible question mix</p>
                <p className="mt-2 text-sm text-slate-300">Run MCQ, short answer, design, debugging, and open-ended prompts together.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Style</p>
                <p className="mt-3 text-xl font-semibold text-white">Modern UI</p>
                <p className="mt-2 text-sm text-slate-300">Eye-catching gradients, polished cards, and responsive layout.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Outcome</p>
                <p className="mt-3 text-xl font-semibold text-white">Smarter pacing</p>
                <p className="mt-2 text-sm text-slate-300">Answer flow minimizes waiting and grades open responses at the end.</p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-white">Create your session</h2>
                <p className="mt-2 text-slate-300">Mix question styles and get the exact practice you want.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Topic</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {topics.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => setSelectedTopic(topic.id)}
                        className={`rounded-3xl border px-4 py-3 text-left transition ${
                          selectedTopic === topic.id
                            ? "border-cyan-400 bg-cyan-500/10 text-white"
                            : "border-white/10 bg-slate-950/80 text-slate-300 hover:border-slate-200"
                        }`}
                      >
                        <p className="font-semibold">{topic.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{topic.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Difficulty</h3>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {difficulties.map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setSelectedDifficulty(diff)}
                        className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                          selectedDifficulty === diff
                            ? "bg-cyan-500 text-slate-950"
                            : "bg-slate-950/80 text-slate-300 ring-1 ring-white/10 hover:bg-slate-900"
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Question types</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {questionTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => toggleType(type.id)}
                        className={`rounded-3xl border px-4 py-4 text-left transition ${
                          selectedTypes.includes(type.id)
                            ? "border-cyan-400 bg-cyan-500/10 text-white"
                            : "border-white/10 bg-slate-950/80 text-slate-300 hover:border-slate-200"
                        }`}
                      >
                        <p className="font-semibold">{type.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{type.description}</p>
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-slate-400">Select one or more formats. Open ended questions are graded after the complete session for smoother flow.</p>
                </div>

                <button
                  onClick={handleStart}
                  disabled={!selectedTopic}
                  className="w-full rounded-3xl bg-cyan-500 px-6 py-4 text-lg font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Start Practice
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
