import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
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
  title: "Terms of Use · Soldier Hub",
  description:
    "Terms of Use for Soldier Hub, an independent unofficial community platform.",
};

export default function TermsOfUsePage() {
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
              <FileText size={17} style={{ color: T.gold }} />
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
              Terms of Use
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
              any government agency. Soldier Hub is not an official military
              communication system.
            </p>
          </div>

          <Section title="1. Acceptance of Terms">
            <p>
              These Terms of Use govern your access to and use of Soldier Hub,
              including our website, app, posts, comments, profiles, resources,
              verification tools, marketplace features, reports, moderation
              tools, and related services.
            </p>
            <p>
              By accessing or using Soldier Hub, you agree to these Terms. If
              you do not agree, do not use Soldier Hub.
            </p>
          </Section>

          <Section title="2. Not an Official Government or Military Platform">
            <p>
              Soldier Hub is privately operated and independent. Soldier Hub is
              not owned, operated, reviewed, approved, sponsored, controlled, or
              endorsed by the U.S. Government, the U.S. Department of Defense,
              the U.S. Army, Fort Bliss, or any military installation.
            </p>
            <p>
              References to military installations, military life, ranks, units,
              benefits, resources, or government websites are provided for
              community discussion and informational convenience only. Such
              references do not imply government endorsement of Soldier Hub or
              Soldier Hub endorsement of any government entity.
            </p>
          </Section>

          <Section title="3. No Emergency, Command, Legal, Medical, or Official Use">
            <p>
              Soldier Hub must not be used for emergencies or official military
              reporting. If you have an emergency, call 911 or contact the
              appropriate emergency service, military police desk, medical
              service, crisis line, command representative, or official agency.
            </p>
            <p>
              Soldier Hub does not provide legal, financial, medical, mental
              health, command, security, housing, benefits, or official military
              advice. Information posted by users is community content and may
              be incomplete, outdated, wrong, or based on personal opinion.
            </p>
          </Section>

          <Section title="4. Eligibility and Accounts">
            <p>
              You must be at least 13 years old to use Soldier Hub. If you are
              under the age of majority where you live, you may use Soldier Hub
              only with permission from a parent or legal guardian.
            </p>
            <p>
              You are responsible for your account, login credentials, profile,
              posts, comments, listings, reports, and all activity under your
              account. You agree to provide accurate information and to keep
              your account secure.
            </p>
            <p>
              We may approve, deny, limit, suspend, delete, or terminate any
              account at our discretion, including accounts that appear fake,
              unsafe, abusive, misleading, inactive, unverifiable, or harmful to
              the community.
            </p>
          </Section>

          <Section title="5. Verification">
            <p>
              Soldier Hub may offer verified access for certain users. Verification
              is used only to manage platform access and community trust. It is
              not an official confirmation of military status, rank, employment,
              unit assignment, identity, security clearance, or government
              affiliation.
            </p>
            <p>
              We may request information such as email, military email, phone
              number, role, base selection, or other details to review an
              account. Providing false or misleading information may result in
              denial, suspension, or deletion.
            </p>
          </Section>

          <Section title="6. User Content">
            <p>
              You are responsible for all content you submit, including posts,
              comments, profile text, images, reports, marketplace listings,
              resource suggestions, and messages.
            </p>
            <p>
              By posting content on Soldier Hub, you give Soldier Hub a
              worldwide, non-exclusive, royalty-free license to host, store,
              display, reproduce, modify for formatting, moderate, remove, and
              distribute that content as needed to operate and improve the
              platform.
            </p>
            <p>
              You keep ownership of your content, but you are responsible for
              ensuring you have the right to post it.
            </p>
          </Section>

          <Section title="7. Prohibited Content and Conduct">
            <p>You agree not to post, upload, share, promote, or engage in:</p>
            <BulletList
              items={[
                "Classified information, controlled unclassified information, OPSEC-sensitive information, troop movement information, deployment details, base security vulnerabilities, gate security procedures, or non-public military information.",
                "Threats, harassment, bullying, stalking, hate speech, discriminatory content, sexual exploitation, graphic violence, or content encouraging harm.",
                "Personal information about another person without permission, including addresses, phone numbers, medical details, family details, workplace details, identifying photos, or private communications.",
                "False information, impersonation, fraud, scams, phishing, spam, deceptive listings, or attempts to mislead users.",
                "Illegal goods or services, stolen goods, weapons transactions, controlled substances, counterfeit goods, or any transaction prohibited by law or platform rules.",
                "Content that violates intellectual property rights, privacy rights, publicity rights, contract rights, or other rights.",
                "Attempts to access accounts, systems, data, admin features, or platform infrastructure without authorization.",
                "Automated scraping, bots, spam tools, reverse engineering, security testing without permission, or activity that disrupts the platform.",
                "Use of Soldier Hub to conduct official military business, issue orders, bypass command channels, or represent government authority.",
              ]}
            />
          </Section>

          <Section title="8. OPSEC and Military-Sensitive Information">
            <p>
              Users must protect operational security and personal safety. Do
              not post information that could expose service members, families,
              missions, units, facilities, movements, schedules, vulnerabilities,
              access control procedures, security practices, or other sensitive
              information.
            </p>
            <p>
              Soldier Hub may remove content, restrict accounts, preserve
              records, or report content when we believe content creates a
              safety, security, legal, or OPSEC concern.
            </p>
          </Section>

          <Section title="9. Marketplace and Local Recommendations">
            <p>
              If marketplace or local recommendation features are available,
              Soldier Hub only provides a place for users to share or discover
              information. Soldier Hub is not a party to transactions between
              users and does not guarantee any item, seller, buyer, business,
              service, price, quality, safety, legality, or outcome.
            </p>
            <p>
              Users are responsible for complying with all applicable laws,
              installation rules, tax obligations, consumer protection rules,
              and safety practices. Meet safely, verify items, avoid scams, and
              use good judgment.
            </p>
          </Section>

          <Section title="10. Resources and External Links">
            <p>
              Soldier Hub may provide links to public resources, official
              websites, local services, businesses, maps, weather, housing
              resources, benefit resources, or community information. These
              links are provided for convenience only.
            </p>
            <p>
              Soldier Hub does not control external websites and is not
              responsible for their accuracy, availability, security, privacy
              practices, content, products, or services. The appearance of
              external links does not constitute endorsement by Soldier Hub or
              endorsement of Soldier Hub by the linked website, the U.S.
              Government, the U.S. Department of Defense, the U.S. Army, or Fort
              Bliss.
            </p>
          </Section>

          <Section title="11. Moderation and Enforcement">
            <p>
              Soldier Hub may review, moderate, edit for formatting, hide,
              restrict, remove, or preserve content at any time. We may also
              warn, limit, suspend, block, delete, or ban accounts at our
              discretion.
            </p>
            <p>
              We are not required to monitor all content and cannot guarantee
              that all harmful, inaccurate, offensive, or prohibited content
              will be removed immediately. Users should report concerning
              content through available reporting tools.
            </p>
          </Section>

          <Section title="12. Admins and Platform Decisions">
            <p>
              Admins may review pending users, reports, resources, account
              status, and platform safety issues. Admin decisions are made for
              platform safety and community management. Admin approval does not
              create any official status, government recognition, employment
              relationship, or legal right to use Soldier Hub.
            </p>
          </Section>

          <Section title="13. Intellectual Property">
            <p>
              Soldier Hub, including its name, branding, design, layout,
              features, original text, graphics, and software, is owned by
              Soldier Hub or its licensors. You may not copy, modify, distribute,
              sell, or exploit Soldier Hub materials except as allowed by these
              Terms or with written permission.
            </p>
            <p>
              You must not use official government seals, Army logos, military
              insignia, unit patches, protected trademarks, or other marks in a
              way that suggests endorsement, sponsorship, approval, or official
              connection.
            </p>
          </Section>

          <Section title="14. Privacy">
            <p>
              Your use of Soldier Hub is also governed by our{" "}
              <Link href="/privacy" style={{ color: T.navy }}>
                Privacy Policy
              </Link>
              . Please review it to understand how we collect, use, and protect
              information.
            </p>
          </Section>

          <Section title="15. Disclaimers">
            <p>
              Soldier Hub is provided “as is” and “as available.” We do not
              guarantee that the platform will be accurate, secure,
              uninterrupted, error-free, current, or available at all times.
            </p>
            <p>
              We do not guarantee the accuracy of posts, comments, resources,
              gate information, BAH estimates, weather, housing tips,
              marketplace listings, recommendations, or any other content.
              Always verify important information through official sources.
            </p>
          </Section>

          <Section title="16. Limitation of Liability">
            <p>
              To the fullest extent permitted by law, Soldier Hub and its
              owners, operators, admins, moderators, service providers, and
              affiliates will not be liable for indirect, incidental, special,
              consequential, exemplary, or punitive damages, or for loss of
              data, loss of profits, personal injury, property damage, disputes
              between users, reliance on user content, or actions taken based on
              information found on Soldier Hub.
            </p>
          </Section>

          <Section title="17. Indemnification">
            <p>
              You agree to defend, indemnify, and hold harmless Soldier Hub and
              its owners, operators, admins, moderators, service providers, and
              affiliates from claims, damages, losses, liabilities, costs, and
              expenses arising from your use of Soldier Hub, your content, your
              violation of these Terms, your violation of law, or your violation
              of another person’s rights.
            </p>
          </Section>

          <Section title="18. Account Suspension, Removal, and Termination">
            <p>
              We may suspend, restrict, delete, or terminate your account or
              access to Soldier Hub at any time, with or without notice, if we
              believe it is necessary to protect users, enforce these Terms,
              comply with law, prevent abuse, or protect the platform.
            </p>
            <p>
              You may stop using Soldier Hub at any time. You may request
              account deletion by contacting{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: T.navy }}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="19. Changes to These Terms">
            <p>
              We may update these Terms from time to time. If we make material
              changes, we may provide notice through the platform, by email, or
              by updating the effective date. Your continued use of Soldier Hub
              after changes means you accept the updated Terms.
            </p>
          </Section>

          <Section title="20. Governing Law">
            <p>
              These Terms are governed by the laws of the United States and, to
              the extent applicable, the laws of the state where Soldier Hub is
              operated, without regard to conflict-of-law rules. Some rights may
              vary depending on your location.
            </p>
          </Section>

          <Section title="21. Contact">
            <p>
              For questions about these Terms, account issues, deletion
              requests, or safety concerns, contact:
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