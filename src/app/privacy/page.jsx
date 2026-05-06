import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  ExternalLink,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";

const EFFECTIVE_DATE = "May 3, 2026";
const CONTACT_EMAIL = "support@soldierhub.com";

const quickLinks = [
  "Information we collect",
  "What not to post",
  "How we use information",
  "How we share information",
  "Security and retention",
  "Privacy requests",
];

const sections = [
  {
    title: "1. Purpose of this Privacy Policy",
    body: [
      "This Privacy Policy explains how Soldier Hub collects, uses, stores, shares, and protects information when you use our website, app, community features, resource pages, verification features, posts, comments, reports, marketplace features, or related services.",
      "By using Soldier Hub, you agree to this Privacy Policy. If you do not agree, do not create an account or use the platform.",
    ],
  },
  {
    title: "2. Information We Collect",
    body: ["We may collect the following categories of information:"],
    bullets: [
      "Account information, such as your name, email address, login information, base/community selection, profile information, avatar, and account status.",
      "Optional verification information, such as military email, personal email, phone number, role, unit-related information you voluntarily provide, or other information needed to review account eligibility.",
      "User-generated content, such as posts, comments, reports, profile text, resource suggestions, marketplace listings, images, and any other content you submit.",
      "Community activity information, such as likes, upvotes, comments, reports, moderation history, verification status, blocked status, and admin actions.",
      "Technical information, such as IP address, device type, browser type, operating system, approximate location derived from your device or network, log data, cookies, and similar usage information.",
      "Communication information, such as messages you send to us, feedback, support requests, and emails related to account verification or platform safety.",
    ],
    footer:
      "Do not submit classified information, controlled unclassified information, sensitive mission information, medical information, financial account information, Social Security numbers, military orders, CAC images, passwords, or any information you are not authorized to share.",
  },
  {
    title: "3. Information You Should Not Post",
    body: [
      "Soldier Hub is a community platform, not an official reporting system. You are responsible for what you post. You must not post:",
    ],
    bullets: [
      "Classified information, controlled unclassified information, OPSEC-sensitive information, deployment details, troop movement details, gate security procedures, access control vulnerabilities, or non-public military information.",
      "Personal information about another person without permission, including phone numbers, addresses, medical details, family details, workplace details, or identifying information.",
      "Threats, harassment, hate speech, illegal content, scams, fraud, impersonation, or content that encourages harm.",
      "Emergency requests that require immediate police, fire, medical, command, or crisis response.",
    ],
  },
  {
    title: "4. How We Use Information",
    body: ["We use information to:"],
    bullets: [
      "Create, maintain, and secure user accounts.",
      "Review and manage account verification.",
      "Display posts, comments, resources, marketplace listings, profiles, and community activity.",
      "Moderate content, investigate reports, detect abuse, remove prohibited content, and enforce our Terms of Use.",
      "Send account, security, verification, and platform-related communications.",
      "Improve Soldier Hub features, design, performance, and safety.",
      "Prevent fraud, spam, unauthorized access, impersonation, and misuse.",
      "Comply with legal obligations, court orders, law enforcement requests, or government requests when required by law.",
    ],
  },
  {
    title: "5. Verification and Military Community Features",
    body: [
      "Soldier Hub may use military email, personal email, phone number, base selection, role information, or other information you voluntarily provide to review whether an account should receive verified access. Verification is a platform access decision only. It does not confirm official military status, security clearance, rank, unit assignment, employment, or identity for any legal, official, or government purpose.",
      "Soldier Hub does not issue government credentials and does not replace any official military system, command channel, base office, military police desk, emergency service, family readiness program, housing office, or legal assistance office.",
    ],
  },
  {
    title: "6. How We Share Information",
    body: ["We may share information in limited situations:"],
    bullets: [
      "With service providers that help us operate the platform, such as hosting, database, authentication, storage, email, analytics, moderation, or security providers.",
      "With other users when you choose to post, comment, create a profile, list an item, or otherwise submit content visible to the community.",
      "With admins or moderators who need access to review verification, reports, safety issues, account status, or platform misuse.",
      "With law enforcement, courts, government authorities, or other parties when required by law or when we believe disclosure is necessary to protect safety, rights, property, or platform security.",
      "With a successor organization if Soldier Hub is involved in a merger, acquisition, reorganization, transfer, or sale of assets, subject to this Privacy Policy or a replacement notice.",
    ],
    footer:
      "We do not sell your personal information. We do not knowingly use your personal information for cross-context behavioral advertising.",
  },
  {
    title: "7. Third-Party Services and External Links",
    body: [
      "Soldier Hub may link to official websites, public resources, local services, third-party businesses, maps, weather information, or community resources. These third-party websites and services are not controlled by Soldier Hub. Their own privacy policies and terms apply.",
      "The appearance of external links does not mean Soldier Hub endorses those websites or that those websites, the U.S. Government, the U.S. Department of Defense, the U.S. Army, or Fort Bliss endorse Soldier Hub.",
    ],
  },
  {
    title: "8. Weather, BAH, Gate, Resource, and Community Information",
    body: [
      "Soldier Hub may display public information such as weather, local time, gate hours, BAH estimates, resource links, and community guidance. This information is provided for convenience only and may be delayed, incomplete, outdated, or incorrect.",
      "Always verify important information through official sources, your chain of command, installation offices, official government websites, or other authoritative sources before making decisions.",
    ],
  },
  {
    title: "9. Cookies and Similar Technologies",
    body: [
      "We may use cookies, browser storage, session storage, local storage, and similar technologies to keep you signed in, remember preferences, improve performance, protect accounts, and understand platform usage.",
      "You can control cookies through your browser settings. Some parts of Soldier Hub may not work properly if cookies or browser storage are disabled.",
    ],
  },
  {
    title: "10. Data Security",
    body: [
      "We use reasonable administrative, technical, and organizational safeguards designed to protect information. However, no website, app, database, network, or online service is completely secure. You use Soldier Hub at your own risk.",
      "You are responsible for protecting your login credentials and for not sharing sensitive information through the platform.",
    ],
  },
  {
    title: "11. Data Retention",
    body: [
      "We keep information for as long as reasonably necessary to operate Soldier Hub, provide services, maintain account records, enforce rules, resolve disputes, comply with legal obligations, prevent abuse, and maintain platform safety.",
      "Deleted content may remain in backups, logs, moderation records, security records, or legal records for a limited period where necessary. We may also retain records related to banned accounts, reports, or abuse to protect the platform and users.",
    ],
  },
  {
    title: "12. Account Deletion and Privacy Requests",
    body: [
      "You may request account deletion or ask privacy-related questions by contacting us at support@soldierhub.com.",
      "We may need to verify your identity before processing a request. Some information may be retained if required for security, moderation, legal compliance, dispute resolution, fraud prevention, or platform integrity.",
    ],
  },
  {
    title: "13. California and Other Privacy Rights",
    body: [
      "Depending on where you live and whether applicable law applies to Soldier Hub, you may have rights to request access to, correction of, deletion of, or information about certain personal information. You may also have the right to know whether information is sold or shared for certain advertising purposes.",
      "Soldier Hub does not sell personal information. To submit a privacy request, contact us at support@soldierhub.com.",
    ],
  },
  {
    title: "14. Children’s Privacy",
    body: [
      "Soldier Hub is not directed to children under 13 years old. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided personal information, contact us at support@soldierhub.com so we can review and take appropriate action.",
    ],
  },
  {
    title: "15. International Users",
    body: [
      "Soldier Hub is operated for users in the United States. If you use Soldier Hub from outside the United States, you understand that your information may be processed in the United States or other locations where our service providers operate.",
    ],
  },
  {
    title: "16. Changes to this Privacy Policy",
    body: [
      "We may update this Privacy Policy from time to time. The updated version will be posted on this page with a new effective date. Your continued use of Soldier Hub after changes are posted means you accept the updated Privacy Policy.",
    ],
  },
  {
    title: "17. Contact Us",
    body: ["For privacy questions or requests, contact us at support@soldierhub.com."],
  },
];

