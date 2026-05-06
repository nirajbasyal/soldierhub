import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Flag,
  Gavel,
  Mail,
  ShieldAlert,
} from "lucide-react";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";

const EFFECTIVE_DATE = "May 3, 2026";
const CONTACT_EMAIL = "support@soldierhub.com";

const quickLinks = [
  { label: "No official use", href: "#no-official-use" },
  { label: "Eligibility and verification", href: "#eligibility-and-accounts" },
  { label: "User content rules", href: "#user-content" },
  { label: "OPSEC protection", href: "#opsec-protection" },
  { label: "Moderation", href: "#moderation" },
  { label: "Disclaimers", href: "#disclaimers" },
];

const sections = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    body: [
      "These Terms of Use govern your access to and use of Soldier Hub, including our website, app, posts, comments, profiles, resources, verification tools, marketplace features, reports, moderation tools, and related services.",
      "By accessing or using Soldier Hub, you agree to these Terms. If you do not agree, do not use Soldier Hub.",
    ],
  },
  {
    id: "no-official-use",
    title: "2. Not an Official Government or Military Platform",
    body: [
      "Soldier Hub is privately operated and independent. Soldier Hub is not owned, operated, reviewed, approved, sponsored, controlled, or endorsed by the U.S. Government, the U.S. Department of Defense, the U.S. Army, Fort Bliss, or any military installation.",
      "References to military installations, military life, ranks, units, benefits, resources, or government websites are provided for community discussion and informational convenience only. Such references do not imply government endorsement of Soldier Hub or Soldier Hub endorsement of any government entity.",
    ],
  },
  {
    id: "emergency-command-legal-medical",
    title: "3. No Emergency, Command, Legal, Medical, or Official Use",
    body: [
      "Soldier Hub must not be used for emergencies or official military reporting. If you have an emergency, call 911 or contact the appropriate emergency service, military police desk, medical service, crisis line, command representative, or official agency.",
      "Soldier Hub does not provide legal, financial, medical, mental health, command, security, housing, benefits, or official military advice. Information posted by users is community content and may be incomplete, outdated, wrong, or based on personal opinion.",
    ],
  },
  {
    id: "eligibility-and-accounts",
    title: "4. Eligibility and Accounts",
    body: [
      "You must be at least 13 years old to use Soldier Hub. If you are under the age of majority where you live, you may use Soldier Hub only with permission from a parent or legal guardian.",
      "You are responsible for your account, login credentials, profile, posts, comments, listings, reports, and all activity under your account. You agree to provide accurate information and to keep your account secure.",
      "We may approve, deny, limit, suspend, delete, or terminate any account at our discretion, including accounts that appear fake, unsafe, abusive, misleading, inactive, unverifiable, or harmful to the community.",
    ],
  },
  {
    id: "verification",
    title: "5. Verification",
    body: [
      "Soldier Hub may offer verified access for certain users. Verification is used only to manage platform access and community trust. It is not an official confirmation of military status, rank, employment, unit assignment, identity, security clearance, or government affiliation.",
      "We may request information such as email, military email, phone number, role, base selection, or other details to review an account. Providing false or misleading information may result in denial, suspension, or deletion.",
    ],
  },
  {
    id: "user-content",
    title: "6. User Content",
    body: [
      "You are responsible for all content you submit, including posts, comments, profile text, images, reports, marketplace listings, resource suggestions, and messages.",
      "By posting content on Soldier Hub, you give Soldier Hub a worldwide, non-exclusive, royalty-free license to host, store, display, reproduce, modify for formatting, moderate, remove, and distribute that content as needed to operate and improve the platform.",
      "You keep ownership of your content, but you are responsible for ensuring you have the right to post it.",
    ],
  },
  {
    id: "prohibited-content",
    title: "7. Prohibited Content and Conduct",
    body: ["You agree not to post, upload, share, promote, or engage in:"],
    bullets: [
      "Classified information, controlled unclassified information, OPSEC-sensitive information, troop movement information, deployment details, base security vulnerabilities, gate security procedures, or non-public military information.",
      "Threats, harassment, bullying, stalking, hate speech, discriminatory content, sexual exploitation, graphic violence, or content encouraging harm.",
      "Personal information about another person without permission, including addresses, phone numbers, medical details, family details, identifying photos, or private communications.",
      "False information, impersonation, fraud, scams, phishing, spam, deceptive listings, or attempts to mislead users.",
      "Illegal goods or services, stolen goods, weapons transactions, controlled substances, counterfeit goods, or any transaction prohibited by law or platform rules.",
      "Content that violates intellectual property rights, privacy rights, publicity rights, contract rights, or other rights.",
      "Attempts to access accounts, systems, data, admin features, or platform infrastructure without authorization.",
      "Automated scraping, bots, spam tools, reverse engineering, security testing without permission, or activity that disrupts the platform.",
      "Use of Soldier Hub to conduct official military business, issue orders, bypass command channels, or represent government authority.",
    ],
  },
  {
    id: "opsec-protection",
    title: "8. OPSEC and Military-Sensitive Information",
    body: [
      "Users must protect operational security and personal safety. Do not post information that could expose service members, families, missions, units, facilities, movements, schedules, vulnerabilities, access control procedures, security practices, or other sensitive information.",
      "Soldier Hub may remove content, restrict accounts, preserve records, or report content when we believe content creates a safety, security, legal, or OPSEC concern.",
    ],
  },
  {
    id: "marketplace",
    title: "9. Marketplace and Local Recommendations",
    body: [
      "If marketplace or local recommendation features are available, Soldier Hub only provides a place for users to share or discover information. Soldier Hub is not a party to transactions between users and does not guarantee any item, seller, buyer, business, service, price, quality, safety, legality, or outcome.",
      "Users are responsible for complying with all applicable laws, installation rules, tax obligations, consumer protection rules, and safety practices. Meet safely, verify items, avoid scams, and use good judgment.",
    ],
  },
  {
    id: "resources-links",
    title: "10. Resources and External Links",
    body: [
      "Soldier Hub may provide links to public resources, official websites, local services, businesses, maps, weather, housing resources, benefit resources, or community information. These links are provided for convenience only.",
      "Soldier Hub does not control external websites and is not responsible for their accuracy, availability, security, privacy practices, content, products, or services. The appearance of external links does not constitute endorsement by Soldier Hub or endorsement of Soldier Hub by the linked website, the U.S. Government, the U.S. Department of Defense, the U.S. Army, or Fort Bliss.",
    ],
  },
  {
    id: "moderation",
    title: "11. Moderation and Enforcement",
    body: [
      "Soldier Hub may review, moderate, edit for formatting, hide, restrict, remove, or preserve content at any time. We may also warn, limit, suspend, block, delete, or ban accounts at our discretion.",
      "We are not required to monitor all content and cannot guarantee that all harmful, inaccurate, offensive, or prohibited content will be removed immediately. Users should report concerning content through available reporting tools.",
    ],
  },
  {
    id: "admins",
    title: "12. Admins and Platform Decisions",
    body: [
      "Admins may review pending users, reports, resources, account status, and platform safety issues. Admin decisions are made for platform safety and community management. Admin approval does not create any official status, government recognition, employment relationship, or legal right to use Soldier Hub.",
    ],
  },
  {
    id: "intellectual-property",
    title: "13. Intellectual Property",
    body: [
      "Soldier Hub, including its name, branding, design, layout, features, original text, graphics, and software, is owned by Soldier Hub or its licensors. You may not copy, modify, distribute, sell, or exploit Soldier Hub materials except as allowed by these Terms or with written permission.",
      "You must not use official government seals, Army logos, military insignia, unit patches, protected trademarks, or other marks in a way that suggests endorsement, sponsorship, approval, or official connection.",
    ],
  },
  {
    id: "privacy",
    title: "14. Privacy",
    body: ["Your use of Soldier Hub is also governed by our Privacy Policy. Please review it to understand how we collect, use, and protect information."],
  },
  {
    id: "disclaimers",
    title: "15. Disclaimers",
    body: [
      "Soldier Hub is provided “as is” and “as available.” We do not guarantee that the platform will be accurate, secure, uninterrupted, error-free, current, or available at all times.",
      "We do not guarantee the accuracy of posts, comments, resources, gate information, BAH estimates, weather, housing tips, marketplace listings, recommendations, or any other content. Always verify important information through official sources.",
    ],
  },
  {
    id: "liability",
    title: "16. Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, Soldier Hub and its owners, operators, admins, moderators, service providers, and affiliates will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of data, profits, goodwill, safety, opportunity, or other intangible losses related to your use of the platform.",
    ],
  },
  {
    id: "changes",
    title: "17. Changes to These Terms",
    body: ["We may update these Terms from time to time. The updated version will be posted on this page with a new effective date. Your continued use of Soldier Hub after changes are posted means you accept the updated Terms."],
  },
  {
    id: "contact-us",
    title: "18. Contact Us",
    body: ["For questions about these Terms, contact us at support@soldierhub.com."],
  },
];

