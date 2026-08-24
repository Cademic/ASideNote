import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { MarketingHeader } from "../components/layout/MarketingHeader";
import { Reveal } from "../components/ui/Reveal";

const SECTIONS = [
  {
    heading: "1. Introduction",
    body: (
      <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
        ASideNote (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
        This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use
        our application and services, including our note boards, chalk boards, projects, and calendar features.
      </p>
    ),
  },
  {
    heading: "2. Information We Collect",
    body: (
      <>
        <p className="mb-2 text-[15px] leading-relaxed text-[var(--land-ink-2)]">
          We may collect information that you provide directly to us, including:
        </p>
        <ul className="list-outside space-y-1.5 pl-5 text-[15px] leading-relaxed text-[var(--land-ink-2)] marker:text-[var(--land-amber)]">
          <li>Account information (e.g., email address, username, password)</li>
          <li>Profile information (e.g., display name, profile picture)</li>
          <li>Content you create (e.g., notes, boards, projects, calendar events)</li>
          <li>Communications when you contact us for support</li>
        </ul>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--land-ink-2)]">
          We may also automatically collect certain technical information, such as device type, browser type,
          IP address, and usage data, to improve our services and security.
        </p>
      </>
    ),
  },
  {
    heading: "3. How We Use Your Information",
    body: (
      <>
        <p className="mb-2 text-[15px] leading-relaxed text-[var(--land-ink-2)]">We use the information we collect to:</p>
        <ul className="list-outside space-y-1.5 pl-5 text-[15px] leading-relaxed text-[var(--land-ink-2)] marker:text-[var(--land-amber)]">
          <li>Provide, maintain, and improve our services</li>
          <li>Authenticate your identity and manage your account</li>
          <li>Store and sync your boards, projects, and calendar data</li>
          <li>Send you service-related notifications (e.g., account or security updates)</li>
          <li>Respond to your requests and support needs</li>
          <li>Comply with legal obligations and protect our rights</li>
        </ul>
      </>
    ),
  },
  {
    heading: "4. Data Sharing and Disclosure",
    body: (
      <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
        We do not sell your personal information. We may share your information only in the following
        circumstances: with your consent; with service providers who assist us under strict confidentiality
        obligations; to comply with law or legal process; or to protect the rights, property, or safety of
        ASideNote, our users, or the public.
      </p>
    ),
  },
  {
    heading: "5. Data Security",
    body: (
      <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
        We implement appropriate technical and organizational measures to protect your personal information
        against unauthorized access, alteration, disclosure, or destruction. No method of transmission over
        the Internet or electronic storage is completely secure; we encourage you to use a strong password
        and keep your account credentials confidential.
      </p>
    ),
  },
  {
    heading: "6. Your Rights",
    body: (
      <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
        Depending on your location, you may have rights to access, correct, delete, or port your personal
        data, or to object to or restrict certain processing. You can update account and profile information
        in your settings. To exercise other rights or ask questions, please contact us using the contact
        information provided below.
      </p>
    ),
  },
  {
    heading: "7. Changes to This Policy",
    body: (
      <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
        We may update this Privacy Policy from time to time. We will notify you of material changes by
        posting the updated policy on this page and updating the &quot;Last updated&quot; date. Your continued
        use of ASideNote after changes constitutes acceptance of the updated policy.
      </p>
    ),
  },
  {
    heading: "8. Contact Us",
    body: (
      <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
        If you have questions about this Privacy Policy or our practices, please contact us at the contact
        information available on our website or within the application.
      </p>
    ),
  },
];

export function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="landing-editorial font-editorial flex min-h-screen flex-col">
      <Helmet>
        <title>Privacy Policy — ASideNote</title>
        <meta
          name="description"
          content="How ASideNote collects, uses, discloses, and safeguards your information."
        />
        <link rel="canonical" href="https://asidenote.net/privacy" />
      </Helmet>
      <MarketingHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 py-20 sm:py-28">
          <div className="relative mx-auto max-w-3xl">
            <Reveal>
              <h1 className="font-display text-3xl font-medium text-[var(--land-ink)] sm:text-5xl">
                Privacy Policy
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
