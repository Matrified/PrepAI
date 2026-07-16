# PrepAI

<img width="2551" height="1283" alt="Screenshot 2026-07-16 233821" src="https://github.com/user-attachments/assets/9302ad22-8aaa-47b1-82d5-3e48bddb58be" />


PrepAI is an AI-powered mock interview platform for software engineers. Pick a topic, difficulty, and question format, then run a timed practice session with instant grading and feedback powered by Google's Gemini API.

## Features

- **Custom sessions** — choose a topic (Frontend, Backend, System Design, DSA, Full-Stack), difficulty (Junior, Mid, Senior), and a mix of question types (MCQ, short answer, system design, debugging, open-ended).
- **AI-generated questions** — each session generates 5 tailored interview questions on demand via the Gemini API.
- **Instant + deferred grading** — multiple-choice questions are scored immediately; open-ended answers are graded by AI once the session finishes, each with a score, feedback, strengths, and areas to improve.
- **Timed practice** — a 10-minute countdown simulates interview pressure.
- **Results dashboard** — review your average score, time spent, per-question feedback, and model answers.
- **Practice history** — past sessions are stored locally so you can track progress over time.

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Google Gemini API](https://ai.google.dev/) (`@google/genai`) for question generation and grading

## Getting Started

### Prerequisites

- Node.js 18.18+ (Node 20+ recommended)
- A [Gemini API key](https://ai.google.dev/gemini-api/docs/api-key)

### Installation

```bash
git clone https://github.com/<your-username>/prepai.git
cd prepai
npm install
```

### Environment Variables

Copy the example env file and add your Gemini API key:

```bash
cp .env.example .env.local
```

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
npm run build
npm run start
```

## Project Structure

```
app/
├── api/
│   ├── generate/route.ts   # Generates interview questions via Gemini
│   └── grade/route.ts      # Grades open-ended answers via Gemini
├── quiz/page.tsx           # Live interview session (timer, questions, answering)
├── results/page.tsx        # Score summary, feedback, and practice history
├── page.tsx                # Home page — topic/difficulty/question type selection
└── layout.tsx               # Root layout and metadata
```

## How It Works

1. On the home page, select a topic, difficulty, and one or more question types, then start a session.
2. `/api/generate` calls the Gemini API to produce 5 questions matching your selections, each with a model answer, key points, and (for MCQs) choices with a correct answer.
3. During the session, MCQs are graded instantly client-side against the correct answer. Open-ended answers are saved and sent to `/api/grade` in a single batch request once you finish.
4. Results are stored in `localStorage` (both the current session and a rolling history of up to 20 past sessions) and displayed on the results page.

## Notes

- Session and history data are stored only in the browser's `localStorage` — there is no backend database.
- The Gemini API key is required server-side only (`.env.local`) and is never exposed to the client.

## License

This project is licensed under the MIT License.
