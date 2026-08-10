import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { MarketingHeader } from "../components/layout/MarketingHeader";

const FAQS = [
  {
    question: "What is ASideNote?",
    answer:
      "ASideNote is a visual cork-board notetaking app. It brings note boards, chalk boards, projects, and a calendar into one place, so you can pin ideas down and turn them into plans without switching apps.",
  },
  {
    question: "Is ASideNote free to use?",
    answer: "Yes. Creating an account and using ASideNote is free right now.",
  },
  {
    question: "What's the difference between a note board and a chalk board?",
    answer:
      "A note board is a freeform cork board for sticky notes and index cards that you can drag, resize, and rearrange. A chalk board is an infinite canvas with a chalk-on-slate feel, built for sketching diagrams and brainstorming visually.",
  },
  {
    question: "Can I organize boards into projects?",
    answer:
      "Yes. Group related note boards and chalk boards under a project to keep every deliverable and plan in one organized workspace.",
  },
  {
    question: "Does ASideNote have a calendar?",
    answer:
      "Yes. The calendar view shows deadlines and milestones at a glance and ties directly back into your projects.",
  },
  {
    question: "Can I collaborate with friends?",
    answer:
      "Yes. You can invite friends to your boards and projects and work together in real time.",
  },
  {
    question: "Is my data synced across devices?",
    answer:
      "Yes. Your boards, projects, and calendar are stored on your account, so signing in from another device gives you the same workspace.",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "There's no native mobile app yet, but ASideNote is fully responsive and works well in a mobile browser.",
  },
];

export function FaqPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="landing-editorial bg-dots font-editorial min-h-screen">
      <MarketingHeader />

      {/* ── Page hero — solid cream backdrop, no dots ───────── */}
      <section className="bg-[var(--land-cream)] px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-label text-[11px] uppercase tracking-[0.16em] text-[var(--land-ink-3)]">
            Questions
          </p>
          <h1 className="font-display mt-3 text-3xl font-medium text-[var(--land-ink)] sm:text-4xl">
            Frequently asked questions
          </h1>
          <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-[var(--land-ink-2)]">
            Answers to common questions about ASideNote.
          </p>
        </div>
      </section>

      {/* ── Accordion ────────────────────────────────────────── */}
      <section className="px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="divide-y divide-[var(--land-rule)] rounded-2xl border border-[var(--land-rule)] bg-[var(--land-paper)] px-6 sm:px-8">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="font-display flex cursor-pointer list-none items-center justify-between gap-3 text-base font-medium text-[var(--land-ink)] marker:hidden [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--land-ink-3)] transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--land-ink-2)]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/"
              className="border-b border-[var(--land-rule)] pb-0.5 text-[15px] text-[var(--land-ink)] transition-colors hover:border-[var(--land-amber)]"
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="navbar-surface border-t border-border/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="flex flex-1 basis-0 justify-start gap-4">
            <Link
              to="/privacy"
              className="text-xs text-foreground/40 transition-colors hover:text-foreground/60"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-xs text-foreground/40 transition-colors hover:text-foreground/60"
            >
              Terms and Conditions
            </Link>
          </div>
          <Link to="/" className="flex shrink-0 items-center text-foreground/40 transition-colors hover:text-foreground/60">
            <img
              src="/asidenote-logo.png"
              alt="ASideNote"
              className="h-14 w-auto object-contain opacity-70"
            />
          </Link>
          <div className="flex flex-1 basis-0 justify-end">
            <p className="text-xs text-foreground/30">
              &copy; {new Date().getFullYear()} ASideNote. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
