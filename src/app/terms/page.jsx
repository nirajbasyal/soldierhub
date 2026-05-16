import { AlertTriangle, FileText, Flag, Gavel, ShieldAlert } from "lucide-react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

const EFFECTIVE_DATE = "May 16, 2026";

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
      "These Terms of Use govern your access to and use of Soldier Hub, including our website, app, posts, comments, profiles, resources, verification tools, marketplace features, reports, moderation tools, notifications, and related services.",
      "By accessing or using Soldier Hub, you agree to these Terms and our Privacy Policy. If you do not agree, do not use Soldier Hub."
    ]
  },
  {
    id: "no-official-use",
    title: "2. Not an Official Government or Military Platform",
    body: [
      "Soldier Hub is privately operated and independent. Soldier Hub is not owned, operated, reviewed, approved, sponsored, controlled, or endorsed by the U.S. Government, the U.S. Department of Defense, the U.S. Army, Fort Bliss, or any military installation.",
      "References to military installations, military life, ranks, units, benefits, resources, gate information, BAH, AFT, or government websites are provided for community discussion and informational convenience only. Such references do not imply government endorsement of Soldier Hub or Soldier Hub endorsement of any government entity."
    ],
    tone: "danger"
  },
  {
    id: "emergency-command-legal-medical",
    title: "3. No Emergency, Command, Legal, Medical, or Official Use",
    body: [
      "Soldier Hub must not be used for emergencies or official military reporting. If you have an emergency, call 911 or contact the appropriate emergency service, military police desk, medical service, crisis line, command representative, SHARP, EO, legal assistance office, housing office, or official agency.",
      "Soldier Hub does not provide legal, financial, medical, mental health, command, security, housing, benefits, or official military advice. Information posted by users is community content and may be incomplete, outdated, wrong, unsafe, or based on personal opinion."
    ],
    tone: "danger"
  },
  {
    id: "eligibility-and-accounts",
    title: "4. Eligibility and Accounts",
    body: [
      "You must be at least 13 years old to use Soldier Hub. If you are under the age of majority where you live, you may use Soldier Hub only with permission from a parent or legal guardian.",
      "You are responsible for your account, login credentials, profile, posts, comments, listings, reports, and all activity under your account. You agree to provide accurate information and to keep your account secure.",
      "We may approve, deny, limit, suspend, revoke, delete, or terminate any account at our discretion, including accounts that appear fake, unsafe, abusive, misleading, inactive, unverifiable, or harmful to the community."
    ]
  },
  {
    id: "verification",
    title: "5. Verification",
    body: [
      "Soldier Hub may offer verified access for certain users. Verification is used only to manage platform access and community trust. It is not an official confirmation of military status, rank, employment, unit assignment, identity, security clearance, government affiliation, or eligibility for any benefit.",
      "We may request information such as email, phone number, role, base selection, or other details to review an account. Providing false, misleading, unauthorized, or impersonated information may result in denial, suspension, deletion, or other enforcement action."
    ]
  },
  {
    id: "user-content",
    title: "6. User Content",
    body: [
      "You are responsible for all content you submit, including posts, comments, profile text, images, reports, marketplace listings, resource suggestions, and messages.",
      "By posting content on Soldier Hub, you give Soldier Hub a worldwide, non-exclusive, royalty-free license to host, store, display, reproduce, modify for formatting, moderate, remove, preserve, and distribute that content as needed to operate, protect, and improve the platform.",
      "You keep ownership of your content, but you are responsible for ensuring you have the right to post it and that your content does not violate law, military rules, privacy rights, intellectual property rights, or these Terms."
    ]
  },
  {
    id: "anonymous-posting",
    title: "7. Anonymous Posting",
    body: [
      "Soldier Hub may allow anonymous posting in limited areas. Anonymous posting may hide your display name from other users, but it does not make your activity anonymous to Soldier Hub, admins, service providers, or lawful requests.",
      "Do not use anonymous posting to harass, threaten, impersonate, disclose private information, spread false information, violate OPSEC, or evade accountability."
    ]
  },
  {
    id: "prohibited-content",
    title: "8. Prohibited Content and Conduct",
    body: ["You agree not to post, upload, share, promote, request, or engage in:"],
    bullets: [
      "Classified information, controlled unclassified information, OPSEC-sensitive information, troop movement information, deployment details, base security vulnerabilities, gate security procedures, access control weaknesses, or non-public military information.",
      "Threats, harassment, bullying, stalking, hate speech, discriminatory content, sexual exploitation, non-consensual intimate images, graphic violence, or content encouraging harm.",
      "Personal information about another person without permission, including addresses, phone numbers, medical details, family details, identifying photos, private communications, or doxxing.",
      "False information, impersonation, fraud, scams, phishing, spam, deceptive listings, fake reviews, or attempts to mislead users.",
      "Illegal goods or services, stolen goods, weapons transactions, controlled substances, counterfeit goods, restricted items, or any transaction prohibited by law, installation rules, or platform rules.",
      "Content that violates intellectual property rights, privacy rights, publicity rights, contract rights, or other rights.",
      "Attempts to access accounts, systems, data, admin features, source code, or platform infrastructure without authorization.",
      "Automated scraping, bots, spam tools, reverse engineering, unauthorized security testing, or activity that disrupts, burdens, or harms the platform.",
      "Use of Soldier Hub to conduct official military business, issue orders, bypass command channels, collect official reports, or represent government authority."
    ],
    tone: "danger"
  },
  {
    id: "opsec-protection",
    title: "9. OPSEC and Military-Sensitive Information",
    body: [
      "Users must protect operational security, personal safety, and community trust. Do not post information that could expose service members, families, missions, units, facilities, movements, schedules, vulnerabilities, access control procedures, security practices, or other sensitive information.",
      "Soldier Hub may remove content, restrict accounts, preserve records, notify appropriate parties, or report content when we believe content creates a safety, security, legal, OPSEC, or community risk."
    ],
    tone: "danger"
  },
  {
    id: "marketplace",
    title: "10. Marketplace and Local Recommendations",
    body: [
      "If marketplace or local recommendation features are available, Soldier Hub only provides a place for users to share or discover information. Soldier Hub is not a party to transactions between users and does not guarantee any item, seller, buyer, business, service, price, quality, safety, legality, payment, delivery, or outcome.",
      "Users are responsible for complying with all applicable laws, installation rules, tax obligations, consumer protection rules, and safety practices. Meet safely, verify items, avoid scams, use secure payment judgment, and do not buy or sell prohibited items."
    ]
  },
  {
    id: "resources-links",
    title: "11. Resources and External Links",
    body: [
      "Soldier Hub may provide links to public resources, official websites, local services, businesses, maps, weather, housing resources, benefit resources, BAH information, AFT tools, gate information, or community information. These links and tools are provided for convenience only.",
      "Soldier Hub does not control external websites and is not responsible for their accuracy, availability, security, privacy practices, content, products, or services. The appearance of external links does not constitute endorsement by Soldier Hub or endorsement of Soldier Hub by the linked website, the U.S. Government, the U.S. Department of Defense, the U.S. Army, Fort Bliss, or any installation."
    ]
  },
  {
    id: "moderation",
    title: "12. Moderation and Enforcement",
    body: [
      "Soldier Hub may review, moderate, edit for formatting, hide, restrict, label, remove, preserve, or report content at any time. We may also warn, limit, suspend, revoke, block, delete, or ban accounts at our discretion.",
      "We are not required to monitor all content and cannot guarantee that all harmful, inaccurate, offensive, illegal, or prohibited content will be removed immediately. Users should report concerning content through available reporting tools or contact support@soldierhub.com."
    ]
  },
  {
    id: "admins",
    title: "13. Admins and Platform Decisions",
    body: [
      "Admins may review pending users, reports, resources, account status, content, and platform safety issues. Admin decisions are made for platform safety and community management. Admin approval does not create any official status, government recognition, employment relationship, fiduciary duty, or legal right to use Soldier Hub."
    ]
  },
  {
    id: "intellectual-property",
    title: "14. Intellectual Property",
    body: [
      "Soldier Hub, including its name, branding, design, layout, features, original text, graphics, and software, is owned by Soldier Hub or its licensors. You may not copy, modify, distribute, sell, or exploit Soldier Hub materials except as allowed by these Terms or with written permission.",
      "You must not use official government seals, Army logos, military insignia, unit patches, protected trademarks, or other marks in a way that suggests endorsement, sponsorship, approval, official connection, or government authority."
    ]
  },
  {
    id: "privacy",
    title: "15. Privacy",
    body: ["Your use of Soldier Hub is also governed by our Privacy Policy. Please review it to understand how we collect, use, share, retain, and protect information."]
  },
  {
    id: "disclaimers",
    title: "16. Disclaimers",
    body: [
      "Soldier Hub is provided “as is” and “as available.” We do not guarantee that the platform will be accurate, secure, uninterrupted, error-free, current, available, or free of harmful content.",
      "We do not guarantee the accuracy of posts, comments, resources, gate information, BAH estimates, AFT score estimates, weather, housing tips, marketplace listings, recommendations, or any other content. Always verify important information through official sources."
    ],
    tone: "danger"
  },
  {
    id: "liability",
    title: "17. Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, Soldier Hub and its owners, operators, admins, moderators, service providers, and affiliates will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of data, profits, goodwill, safety, opportunity, reputation, or other intangible losses related to your use of or inability to use the platform.",
      "Some jurisdictions do not allow certain limitations of liability, so some limitations may not apply to you."
    ]
  },
  {
    id: "indemnity",
    title: "18. User Responsibility and Indemnity",
    body: [
      "To the extent permitted by law, you agree to be responsible for claims, losses, liabilities, damages, costs, and expenses arising from your content, your conduct, your violation of these Terms, your misuse of Soldier Hub, or your violation of another person’s rights."
    ]
  },
  {
    id: "changes",
    title: "19. Changes to These Terms",
    body: [
      "We may update these Terms from time to time. The updated version will be posted on this page with a new effective date. Your continued use of Soldier Hub after changes are posted means you accept the updated Terms."
    ]
  },
  {
    id: "contact-us",
    title: "20. Contact Us",
    body: ["For questions about these Terms, safety concerns, or policy issues, contact support@soldierhub.com."]
  },
];