function HeroStat({ icon: Icon, title, body }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: "rgba(255,255,255,0.78)",
        borderColor: "rgba(188,208,234,0.85)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(220,232,247,0.95)" }}
        >
          <Icon size={18} style={{ color: T.blue }} strokeWidth={2.2} />
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: T.navy }}>
            {title}
          </div>
          <div className="mt-1 text-xs leading-relaxed" style={{ color: T.textMuted }}>
            {body}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, body = [], bullets, footer }) {
  return (
    <section
      className="rounded-3xl border p-5 md:p-6 scroll-mt-24"
      style={{
        backgroundColor: T.card,
        borderColor: T.border,
        boxShadow: "0 12px 30px rgba(7, 27, 51, 0.05)",
      }}
    >
      <h2 className="text-lg md:text-xl font-bold leading-snug" style={{ color: T.navy }}>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[14px] md:text-[15px] leading-7" style={{ color: T.textMuted }}>
        {body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {bullets ? (
          <ul className="grid gap-2.5">
            {bullets.map((item) => (
              <li key={item} className="flex gap-2.5">
                <CheckCircle2 size={16} className="mt-1 shrink-0" style={{ color: T.blue }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {footer ? (
          <p className="rounded-2xl border px-4 py-3 font-medium" style={{ backgroundColor: "rgba(244,248,253,0.95)", borderColor: "#D5E2F2", color: T.text }}>
            {footer}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export const metadata = {
  title: "Privacy Policy · Soldier Hub",
  description: "Privacy Policy for Soldier Hub, an independent unofficial community platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <AppShell hideNav>
      <main
        className="min-h-screen pb-16"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(220,232,247,0.85), transparent 32%), linear-gradient(180deg, #F4F8FD 0%, #FFFFFF 48%, #F4F8FD 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
            style={{ backgroundColor: "rgba(255,255,255,0.86)", borderColor: "#D5E2F2", color: T.navy }}
          >
            <ArrowLeft size={16} />
            Back to Soldier Hub
          </Link>

          <section
            className="mt-6 rounded-[32px] border overflow-hidden relative"
            style={{
              borderColor: "#BCD0EA",
              background:
                "linear-gradient(135deg, rgba(220,232,247,0.96) 0%, rgba(253,254,255,0.98) 52%, rgba(253,236,240,0.9) 100%)",
              boxShadow: "0 22px 60px rgba(7,27,51,0.08)",
            }}
          >
            <div className="absolute left-0 top-0 h-full w-2 bg-[#B31942]" />
            <div className="absolute right-0 top-0 h-full w-2 bg-[#1E4E8C]" />

            <div className="p-6 md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2", color: T.blue }}>
                <ShieldCheck size={15} />
                Soldier Hub Privacy
              </div>

              <div className="mt-5 grid lg:grid-cols-[1fr_320px] gap-6 items-end">
                <div>
                  <h1 className="text-4xl md:text-6xl font-extrabold tracking-[-0.04em] leading-[0.95]" style={{ color: T.navy }}>
                    Privacy Policy
                  </h1>
                  <p className="mt-4 max-w-2xl text-base md:text-lg leading-8" style={{ color: T.textMuted }}>
                    Clear guidance on what Soldier Hub collects, how it is used, and what users should never share on the platform.
                  </p>
                  <p className="mt-3 text-sm font-semibold" style={{ color: T.text }}>
                    Effective date: {EFFECTIVE_DATE}
                  </p>
                </div>

                <div className="rounded-3xl border p-4" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2" }}>
                  <div className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: T.textSubtle }}>
                    Quick summary
                  </div>
                  <div className="mt-3 grid gap-2">
                    <HeroStat icon={EyeOff} title="Do not post sensitive info" body="No OPSEC, classified, medical, financial, CAC, or mission-sensitive data." />
                    <HeroStat icon={LockKeyhole} title="Security matters" body="We use safeguards, but no online platform is completely risk-free." />
                    <HeroStat icon={Database} title="No sale of personal info" body="Soldier Hub does not sell personal information." />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-6 grid lg:grid-cols-[280px_1fr] gap-5 items-start">
            <aside className="lg:sticky lg:top-24 rounded-3xl border p-4" style={{ backgroundColor: "rgba(255,255,255,0.86)", borderColor: T.border }}>
              <div className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: T.textSubtle }}>
                Page guide
              </div>
              <div className="mt-3 grid gap-2">
                {quickLinks.map((item) => (
                  <div key={item} className="rounded-2xl px-3 py-2 text-sm font-semibold" style={{ backgroundColor: "rgba(244,248,253,0.95)", color: T.navy }}>
                    {item}
                  </div>
                ))}
              </div>
              <a href={`mailto:${CONTACT_EMAIL}`} className="mt-4 flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold" style={{ background: "linear-gradient(135deg, #071B33 0%, #1E4E8C 100%)", color: "#FFFFFF" }}>
                <Mail size={16} />
                Contact privacy
              </a>
            </aside>

            <div className="grid gap-4">
              <div className="rounded-3xl border p-5 md:p-6" style={{ backgroundColor: T.card, borderColor: T.border }}>
                <div className="flex gap-3">
                  <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(220,232,247,0.95)" }}>
                    <UserCheck size={20} style={{ color: T.blue }} />
                  </div>
                  <p className="text-[15px] leading-7 font-medium" style={{ color: T.text }}>
                    Soldier Hub is an independent, unofficial community platform. It is not affiliated with, endorsed by, sponsored by, or controlled by the U.S. Department of Defense, the U.S. Army, Fort Bliss, or any government agency.
                  </p>
                </div>
              </div>

              {sections.map((section) => (
                <Section key={section.title} {...section} />
              ))}

              <div className="rounded-3xl border p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={{ background: "linear-gradient(135deg, rgba(220,232,247,0.95), rgba(253,254,255,0.98), rgba(253,236,240,0.75))", borderColor: "#BCD0EA" }}>
                <div>
                  <div className="text-lg font-bold" style={{ color: T.navy }}>
                    Need the Terms of Use?
                  </div>
                  <p className="mt-1 text-sm" style={{ color: T.textMuted }}>
                    Review platform rules, safety expectations, moderation, and disclaimers.
                  </p>
                </div>
                <Link href="/terms" className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold" style={{ background: "linear-gradient(135deg, #071B33 0%, #1E4E8C 100%)", color: "#FFFFFF" }}>
                  Terms of Use
                  <ExternalLink size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    </AppShell>
  );
}
