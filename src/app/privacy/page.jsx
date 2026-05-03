import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";

const EFFECTIVE_DATE = "May 3, 2026";
const CONTACT_EMAIL = "support@soldierhub.com";

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2
        className="text-xl md:text-2xl font-semibold leading-snug"
        style={{ color: T.navy }}
      >
        {title}
      </h2>
      <div
        className="mt-3 space-y-3 text-[15px] leading-relaxed"
        style={{ color: T.textMuted }}
      >
        {children}
      </div>
    </section>
  );
}

function BulletList({ items }) {
  return (
    <ul className="list-disc pl-5 space-y-2">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export const metadata = {
  title: "Privacy Policy · Soldier Hub",
  description:
    "Privacy Policy for Soldier Hub, an independent unofficial community platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <AppShell hideNav>
      <main
        className="min-h-screen pb-24 md:pb-12"
        style={{ backgroundColor: T.bg }}
      >
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: T.card,
              borderColor: T.border,
              color: T.text,
            }}
          >
            <ArrowLeft size={16} />
            Back to Soldier Hub
          </Link>

          <div className="mt-8">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={17} style={{ color: T.gold }} />
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: T.gold }}
              >
                Soldier Hub
              </span>
            </div>

            <h1
              className="text-4xl md:text-5xl leading-tight font-serif"
              style={{ color: T.navy }}
            >
              Privacy Policy
            </h1>

            <p
              className="mt-3 text-sm leading-relaxed"
              style={{ color: T.textMuted }}
            >
              Effective date: {EFFECTIVE_DATE}
            </p>
          </div>

          <div
            className="mt-6 rounded-2xl border p-5"
            style={{ backgroundColor: T.card, borderColor: T.border }}
          >
            <p
              className="text-[15px] leading-relaxed font-medium"
              style={{ color: T.text }}
            >
              Soldier Hub is an independent, unofficial community platform. It
              is not affiliated with, endorsed by, sponsored by, or controlled
              by the U.S. Department of Defense, the U.S. Army, Fort Bliss, or
              any government agency.
            </p>
          </div>

          <Section title="1. Purpose of this Privacy Policy">
            <p>
              This Privacy Policy explains how Soldier Hub collects, uses,
              stores, shares, and protects information when you use our website,
              app, community features, resource pages, verification features,
              posts, comments, reports, marketplace features, or related
              services.
            </p>
            <p>
              By using Soldier Hub, you agree to this Privacy Policy. If you do
              not agree, do not create an account or use the platform.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p>We may collect the following categories of information:</p>
            <BulletList
              items={[
                "Account information, such as your name, email address, login information, base/community selection, profile information, avatar, and account status.",
                "Optional verification information, such as military email, personal email, phone number, role, unit-related information you voluntarily provide, or other information needed to review account eligibility.",
                "User-generated content, such as posts, comments, reports, profile text, resource suggestions, marketplace listings, images, and any other content you submit.",
                "Community activity information, such as likes, upvotes, comments, reports, moderation history, verification status, blocked status, and admin actions.",
                "Technical information, such as IP address, device type, browser type, operating system, approximate location derived from your device or network, log data, cookies, and similar usage information.",
                "Communication information, such as messages you send to us, feedback, support requests, and emails related to account verification or platform safety.",
              ]}
            />
            <p>
              Do not submit classified information, controlled unclassified
              information, sensitive mission information, medical information,
              financial account information, Social Security numbers, military
              orders, CAC images, passwords, or any information you are not
              authorized to share.
            </p>
          </Section>

          <Section title="3. Information You Should Not Post">
            <p>
              Soldier Hub is a community platform, not an official reporting
              system. You are responsible for what you post. You must not post:
            </p>
            <BulletList
              items={[
                "Classified information, controlled unclassified information, OPSEC-sensitive information, deployment details, troop movement details, gate security procedures, access control vulnerabilities, or non-public military information.",
                "Personal information about another person without permission, including phone numbers, addresses, medical details, family details, workplace details, or identifying information.",
                "Threats, harassment, hate speech, illegal content, scams, fraud, impersonation, or content that encourages harm.",
                "Emergency requests that require immediate police, fire, medical, command, or crisis response.",
              ]}
            />
          </Section>

          <Section title="4. How We Use Information">
            <p>We use information to:</p>
            <BulletList
              items={[
                "Create, maintain, and secure user accounts.",
                "Review and manage account verification.",
                "Display posts, comments, resources, marketplace listings, profiles, and community activity.",
                "Moderate content, investigate reports, detect abuse, remove prohibited content, and enforce our Terms of Use.",
                "Send account, security, verification, and platform-related communications.",
                "Improve Soldier Hub features, design, performance, and safety.",
                "Prevent fraud, spam, unauthorized access, impersonation, and misuse.",
                "Comply with legal obligations, court orders, law enforcement requests, or government requests when required by law.",
              ]}
            />
          </Section>

          <Section title="5. Verification and Military Community Features">
            <p>
              Soldier Hub may use military email, personal email, phone number,
              base selection, role information, or other information you
              voluntarily provide to review whether an account should receive
              verified access. Verification is a platform access decision only.
              It does not confirm official military status, security clearance,
              rank, unit assignment, employment, or identity for any legal,
              official, or government purpose.
            </p>
            <p>
              Soldier Hub does not issue government credentials and does not
              replace any official military system, command channel, base
              office, military police desk, emergency service, family readiness
              program, housing office, or legal assistance office.
            </p>
          </Section>

          <Section title="6. How We Share Information">
            <p>We may share information in limited situations:</p>
            <BulletList
              items={[
                "With service providers that help us operate the platform, such as hosting, database, authentication, storage, email, analytics, moderation, or security providers.",
                "With other users when you choose to post, comment, create a profile, list an item, or otherwise submit content visible to the community.",
                "With admins or moderators who need access to review verification, reports, safety issues, account status, or platform misuse.",
                "With law enforcement, courts, government authorities, or other parties when required by law or when we believe disclosure is necessary to protect safety, rights, property, or platform security.",
                "With a successor organization if Soldier Hub is involved in a merger, acquisition, reorganization, transfer, or sale of assets, subject to this Privacy Policy or a replacement notice.",
              ]}
            />
            <p>
              We do not sell your personal information. We do not knowingly use
              your personal information for cross-context behavioral advertising.
            </p>
          </Section>

          <Section title="7. Third-Party Services and External Links">
            <p>
              Soldier Hub may link to official websites, public resources,
              local services, third-party businesses, maps, weather information,
              or community resources. These third-party websites and services
              are not controlled by Soldier Hub. Their own privacy policies and
              terms apply.
            </p>
            <p>
              The appearance of external links does not mean Soldier Hub
              endorses those websites or that those websites, the U.S.
              Government, the U.S. Department of Defense, the U.S. Army, or Fort
              Bliss endorse Soldier Hub.
            </p>
          </Section>

          <Section title="8. Weather, BAH, Gate, Resource, and Community Information">
            <p>
              Soldier Hub may display public information such as weather, local
              time, gate hours, BAH estimates, resource links, and community
              guidance. This information is provided for convenience only and
              may be delayed, incomplete, outdated, or incorrect.
            </p>
            <p>
              Always verify important information through official sources,
              your chain of command, installation offices, official government
              websites, or other authoritative sources before making decisions.
            </p>
          </Section>

          <Section title="9. Cookies and Similar Technologies">
            <p>
              We may use cookies, browser storage, session storage, local
              storage, and similar technologies to keep you signed in, remember
              preferences, improve performance, protect accounts, and understand
              platform usage.
            </p>
            <p>
              You can control cookies through your browser settings. Some parts
              of Soldier Hub may not work properly if cookies or browser storage
              are disabled.
            </p>
          </Section>

          <Section title="10. Data Security">
            <p>
              We use reasonable administrative, technical, and organizational
              safeguards designed to protect information. However, no website,
              app, database, network, or online service is completely secure.
              You use Soldier Hub at your own risk.
            </p>
            <p>
              You are responsible for protecting your login credentials and for
              not sharing sensitive information through the platform.
            </p>
          </Section>

          <Section title="11. Data Retention">
            <p>
              We keep information for as long as reasonably necessary to operate
              Soldier Hub, provide services, maintain account records, enforce
              rules, resolve disputes, comply with legal obligations, prevent
              abuse, and maintain platform safety.
            </p>
            <p>
              Deleted content may remain in backups, logs, moderation records,
              security records, or legal records for a limited period where
              necessary. We may also retain records related to banned accounts,
              reports, or abuse to protect the platform and users.
            </p>
          </Section>

          <Section title="12. Account Deletion and Privacy Requests">
            <p>
              You may request account deletion or ask privacy-related questions
              by contacting us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: T.navy }}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
            <p>
              We may need to verify your identity before processing a request.
              Some information may be retained if required for security,
              moderation, legal compliance, dispute resolution, fraud prevention,
              or platform integrity.
            </p>
          </Section>

          <Section title="13. California and Other Privacy Rights">
            <p>
              Depending on where you live and whether applicable law applies to
              Soldier Hub, you may have rights to request access to, correction
              of, deletion of, or information about certain personal
              information. You may also have the right to know whether
              information is sold or shared for certain advertising purposes.
            </p>
            <p>
              Soldier Hub does not sell personal information. To submit a
              privacy request, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: T.navy }}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="14. Children’s Privacy">
            <p>
              Soldier Hub is not directed to children under 13 years old. We do
              not knowingly collect personal information from children under 13.
              If you believe a child under 13 has provided personal information,
              contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: T.navy }}>
                {CONTACT_EMAIL}
              </a>{" "}
              so we can review and take appropriate action.
            </p>
          </Section>

          <Section title="15. International Users">
            <p>
              Soldier Hub is operated for users in the United States. If you use
              Soldier Hub from outside the United States, you understand that
              your information may be processed in the United States or other
              locations where our service providers operate.
            </p>
          </Section>

          <Section title="16. Changes to this Privacy Policy">
            <p>
              We may update this Privacy Policy from time to time. If we make
              material changes, we may provide notice through the platform, by
              email, or by updating the effective date. Your continued use of
              Soldier Hub after changes means you accept the updated Privacy
              Policy.
            </p>
          </Section>

          <Section title="17. Contact">
            <p>
              For privacy questions, deletion requests, or safety concerns,
              contact:
            </p>
            <p>
              <strong style={{ color: T.text }}>Soldier Hub</strong>
              <br />
              Email:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: T.navy }}>
                {CONTACT_EMAIL}
              </a>
            </p>
          </Section>

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}