export const metadata = {
  title: "Terms of Use · Soldier Hub",
  description: "Terms of Use for Soldier Hub, an independent unofficial military community platform."
};

export default function TermsOfUsePage() {
  return (
    <LegalPageLayout
      eyebrow="Soldier Hub Terms"
      heroIcon={FileText}
      title="Terms of Use"
      intro="Platform rules for safe community use, responsible posting, OPSEC protection, moderation, unofficial status, and user accountability."
      effectiveDate={EFFECTIVE_DATE}
      quickTitle="Key rules"
      quickStats={[
        { icon: ShieldAlert, title: "Not official", body: "Do not use Soldier Hub for command, emergency, or official reporting.", tone: "danger" },
        { icon: Flag, title: "Protect OPSEC", body: "Never share sensitive military, mission, security, movement, or access-control details.", tone: "danger" },
        { icon: Gavel, title: "Moderation applies", body: "Unsafe, misleading, illegal, or prohibited content may be restricted or removed." },
      ]}
      quickLinks={quickLinks}
      noticeIcon={AlertTriangle}
      noticeText="Soldier Hub is an independent, unofficial community platform. It is not affiliated with, endorsed by, sponsored by, or controlled by the U.S. Department of Defense, the U.S. Army, Fort Bliss, or any government agency. Soldier Hub is not an official military communication system."
      contactLabel="Contact support"
      sections={sections}
      crossLinkTitle="Need the Privacy Policy?"
      crossLinkBody="Review what information Soldier Hub collects, uses, shares, retains, and protects."
      crossLinkHref="/privacy"
      crossLinkLabel="Privacy Policy"
    />
  );
}
