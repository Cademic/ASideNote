import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { MarketingHeader } from "../components/layout/MarketingHeader";
import { Reveal } from "../components/ui/Reveal";
import { GridPattern } from "../components/ui/GridPattern";

const SECTIONS = [
  {
    heading: "1. Acceptance of Terms",
    body: (
      <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
        By accessing or using ASideNote (&quot;Service&quot;), you agree to be bound by these Terms and
        Conditions. If you do not agree to these terms, please do not use the Service. We reserve the right
        to modify these terms at any time; your continued use of the Service after changes constitutes
        acceptance of the updated terms.
      </p>
    ),
  },
  {
    heading: "2. Description of Service",
    body: (
      <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
        ASideNote provides a visual workspace that includes note boards, chalk boards, projects, and calendar
        features. The Service allows you to create, store, organize, and manage content. We may add, change,
        or discontinue features with reasonable notice where practicable.
      </p>
    ),
  },
  {
    heading: "3. Account Registration and Security",
    body: (
      <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
        You must provide accurate and complete information when creating an account. You are responsible for
        maintaining the confidentiality of your account credentials and for all activity under your account.
        You agree to notify us immediately of any unauthorized use. We are not liable for any loss or damage
        arising from your failure to protect your account.
      </p>
    ),
  },
  {
    heading: "4. Acceptable Use",
    body: (
      <>
        <p className="mb-2 text-[15px] leading-relaxed text-[var(--land-ink-2)]">
          You agree to use the Service only for lawful purposes and in accordance with these terms. You must not:
        </p>
        <ul className="list-outside space-y-1.5 pl-5 text-[15px] leading-relaxed text-[var(--land-ink-2)] marker:text-[var(--land-amber)]">
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe the intellectual property or other rights of others</li>
          <li>Transmit malware, spam, or harmful or illegal content</li>
          <li>Attempt to gain unauthorized access to the Service, other accounts, or our systems</li>
          <li>Interfere with or disrupt the integrity or performance of the Service</li>
        </ul>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--land-ink-2)]">
          We may suspend or terminate your access if we reasonably believe you have violated these terms.
        </p>
      </>
    ),
  },
  {
    heading: "5. Your Content",
    body: (
      <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
        You retain ownership of content you create and upload. By using the Service, you grant us a
        limited license to store, process, and display your content as necessary to provide and improve the
        Service. You represent that you have the right to provide such content and that it does not violate
        any third-party rights or these terms. We are not responsible for the content you or other users
        post.
      </p>
    ),
  },
  {
    heading: "6. Intellectual Property",
    body: (
      <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
        The Service, including its design, features, and underlying technology, is owned by ASideNote or
        our licensors and is protected by intellectual property laws. You may not copy, modify, distribute,
        or create derivative works from our Service or any part of it without our prior written consent.
      </p>
    ),
  },
  {
    heading: "7. Disclaimers",
    body: (
      <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
        The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either
        express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free
        of harmful components. Your use of the Service is at your sole risk.
      </p>
    ),
  },
  {
    heading: "8. Limitation of Liability",
    body: (
      <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
        To the maximum extent permitted by law, ASideNote and its affiliates, officers, and employees shall
        not be liable for any indirect, incidental, special, consequential, or punitive damages, or any
        loss of data, profits, or revenue, arising from your use or inability to use the Service. Our total
        liability for any claims related to the Service shall not exceed the amount you paid us, if any, in
        the twelve months preceding the claim.
      </p>
    ),
  },
  {
    heading: "9. Termination",
    body: (
      <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
        You may stop using the Service at any time. We may suspend or terminate your account or access to
        the Service at our discretion, including for violation of these terms. Upon termination, your
        right to use the Service ceases. We may retain or delete your data in accordance with our Privacy
        Policy and applicable law.
      </p>
    ),
  },
  {
    heading: "10. Contact",
    body: (
      <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
        For questions about these Terms and Conditions, please contact us using the contact information
        available on our website or within the application.
      </p>
    ),
  },
];

export function TermsAndConditionsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="landing-editorial font-editorial flex min-h-screen flex-col">
      <Helmet>
        <title>Terms and Conditions — ASideNote</title>
        <meta
          name="description"
          content="The terms and conditions governing your use of ASideNote."
        />
        <link rel="canonical" href="https://asidenote.net/terms" />
      </Helmet>
      <MarketingHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 py-20 sm:py-28">
          <GridPattern
            width={32}
            height={32}
            strokeDasharray="4 2"
            className="stroke-[var(--land-ink)]/[0.08] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black,transparent)]"
          />
          <div className="relative mx-auto max-w-3xl">
            <Reveal>
              <h1 className="font-display text-3xl font-medium text-[var(--land-ink)] sm:text-5xl">
                Terms and Conditions
              </h1>
              <p className="mt-3 text-sm text-[var(--land-ink-3)]">
                Last updated:{" "}
                {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </Reveal>

            <Reveal delay={100} className="mt-12 space-y-10">
              {SECTIONS.map((section) => (
                <section key={section.heading} className="scroll-mt-6">
                  <h2 className="font-display mb-3 border-l-4 border-l-[var(--land-amber)] pl-3 text-lg font-medium text-[var(--land-ink)]">
                    {section.heading}
                  </h2>
                  {section.body}
                </section>
              ))}
            </Reveal>

            <Reveal delay={150} className="mt-12">
              <Link
                to="/"
                className="inline-flex items-center gap-2 border-b border-[var(--land-rule)] pb-0.5 text-[15px] text-[var(--land-ink)] transition-colors hover:border-[var(--land-amber)]"
              >
                <ArrowLeft className="h-4 w-4" />
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
              src="/asidenote-logo.webp"
              alt="ASideNote"
              width={410}
              height={168}
              loading="lazy"
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
