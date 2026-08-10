import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { MarketingHeader } from "../components/layout/MarketingHeader";

export function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="font-editorial min-h-screen bg-background bg-dots">
      <MarketingHeader />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="paper-card rounded-xl border border-border/60 bg-surface/30 p-6 sm:p-8">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h1 className="font-display text-xl font-medium tracking-tight text-foreground sm:text-2xl">
                  Privacy Policy
                </h1>
                <p className="mt-0.5 text-xs text-foreground/50">
                  Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <section className="scroll-mt-6">
              <h2 className="font-display mb-3 flex items-center gap-2 border-l-4 border-l-amber-400 pl-3 text-base font-medium text-foreground dark:border-l-amber-500">
                1. Introduction
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                ASideNote (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use
                our application and services, including our note boards, chalk boards, projects, and calendar features.
              </p>
            </section>

            <section className="scroll-mt-6">
              <h2 className="font-display mb-3 flex items-center gap-2 border-l-4 border-l-amber-400 pl-3 text-base font-medium text-foreground dark:border-l-amber-500">
                2. Information We Collect
              </h2>
              <p className="mb-2 text-sm leading-relaxed text-foreground/80">
                We may collect information that you provide directly to us, including:
              </p>
              <ul className="list-outside space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/80 marker:text-amber-500">
                <li>Account information (e.g., email address, username, password)</li>
                <li>Profile information (e.g., display name, profile picture)</li>
                <li>Content you create (e.g., notes, boards, projects, calendar events)</li>
                <li>Communications when you contact us for support</li>
              </ul>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                We may also automatically collect certain technical information, such as device type, browser type,
                IP address, and usage data, to improve our services and security.
              </p>
            </section>

            <section className="scroll-mt-6">
              <h2 className="font-display mb-3 flex items-center gap-2 border-l-4 border-l-amber-400 pl-3 text-base font-medium text-foreground dark:border-l-amber-500">
                3. How We Use Your Information
              </h2>
              <p className="mb-2 text-sm leading-relaxed text-foreground/80">We use the information we collect to:</p>
              <ul className="list-outside space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/80 marker:text-amber-500">
                <li>Provide, maintain, and improve our services</li>
                <li>Authenticate your identity and manage your account</li>
                <li>Store and sync your boards, projects, and calendar data</li>
                <li>Send you service-related notifications (e.g., account or security updates)</li>
                <li>Respond to your requests and support needs</li>
                <li>Comply with legal obligations and protect our rights</li>
              </ul>
            </section>

            <section className="scroll-mt-6">
              <h2 className="font-display mb-3 flex items-center gap-2 border-l-4 border-l-amber-400 pl-3 text-base font-medium text-foreground dark:border-l-amber-500">
                4. Data Sharing and Disclosure
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                We do not sell your personal information. We may share your information only in the following
                circumstances: with your consent; with service providers who assist us under strict confidentiality
                obligations; to comply with law or legal process; or to protect the rights, property, or safety of
                ASideNote, our users, or the public.
              </p>
            </section>

            <section className="scroll-mt-6">
              <h2 className="font-display mb-3 flex items-center gap-2 border-l-4 border-l-amber-400 pl-3 text-base font-medium text-foreground dark:border-l-amber-500">
                5. Data Security
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                We implement appropriate technical and organizational measures to protect your personal information
                against unauthorized access, alteration, disclosure, or destruction. No method of transmission over
                the Internet or electronic storage is completely secure; we encourage you to use a strong password
                and keep your account credentials confidential.
              </p>
            </section>

            <section className="scroll-mt-6">
              <h2 className="font-display mb-3 flex items-center gap-2 border-l-4 border-l-amber-400 pl-3 text-base font-medium text-foreground dark:border-l-amber-500">
                6. Your Rights
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                Depending on your location, you may have rights to access, correct, delete, or port your personal
                data, or to object to or restrict certain processing. You can update account and profile information
                in your settings. To exercise other rights or ask questions, please contact us using the contact
                information provided below.
              </p>
            </section>

            <section className="scroll-mt-6">
              <h2 className="font-display mb-3 flex items-center gap-2 border-l-4 border-l-amber-400 pl-3 text-base font-medium text-foreground dark:border-l-amber-500">
                7. Changes to This Policy
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                We may update this Privacy Policy from time to time. We will notify you of material changes by
                posting the updated policy on this page and updating the &quot;Last updated&quot; date. Your continued
                use of ASideNote after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="scroll-mt-6">
              <h2 className="font-display mb-3 flex items-center gap-2 border-l-4 border-l-amber-400 pl-3 text-base font-medium text-foreground dark:border-l-amber-500">
                8. Contact Us
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                If you have questions about this Privacy Policy or our practices, please contact us at the contact
                information available on our website or within the application.
              </p>
            </section>
          </div>

          <div className="mt-10 border-t border-border/50 pt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
