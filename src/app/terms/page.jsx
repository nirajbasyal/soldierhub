import { AlertTriangle, FileText, Flag, Gavel, ShieldAlert } from "lucide-react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

const EFFECTIVE_DATE = "May 16, 2026";

const quickLinks = [
  { label: "Personal capacity", href: "#personal-capacity" },
  { label: "No official use", href: "#no-official-use" },
  { label: "Eligibility", href: "#eligibility-and-accounts" },
  { label: "OPSEC protection", href: "#opsec-protection" },
  { label: "DMCA", href: "#dmca-copyright" },
  { label: "Legal terms", href: "#governing-law" },
];

const sections = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    body: [
      "These Terms of Use govern your access to and use of Soldier Hub, including our website, app, posts, comments, profiles, resources, verification tools, marketplace features, reports, follow and unfollow features, moderation tools, notifications, and related services.",
      "By creating an account, checking an acceptance box, accessing, or using Soldier Hub, you agree to these Terms and acknowledge our Privacy Policy. If you do not agree, do not use Soldier Hub."
    ]
  },
  {
    id: "personal-capacity",
    title: "2. Personal Capacity Notice",
    body: [
      "Soldier Hub is a privately developed, independently operated community platform. It was created on personal time using personal funds, personal equipment, and non-government resources.",
      "Any founder, operator, admin, moderator, or contributor military service, if mentioned anywhere, is provided only as personal background and does not imply endorsement, sponsorship, approval, review, or control by the U.S. Government, the U.S. Department of Defense, the U.S. Army, any military installation, command, or unit."
    ],
    footer: "Soldier Hub is not an official military communication system. It must not be used for official reporting, command communication, emergency requests, OPSEC-sensitive information, or any purpose requiring an official government channel.",
    tone: "danger"
  },
  {
    id: "no-official-use",
    title: "3. Not an Official Government or Military Platform",
    body: [
      "Soldier Hub is privately operated and independent. Soldier Hub is not owned, operated, reviewed, approved, sponsored, controlled, or endorsed by the U.S. Government, the U.S. Department of Defense, the U.S. Army, any military installation, command, or unit.",
      "References to military installations, military life, ranks, units, benefits, resources, gate information, BAH, AFT, or government websites are provided for community discussion and informational convenience only. Such references do not imply government endorsement of Soldier Hub or Soldier Hub endorsement of any government entity."
    ],
    tone: "danger"
  },
  {
    id: "emergency-command-legal-medical",
    title: "4. No Emergency, Command, Legal, Medical, or Official Use",
    body: [
      "Soldier Hub must not be used for emergencies or official military reporting. If you have an emergency, call 911 or contact the appropriate emergency service, military police desk, medical service, crisis line, command representative, SHARP, EO, legal assistance office, housing office, or official agency.",
      "Soldier Hub does not provide legal, financial, medical, mental health, command, security, housing, benefits, or official military advice. Information posted by users is community content and may be incomplete, outdated, wrong, unsafe, or based on personal opinion."
    ],
    tone: "danger"
  },
  {
    id: "eligibility-and-accounts",
    title: "5. Eligibility and Accounts",
    body: [
      "Soldier Hub accounts and interactive features are intended only for users who are 18 years of age or older. You may not create an account, post, comment, follow users, use marketplace features, submit profile information, or otherwise interact with the platform if you are under 18.",
      "You are responsible for your account, login credentials, profile, posts, comments, listings, reports, and all activity under your account. You agree to provide accurate information and to keep your account secure.",
      "We may approve, deny, limit, suspend, revoke, delete, or terminate any account at our discretion, including accounts that appear fake, unsafe, abusive, misleading, inactive, unverifiable, or harmful to the community."
    ],
    tone: "danger"
  },
  {
    id: "verification",
    title: "6. Verification",
    body: [
      "Soldier Hub may offer verified access for certain users. Verification is used only to manage platform access and community trust. It is not an official confirmation of military status, rank, employment, unit assignment, identity, security clearance, government affiliation, or eligibility for any benefit.",
      "We may request information such as email, phone number, role, base selection, or other details to review an account. Providing false, misleading, unauthorized, or impersonated information may result in denial, suspension, deletion, or other enforcement action. Verification may be revoked, changed, or removed at any time."
    ]
  },
  {
    id: "user-content",
    title: "7. User Content",
    body: [
      "You are responsible for all content you submit, including posts, comments, profile text, images, reports, marketplace listings, resource suggestions, and messages.",
      "By posting content on Soldier Hub, you give Soldier Hub a worldwide, non-exclusive, royalty-free license to host, store, display, reproduce, modify for formatting, moderate, remove, preserve, and distribute that content as needed to operate, protect, and improve the platform.",
      "You keep ownership of your content, but you are responsible for ensuring you have the right to post it and that your content does not violate law, military rules, privacy rights, intellectual property rights, or these Terms."
    ]
  },
  {
    id: "anonymous-posting",
    title: "8. Anonymous Posting",
    body: [
      "Soldier Hub may allow anonymous posting in limited areas. Anonymous posting may hide your display name from other users, but it does not make your activity anonymous to Soldier Hub, admins, service providers, or lawful requests.",
      "Do not use anonymous posting to harass, threaten, impersonate, disclose private information, spread false information, violate OPSEC, or evade accountability. Soldier Hub may disclose or preserve account information related to anonymous activity when required or permitted by law, safety concerns, OPSEC-related concerns, or platform enforcement."
    ]
  },
  {
    id: "follow-features",
    title: "9. Follow and Unfollow Features",
    body: [
      "Soldier Hub may allow users to follow or unfollow other users for community connection purposes. Following another user does not create any official relationship, endorsement, affiliation, friendship, duty to respond, or military connection.",
      "You may not use follow, unfollow, profile viewing, notifications, or other community features to harass, stalk, intimidate, monitor, impersonate, collect information about, or target another person.",
      "Soldier Hub may limit, disable, remove, or restrict follow-related activity when needed for safety, privacy, moderation, abuse prevention, or platform integrity. Unfollowing a user does not automatically delete prior comments, posts, notifications, reports, logs, or moderation records."
    ]
  },
  {
    id: "prohibited-content",
    title: "10. Prohibited Content and Conduct",
    body: ["You agree not to post, upload, share, promote, request, or engage in:"],
    bullets: [
      "Classified information, controlled unclassified information, OPSEC-sensitive information, troop movement information, deployment details, base security vulnerabilities, gate security procedures, access control weaknesses, or non-public military information.",
      "Threats, harassment, bullying, stalking, hate speech, discriminatory content, sexual exploitation, non-consensual intimate images, graphic violence, or content encouraging harm.",
      "Personal information about another person without permission, including addresses, phone numbers, medical details, family details, identifying photos, private communications, or doxxing.",
      "False information, impersonation, fraud, scams, phishing, spam, deceptive listings, fake reviews, or attempts to mislead users.",
      "Impersonation of a service member, veteran, officer, noncommissioned officer, government employee, installation representative, business, organization, or any other person or entity, including conduct that may violate applicable federal or state laws related to impersonation, official marks, fraud, or false claims of military service.",
      "Illegal goods or services, stolen goods, firearms, ammunition, weapons, explosives, military-issued gear, controlled substances, alcohol, tobacco, prescription drugs, counterfeit goods, restricted items, or any transaction prohibited by law, installation rules, or platform rules.",
      "Content that violates intellectual property rights, privacy rights, publicity rights, contract rights, or other rights.",
      "Attempts to access accounts, systems, data, admin features, source code, or platform infrastructure without authorization.",
      "Automated scraping, bots, spam tools, reverse engineering, unauthorized security testing, or activity that disrupts, burdens, or harms the platform.",
      "Use of Soldier Hub to conduct official military business, issue orders, bypass command channels, collect official reports, or represent government authority."
    ],
    tone: "danger"
  },
  {
    id: "opsec-protection",
    title: "11. OPSEC and Military-Sensitive Information",
    body: [
      "Users must protect operational security, personal safety, and community trust. Do not post information that could expose service members, families, missions, units, facilities, movements, schedules, vulnerabilities, access control procedures, security practices, or other sensitive information.",
      "Soldier Hub may remove content, restrict accounts, preserve records, notify appropriate parties, or report content when we believe content creates a safety, security, legal, OPSEC-related, or community risk. Soldier Hub may cooperate with lawful requests or appropriate safety reviews involving threats, classified information, OPSEC-related issues, illegal activity, or platform misuse."
    ],
    tone: "danger"
  },
  {
    id: "marketplace",
    title: "12. Marketplace and Local Recommendations",
    body: [
      "If marketplace or local recommendation features are available, Soldier Hub only provides a place for users to share or discover information. Soldier Hub is not a party to transactions between users and does not guarantee any item, seller, buyer, business, service, price, quality, safety, legality, payment, delivery, refund, or outcome.",
      "Soldier Hub does not process payments, provide escrow, handle shipping, provide buyer protection, provide seller protection, inspect items, verify ownership, collect taxes, or guarantee transactions. Users are responsible for complying with all applicable laws, installation rules, tax obligations, consumer protection rules, and safety practices.",
      "Meet safely, verify items, avoid scams, use secure payment judgment, and do not buy or sell prohibited items. All transactions on or near military installations must comply with applicable installation rules and local law."
    ]
  },
  {
    id: "resources-links",
    title: "13. Resources and External Links",
    body: [
      "Soldier Hub may provide links to public resources, official websites, local services, businesses, maps, weather, housing resources, benefit resources, BAH information, AFT tools, gate information, or community information. These links and tools are provided for convenience only.",
      "Soldier Hub does not control external websites and is not responsible for their accuracy, availability, security, privacy practices, content, products, or services. The appearance of external links does not constitute endorsement by Soldier Hub or endorsement of Soldier Hub by the linked website, the U.S. Government, the U.S. Department of Defense, the U.S. Army, any military installation, command, or unit."
    ]
  },
  {
    id: "dmca-copyright",
    title: "14. Copyright and DMCA Policy",
    body: [
      "Soldier Hub respects intellectual property rights and expects users to do the same. You may not post content that infringes another person’s copyright, trademark, or other intellectual property rights.",
      "If you believe content on Soldier Hub infringes your copyright, you may send a copyright notice to support@soldierhub.com with enough information to identify the copyrighted work, the allegedly infringing content, your contact information, a statement that you have a good-faith belief the use is unauthorized, a statement that the information is accurate, and your physical or electronic signature.",
      "If your content was removed because of a copyright notice and you believe the removal was a mistake, you may contact support@soldierhub.com with a counter-notification. Soldier Hub may remove repeat infringers and may update this section with registered DMCA agent details after designation through the U.S. Copyright Office."
    ]
  },
  {
    id: "moderation",
    title: "15. Moderation and Enforcement",
    body: [
      "Soldier Hub may review, moderate, edit for formatting, hide, restrict, label, remove, preserve, or report content at any time. We may also warn, limit, suspend, revoke, block, delete, or ban accounts at our discretion.",
      "We are not required to monitor all content and cannot guarantee that all harmful, inaccurate, offensive, illegal, infringing, or prohibited content will be removed immediately. Users should report concerning content through available reporting tools or contact support@soldierhub.com."
    ]
  },
  {
    id: "admins",
    title: "16. Admins and Platform Decisions",
    body: [
      "Admins may review pending users, reports, resources, account status, content, social connection abuse, copyright issues, and platform safety issues. Admin decisions are made for platform safety and community management. Admin approval does not create any official status, government recognition, employment relationship, fiduciary duty, or legal right to use Soldier Hub."
    ]
  },
  {
    id: "intellectual-property",
    title: "17. Intellectual Property",
    body: [
      "Soldier Hub, including its name, branding, design, layout, features, original text, graphics, and software, is owned by Soldier Hub or its licensors. You may not copy, modify, distribute, sell, or exploit Soldier Hub materials except as allowed by these Terms or with written permission.",
      "You must not use official government seals, Army logos, military insignia, unit patches, protected trademarks, or other marks in a way that suggests endorsement, sponsorship, approval, official connection, or government authority."
    ]
  },
  {
    id: "privacy",
    title: "18. Privacy",
    body: ["Your use of Soldier Hub is also governed by our Privacy Policy. Please review it to understand how we collect, use, share, retain, and protect information."]
  },
  {
    id: "accessibility",
    title: "19. Accessibility",
    body: [
      "Soldier Hub aims to provide a usable and accessible experience. If you experience difficulty accessing any part of the platform or have accessibility feedback, contact support@soldierhub.com so we can review the issue."
    ]
  },
  {
    id: "disclaimers",
    title: "20. Disclaimers",
    body: [
      "Soldier Hub is provided “as is” and “as available.” We do not guarantee that the platform will be accurate, secure, uninterrupted, error-free, current, available, or free of harmful content.",
      "We do not guarantee the accuracy of posts, comments, resources, gate information, BAH estimates, AFT score estimates, weather, housing tips, marketplace listings, recommendations, follower or following lists, social connections, or any other content. Always verify important information through official sources."
    ],
    tone: "danger"
  },
  {
    id: "liability",
    title: "21. Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, Soldier Hub and its owners, operators, admins, moderators, service providers, and affiliates will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of data, profits, goodwill, safety, opportunity, reputation, or other intangible losses related to your use of or inability to use the platform.",
      "To the fullest extent permitted by law, Soldier Hub’s total aggregate liability for any claim related to the platform will not exceed the greater of $100 USD or the amount you paid Soldier Hub, if any, in the 12 months before the event giving rise to the claim. Some jurisdictions do not allow certain limitations of liability, so some limitations may not apply to you."
    ]
  },
  {
    id: "indemnity",
    title: "22. Indemnity",
    body: [
      "To the extent permitted by law, you agree to defend, indemnify, and hold harmless Soldier Hub, its owners, operators, admins, moderators, service providers, affiliates, and agents from and against any claim, demand, loss, liability, damage, judgment, settlement, cost, or expense, including reasonable attorneys’ fees, arising out of or related to your content, your conduct, your violation of these Terms, your misuse of Soldier Hub, your violation of law, your transaction with another user, or your violation of another person’s rights."
    ]
  },
  {
    id: "governing-law",
    title: "23. Governing Law and Venue",
    body: [
      "These Terms and any dispute related to Soldier Hub will be governed by the laws of the State of Texas, without regard to conflict-of-law rules. To the extent a claim is not subject to another valid dispute process or cannot be brought in small claims court, you and Soldier Hub agree that the state and federal courts located in El Paso County, Texas will be the exclusive venue for disputes related to Soldier Hub, unless applicable law requires otherwise."
    ]
  },
  {
    id: "notices",
    title: "24. Notices",
    body: [
      "Soldier Hub may provide notices by email, in-app message, website posting, account notification, or other reasonable method. You may send legal, privacy, safety, copyright, accessibility, or policy notices to support@soldierhub.com.",
      "You are responsible for keeping your account email current so that you can receive important notices."
    ]
  },
  {
    id: "changes",
    title: "25. Changes to These Terms",
    body: [
      "We may update these Terms from time to time. The updated version will be posted on this page with a new effective date. For material changes, we may provide additional notice, such as email notice, in-app notice, or a request to review and accept updated terms where appropriate. Your continued use of Soldier Hub after changes are posted means you accept the updated Terms."
    ]
  },
  {
    id: "general-provisions",
    title: "26. General Provisions",
    body: [
      "If any part of these Terms is found invalid or unenforceable, the remaining parts will remain in effect. Soldier Hub’s failure to enforce any provision is not a waiver of its right to enforce that provision later.",
      "These Terms, together with the Privacy Policy and any additional terms presented for specific features, are the entire agreement between you and Soldier Hub regarding the platform.",
      "You may not assign or transfer your rights or obligations under these Terms without Soldier Hub’s written permission. Soldier Hub may assign or transfer these Terms in connection with a merger, acquisition, reorganization, sale of assets, change of control, or platform transfer.",
      "Provisions that by their nature should survive termination will survive, including sections related to user content licenses, intellectual property, disclaimers, limitation of liability, indemnity, governing law, notices, and general provisions.",
      "Soldier Hub will not be responsible for delay or failure to perform due to causes beyond its reasonable control, including natural disasters, war, terrorism, labor disputes, internet or hosting failures, cyberattacks, government actions, power outages, or other force majeure events."
    ]
  },
  {
    id: "contact-us",
    title: "27. Contact Us",
    body: ["For questions about these Terms, privacy requests, copyright concerns, accessibility feedback, safety concerns, or policy issues, contact support@soldierhub.com."]
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
      noticeText="Soldier Hub is an independent, unofficial community platform. It is not affiliated with, endorsed by, sponsored by, or controlled by the U.S. Government, the U.S. Department of Defense, the U.S. Army, any military installation, command, or unit. Soldier Hub is not an official military communication system."
      contactLabel="Contact support"
      sections={sections}
      crossLinkTitle="Need the Privacy Policy?"
      crossLinkBody="Review what information Soldier Hub collects, uses, shares, retains, and protects."
      crossLinkHref="/privacy"
      crossLinkLabel="Privacy Policy"
    />
  );
}
