import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Load the Inter font for clean, modern typography
const inter = Inter({ subsets: ["latin"] });

// Set the page title and description for browser tabs and search engines
export const metadata: Metadata = {
  title: "PrepAI - AI Interview Prep",
  description: "AI-powered technical interview preparation tool",
};

// Root layout wraps every page in the app
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}