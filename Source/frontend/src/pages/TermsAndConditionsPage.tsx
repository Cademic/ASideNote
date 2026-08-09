import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

export function TermsAndConditionsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background bg-dots">
      <header className="navbar-surface sticky top-0 z-30 border-b border-border/50">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="paper-card rounded-xl border border-border/60 bg-surface/30 p-6 sm:p-8">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950/40">
                <FileText className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Terms and Conditions
                </h1>
                <p className="mt-0.5 text-xs text-foreground/50">
                  Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <section className="scroll-mt-6">
              <h2 className="mb-3 flex items-center gap-2 border-l-4 border-l-sky-400 pl-3 text-base font-semibold text-foreground dark:border-l-sky-500">
                1. Acceptance of Terms
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                By accessing or using ASideNote (&quot;Service&quot;), you agree to be bound by these Terms and
                Conditions. If you do not agree to these terms, please do not use the Service. We reserve the right
                to modify these terms at any time; your continued use of the Service after changes constitutes
                acceptance of the updated terms.
              </p>
            </section>

            <section className="scroll-mt-6">
              <h2 className="mb-3 flex items-center gap-2 border-l-4 border-l-sky-400 pl-3 text-base font-semibold text-foreground dark:border-l-sky-500">
                2. Description of Service
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                ASideNote provides a visual workspace that includes note boards, chalk boards, projects, and calendar
                features. The Service allows you to create, store, organize, and manage content. We may add, change,
                or discontinue features with reasonable notice where practicable.
              </p>
            </section>

            <section className="scroll-mt-6">
              <h2 className="mb-3 flex items-center gap-2 border-l-4 border-l-sky-400 pl-3 text-base font-semibold text-foreground dark:border-l-sky-500">
                3. Account Registration and Security
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                You must provide accurate and complete information when creating an account. You are responsible for
                maintaining the confidentiality of your account credentials and for all activity under your account.
                You agree to notify us immediately of any unauthorized use. We are not liable for any loss or damage
                arising from your failure to protect your account.
              </p>
            </section>

            <section className="scroll-mt-6">
              <h2 className="mb-3 flex items-center gap-2 border-l-4 border-l-sky-400 pl-3 text-base font-semibold text-foreground dark:border-l-sky-500">
                4. Acceptable Use
              </h2>
              <p className="mb-2 text-sm leading-relaxed text-foreground/80">
                You agree to use the Service only for lawful purposes and in accordance with these terms. You must not:
              </p>
              <ul className="list-outside space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/80 marker:text-sky-500">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe the intellectual property or other rights of others</li>
                <li>Transmit malware, spam, or harmful or illegal content</li>
                <li>Attempt to gain unauthorized access to the Service, other accounts, or our systems</li>
                <li>Interfere with or disrupt the integrity or performance of the Service</li>
              </ul>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                We may suspend or terminate your access if we reasonably believe you have violated these terms.
              </p>
            </section>

            <section className="scroll-mt-6">
              <h2 className="mb-3 flex items-center gap-2 border-l-4 border-l-sky-400 pl-3 text-base font-semibold text-foreground dark:border-l-sky-500">
                5. Your Content
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                You retain ownership of content you create and upload. By using the Service, you grant us a
                limited license to store, process, and display your content as necessary to provide and improve the
                Service. You represent that you have the right to provide such content and that it does not violate
                any third-party rights or these terms. We are not responsible for the content you or other users
                post.
              </p>
            </section>

            <section className="scroll-mt-6">
              <h2 className="mb-3 flex items-center gap-2 border-l-4 border-l-sky-400 pl-3 text-base font-semibold text-foreground dark:border-l-sky-500">
                6. Intellectual Property
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                The Service, including its design, features, and underlying technology, is owned by ASideNote or
                our licensors and is protected by intellectual property laws. You may not copy, modify, distribute,
                or create derivative works from our Service or any part of it without our prior written consent.
              </p>
            </section>

            <section className="scroll-mt-6">
              <h2 className="mb-3 flex items-center gap-2 border-l-4 border-l-sky-400 pl-3 text-base font-semibold text-foreground dark:border-l-sky-500">
                7. Disclaimers
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either
                express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free
                of harmful components. Your use of the Service is at your sole risk.
              </p>
            </section>

            <section className="scroll-mt-6">
              <h2 className="mb-3 flex items-center gap-2 border-l-4 border-l-sky-400 pl-3 text-base font-semibold text-foreground dark:border-l-sky-500">
                8. Limitation of Liability
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                To the maximum extent permitted by law, ASideNote and its affiliates, officers, and employees shall
                not be liable for any indirect, incidental, special, consequential, or punitive damages, or any
                loss of data, profits, or revenue, arising from your use or inability to use the Service. Our total
                liability for any claims related to the Service shall not exceed the amount you paid us, if any, in
                the twelve months preceding the claim.
              </p>
            </section>

            <section className="scroll-mt-6">
              <h2 className="mb-3 flex items-center gap-2 border-l-4 border-l-sky-400 pl-3 text-base font-semibold text-foreground dark:border-l-sky-500">
                9. Termination
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                You may stop using the Service at any time. We may suspend or terminate your account or access to
                the Service at our discretion, including for violation of these terms. Upon termination, your
                right to use the Service ceases. We may retain or delete your data in accordance with our Privacy
                Policy and applicable law.
              </p>
            </section>

            <section className="scroll-mt-6">
              <h2 className="mb-3 flex items-center gap-2 border-l-4 border-l-sky-400 pl-3 text-base font-semibold text-foreground dark:border-l-sky-500">
                10. Contact
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                For questions about these Terms and Conditions, please contact us using the contact information
                available on our website or within the application.
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
