import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useThemeContext } from "../context/ThemeContext";
import { MarketingHeader } from "../components/layout/MarketingHeader";
import { Reveal } from "../components/ui/Reveal";
import { HexagonPattern } from "../components/ui/HexagonPattern";
import { Particles } from "../components/ui/Particles";

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
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { effectiveTheme } = useThemeContext();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const particleColor = effectiveTheme === "dark" ? "#f2f2f0" : "#1b1a17";

  return (
    <div className="landing-editorial bg-dots font-editorial flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="flex-1">
        {/* ── Page hero — solid cream backdrop, no dots ───────── */}
        <section className="relative overflow-hidden bg-[var(--land-cream)] px-6 py-14 sm:py-20">
          <div className="landing-hero-glass" aria-hidden="true">
            <div className="landing-hero-glass-gradient" />
          </div>
          <HexagonPattern
            radius={32}
            className="fill-[var(--land-ink)]/[0.035] stroke-[var(--land-ink)]/[0.06] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black,transparent)]"
          />
          <Reveal className="relative mx-auto max-w-2xl text-center">
            <p className="font-label text-[11px] uppercase tracking-[0.16em] text-[var(--land-ink-3)]">
              Questions
            </p>
            <h1 className="font-display mt-3 text-3xl font-medium text-[var(--land-ink)] sm:text-4xl">
              Frequently asked questions
            </h1>
            <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-[var(--land-ink-2)]">
              Answers to common questions about ASideNote.
            </p>
          </Reveal>
        </section>

        {/* ── Accordion ────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 py-14 sm:py-20">
          <Particles className="absolute inset-0" quantity={50} size={0.6} color={particleColor} />
          <div className="relative mx-auto max-w-3xl">
            <Reveal>
              <div className="divide-y divide-[var(--land-rule)] rounded-2xl border border-[var(--land-rule)] bg-[var(--land-paper)] px-6 sm:px-8">
                {FAQS.map((faq, i) => {
                  const isOpen = openIndex === i;
                  return (
                    <div key={faq.question} className="py-5">
                      <button
                        type="button"
                        onClick={() => setOpenIndex(isOpen ? null : i)}
                        aria-expanded={isOpen}
                        className="font-display flex w-full cursor-pointer items-center justify-between gap-3 text-left text-base font-medium text-[var(--land-ink)]"
                      >
                        {faq.question}
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-[var(--land-ink-3)] transition-transform duration-300 ease-out-smooth ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      <div
                        className="grid transition-[grid-template-rows] duration-300 ease-out-smooth motion-reduce:transition-none"
                        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                      >
                        <div className="overflow-hidden">
                          <p className="mt-3 text-[15px] leading-relaxed text-[var(--land-ink-2)]">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>

            <Reveal delay={100} className="mt-8 text-center">
              <Link
                to="/"
                className="border-b border-[var(--land-rule)] pb-0.5 text-[15px] text-[var(--land-ink)] transition-colors hover:border-[var(--land-amber)]"
              >
                Back to home
              </Link>
            </Reveal>
          </div>
        </section>
      </main>

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
