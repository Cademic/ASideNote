import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { MarketingHeader } from "../components/layout/MarketingHeader";
import { Reveal } from "../components/ui/Reveal";
import { GridPattern } from "../components/ui/GridPattern";
import { Highlighter } from "../components/ui/Highlighter";

const FAQS = [
  {
    question: "What is ASideNote?",
    answer:
      "ASideNote is a cork board for your notes. It brings note boards, chalk boards, projects, and a calendar together in one app, so you can jot down an idea and turn it into a plan without switching tools.",
  },
  {
    question: "Is ASideNote free to use?",
    answer: "Yep, creating an account and using ASideNote is free right now.",
  },
  {
    question: "What's the difference between a note board and a chalk board?",
    answer:
      "A note board is a cork board for sticky notes and index cards you can drag, resize, and move around. A chalk board is an endless canvas that feels like a real chalkboard, made for sketching and brainstorming.",
  },
  {
    question: "Can I organize boards into projects?",
    answer:
      "Yes. Group related note boards and chalk boards under a project so everything stays in one place.",
  },
  {
    question: "Does ASideNote have a calendar?",
    answer:
      "Yes. The calendar shows your deadlines and milestones at a glance, and it's connected to your projects.",
  },
  {
    question: "Can I collaborate with friends?",
    answer: "Yes. Invite friends to a board or project and work together in real time.",
  },
  {
    question: "Is my data synced across devices?",
    answer:
      "Yes. Everything is tied to your account, so signing in on another device gives you the same workspace.",
  },
  {
    question: "Is there a mobile app?",
    answer: "Not yet, but ASideNote works well in a mobile browser.",
  },
];

export function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="landing-editorial font-editorial flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="flex-1">
        {/* ── Page hero — solid cream backdrop, no dots ───────── */}
        <section className="relative overflow-hidden bg-[var(--land-cream)] px-6 py-20 sm:py-28">
          <div className="landing-hero-glass" aria-hidden="true">
            <div className="landing-hero-glass-gradient" />
          </div>
          <Reveal className="relative mx-auto max-w-3xl text-center">
            <h1 className="font-display text-4xl font-medium text-[var(--land-ink)] sm:text-6xl">
              FAQ
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--land-ink-2)] sm:text-xl">
              Quick answers to the questions we get most.
            </p>
          </Reveal>
        </section>

        {/* ── Accordion ────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 py-20 sm:py-28">
          <GridPattern
            width={32}
            height={32}
            strokeDasharray="4 2"
            className="stroke-[var(--land-ink)]/[0.08] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black,transparent)]"
          />
          <div className="relative mx-auto max-w-3xl">
            <h2 className="font-display mb-4 text-2xl font-medium text-[var(--land-ink)] sm:text-5xl">
              Common Questions
            </h2>
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
                        className="font-display flex w-full cursor-pointer items-center justify-between gap-3 text-left text-lg font-medium text-[var(--land-ink)] sm:text-xl"
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
                          <p className="mt-3 text-lg leading-relaxed text-[var(--land-ink-2)] sm:text-xl">
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
                className="inline-block text-[15px] font-medium text-[var(--land-ink-2)] transition-[color,transform] duration-200 ease-out-smooth hover:scale-110 hover:text-[var(--land-ink)] motion-reduce:transition-none motion-reduce:hover:scale-100"
              >
                <Highlighter action="highlight" color="rgba(59, 130, 246, 0.35)">
                  Back to home
                </Highlighter>
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