function HeroStat({ icon: Icon, title, body }) {
  return (
    <div className="rounded-2xl border p-4" style={{ background: "rgba(255,255,255,0.78)", borderColor: "rgba(188,208,234,0.85)" }}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(220,232,247,0.95)" }}>
          <Icon size={18} style={{ color: T.blue }} strokeWidth={2.2} />
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: T.navy }}>{title}</div>
          <div className="mt-1 text-xs leading-relaxed" style={{ color: T.textMuted }}>{body}</div>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, body = [], bullets }) {
  return (
    <section id={id} className="rounded-3xl border p-5 md:p-6 scroll-mt-28" style={{ backgroundColor: T.card, borderColor: T.border, boxShadow: "0 12px 30px rgba(7, 27, 51, 0.05)" }}>
      <h2 className="text-lg md:text-xl font-bold leading-snug" style={{ color: T.navy }}>{title}</h2>
      <div className="mt-3 space-y-3 text-[14px] md:text-[15px] leading-7" style={{ color: T.textMuted }}>
        {body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
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
      </div>
    </section>
  );
}

export const metadata = {
  title: "Terms of Use · Soldier Hub",
  description: "Terms of Use for Soldier Hub, an independent unofficial community platform.",
};

export default function TermsOfUsePage() {
  return (
    <AppShell hideNav>
      <main className="min-h-screen pb-16 scroll-smooth" style={{ background: "radial-gradient(circle at top left, rgba(220,232,247,0.85), transparent 32%), linear-gradient(180deg, #F4F8FD 0%, #FFFFFF 48%, #F4F8FD 100%)" }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5" style={{ backgroundColor: "rgba(255,255,255,0.86)", borderColor: "#D5E2F2", color: T.navy }}>
            <ArrowLeft size={16} />
            Back to Soldier Hub
          </Link>

          <section className="mt-6 rounded-[32px] border overflow-hidden relative" style={{ borderColor: "#BCD0EA", background: "linear-gradient(135deg, rgba(220,232,247,0.96) 0%, rgba(253,254,255,0.98) 52%, rgba(253,236,240,0.9) 100%)", boxShadow: "0 22px 60px rgba(7,27,51,0.08)" }}>
            <div className="absolute left-0 top-0 h-full w-2 bg-[#B31942]" />
            <div className="absolute right-0 top-0 h-full w-2 bg-[#1E4E8C]" />
            <div className="p-6 md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2", color: T.blue }}>
                <FileText size={15} />
                Soldier Hub Terms
              </div>
              <div className="mt-5 grid lg:grid-cols-[1fr_320px] gap-6 items-end">
                <div>
                  <h1 className="text-4xl md:text-6xl font-extrabold tracking-[-0.04em] leading-[0.95]" style={{ color: T.navy }}>Terms of Use</h1>
                  <p className="mt-4 max-w-2xl text-base md:text-lg leading-8" style={{ color: T.textMuted }}>Platform rules for safe community use, responsible posting, OPSEC protection, moderation, and unofficial status.</p>
                  <p className="mt-3 text-sm font-semibold" style={{ color: T.text }}>Effective date: {EFFECTIVE_DATE}</p>
                </div>
                <div className="rounded-3xl border p-4" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2" }}>
                  <div className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: T.textSubtle }}>Key rules</div>
                  <div className="mt-3 grid gap-2">
                    <HeroStat icon={ShieldAlert} title="Not official" body="Do not use Soldier Hub for command, emergency, or official reporting." />
                    <HeroStat icon={Flag} title="Protect OPSEC" body="Never share sensitive military, mission, security, or movement details." />
                    <HeroStat icon={Gavel} title="Moderation applies" body="Unsafe, misleading, or prohibited content may be restricted or removed." />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-6 grid lg:grid-cols-[280px_1fr] gap-5 items-start">
            <aside className="lg:sticky lg:top-24 rounded-3xl border p-4" style={{ backgroundColor: "rgba(255,255,255,0.86)", borderColor: T.border }}>
              <div className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: T.textSubtle }}>Page guide</div>
              <nav className="mt-3 grid gap-2" aria-label="Terms page sections">
                {quickLinks.map((item) => (
                  <a key={item.href} href={item.href} className="rounded-2xl px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-sm" style={{ backgroundColor: "rgba(244,248,253,0.95)", color: T.navy }}>
                    {item.label}
                  </a>
                ))}
              </nav>
              <a href={`mailto:${CONTACT_EMAIL}`} className="mt-4 flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold" style={{ background: "linear-gradient(135deg, #071B33 0%, #1E4E8C 100%)", color: "#FFFFFF" }}>
                <Mail size={16} />
                Contact support
              </a>
            </aside>

            <div className="grid gap-4">
              <div className="rounded-3xl border p-5 md:p-6" style={{ backgroundColor: T.card, borderColor: T.border }}>
                <div className="flex gap-3">
                  <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(220,232,247,0.95)" }}>
                    <AlertTriangle size={20} style={{ color: "#B31942" }} />
                  </div>
                  <p className="text-[15px] leading-7 font-medium" style={{ color: T.text }}>Soldier Hub is an independent, unofficial community platform. It is not affiliated with, endorsed by, sponsored by, or controlled by the U.S. Department of Defense, the U.S. Army, Fort Bliss, or any government agency. Soldier Hub is not an official military communication system.</p>
                </div>
              </div>

              {sections.map((section) => <Section key={section.id} {...section} />)}

              <div className="rounded-3xl border p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={{ background: "linear-gradient(135deg, rgba(220,232,247,0.95), rgba(253,254,255,0.98), rgba(253,236,240,0.75))", borderColor: "#BCD0EA" }}>
                <div>
                  <div className="text-lg font-bold" style={{ color: T.navy }}>Need the Privacy Policy?</div>
                  <p className="mt-1 text-sm" style={{ color: T.textMuted }}>Review what information Soldier Hub collects, uses, shares, and protects.</p>
                </div>
                <Link href="/privacy" className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold" style={{ background: "linear-gradient(135deg, #071B33 0%, #1E4E8C 100%)", color: "#FFFFFF" }}>
                  Privacy Policy
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
