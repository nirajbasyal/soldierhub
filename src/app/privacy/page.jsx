import { Database, EyeOff, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

const EFFECTIVE_DATE = "May 16, 2026";

const quickLinks = [
  { label: "Information we collect", href: "#information-we-collect" },
  { label: "Social connections", href: "#social-connections" },
  { label: "How we use information", href: "#how-we-use-information" },
  { label: "How we share information", href: "#how-we-share-information" },
  { label: "State privacy rights", href: "#state-privacy-rights" },
  { label: "Privacy choices", href: "#privacy-requests" },
];

const sections = [
  {
    id: "purpose",
    title: "1. Purpose of this Privacy Policy",
    body: [
      "This Privacy Policy explains how Soldier Hub collects, uses, stores, shares, and protects information when you use our website, app, community features, resource pages, verification features, posts, comments, reports, follow and unfollow features, marketplace features, moderation tools, or related services.",
      "By creating an account, using Soldier Hub, or continuing to access the platform, you acknowledge this Privacy Policy. If you do not agree with how information is handled, do not create an account or use the platform."
    ]
  },
  {
    id: "personal-capacity",
    title: "2. Personal Capacity and Independent Platform Notice",
    body: [
      "Soldier Hub is a privately developed, independently operated community platform. It was created on personal time using personal funds, personal equipment, and non-government resources.",
      "Any founder, operator, admin, moderator, or contributor military service, if mentioned anywhere, is provided only as personal background and does not imply endorsement, sponsorship, approval, review, or control by the U.S. Government, the U.S. Department of Defense, the U.S. Army, any military installation, command, or unit."
    ],
    footer: "Soldier Hub is not an official military communication system and must not be used for official reporting, command communication, emergency requests, OPSEC-sensitive information, or any purpose requiring an official government channel.",
    tone: "danger"
  },
  {
    id: "age-restriction",
    title: "3. Age Restriction",
    body: [
      "Soldier Hub accounts and interactive features are intended only for users who are 18 years of age or older. You may not create an account, post, comment, follow users, use marketplace features, submit profile information, or otherwise interact with the platform if you are under 18.",
      "Public tools or public informational pages may be viewable without an account, but account creation and community participation are limited to adults."
    ],
    tone: "danger"
  },
  {
    id: "information-we-collect",
    title: "4. Information We Collect",
    body: ["We may collect the following categories of information depending on how you use Soldier Hub:"],
    bullets: [
      "Account information, such as your name, email address, login identifier, base/community selection, profile information, avatar, account status, and verification status.",
      "Authentication information handled through our authentication provider, such as login identifiers, authentication records, session data, password reset records, and related account-security data.",
      "Optional verification information, such as personal email, phone number, role, unit-related information you voluntarily provide, or other information needed to review account eligibility and community access.",
      "User-generated content, such as posts, comments, reports, profile text, resource suggestions, marketplace listings, images, and any other content you submit.",
      "Community activity information, such as likes, upvotes, comments, reports, moderation history, verification status, blocked status, admin actions, and notification-related activity.",
      "Social connection information, such as users you follow, users who follow you, follow and unfollow actions, follower and following counts, and related notification activity.",
      "Technical and usage information, such as IP address, device type, browser type, operating system, approximate location derived from your device or network, log data, cookies, browser storage, session data, and similar usage information.",
      "Communication information, such as messages you send to us, feedback, support requests, verification requests, safety reports, copyright notices, and emails related to account or platform safety."
    ],
    footer: "Do not submit classified information, controlled unclassified information, sensitive mission information, medical information, financial account information, Social Security numbers, military orders, CAC images, passwords, or any information you are not authorized to share.",
    tone: "danger"
  },
  {
    id: "what-not-to-post",
    title: "5. Information You Should Not Post",
    body: ["Soldier Hub is a community platform, not an official reporting system. You are responsible for what you post. You must not post:"],
    bullets: [
      "Classified information, controlled unclassified information, OPSEC-sensitive information, deployment details, troop movement details, gate security procedures, access control vulnerabilities, or non-public military information.",
      "Personal information about another person without permission, including phone numbers, addresses, medical details, family details, workplace details, identifying information, or private communications.",
      "Threats, harassment, hate speech, illegal content, scams, fraud, impersonation, sexual exploitation, non-consensual intimate images, or content that encourages harm.",
      "Emergency requests that require immediate police, fire, medical, command, crisis, SHARP, EO, law enforcement, or official agency response."
    ],
    tone: "danger"
  },
  {
    id: "how-we-use-information",
    title: "6. How We Use Information",
    body: ["We use information to operate, protect, and improve Soldier Hub, including to:"],
    bullets: [
      "Create, maintain, authenticate, and secure user accounts.",
      "Review and manage account verification, pending review, rejection, suspension, revocation, or account status.",
      "Display posts, comments, resources, marketplace listings, profiles, notifications, and community activity.",
      "Show follower and following lists, support profile and community connection features, send related notifications, personalize community activity, prevent abuse, and protect platform safety.",
      "Moderate content, investigate reports, detect abuse, remove prohibited content, and enforce our Terms of Use.",
      "Send account, security, verification, password reset, policy, copyright, support, and platform-related communications.",
      "Improve Soldier Hub features, design, performance, reliability, safety, and user experience.",
      "Prevent fraud, spam, unauthorized access, impersonation, harassment, scraping, and misuse.",
      "Respond to safety, security, OPSEC-related, legal, or government requests when required or permitted by law."
    ]
  },
  {
    id: "verification",
    title: "7. Verification and Military Community Features",
    body: [
      "Soldier Hub may use personal email, phone number, base selection, role information, or other information you voluntarily provide to review whether an account should receive verified access. Verification is a platform access decision only.",
      "Verification does not confirm official military status, security clearance, rank, unit assignment, employment, identity, eligibility for benefits, or any legal, official, or government status. Soldier Hub does not issue government credentials and does not replace official military systems, command channels, installation offices, military police, emergency services, housing offices, legal assistance offices, or family support programs. Verification may be denied, revoked, or changed at any time."
    ]
  },
  {
    id: "social-connections",
    title: "8. Follow, Unfollow, and Social Connections",
    body: [
      "Soldier Hub may allow users to follow or unfollow other users for community connection purposes. Your profile, follower count, following count, and follower or following lists may be visible to other users depending on the feature design, your account status, and platform settings.",
      "Unfollowing a user does not automatically delete prior posts, comments, notifications, reports, logs, moderation records, or other information that may be retained for platform safety, legal compliance, account records, or community integrity."
    ]
  },
  {
    id: "moderation-and-automation",
    title: "9. Moderation, Safety Review, and Automated Tools",
    body: [
      "Soldier Hub may use manual review, automated tools, filters, third-party services, or other safety systems to help detect spam, abuse, prohibited content, OPSEC concerns, unsafe content, copyright issues, or policy violations.",
      "Automated systems may make mistakes. Admins may review reports and take action based on platform safety, user protection, legal compliance, or community integrity."
    ]
  },
  {
    id: "how-we-share-information",
    title: "10. How We Share Information",
    body: ["We may share information in limited situations:"],
    bullets: [
      "With service providers that help us operate the platform, such as hosting, database, authentication, storage, email, analytics, moderation, security, or support providers.",
      "With other users when you choose to post, comment, create a profile, follow users, create follow connections, list an item, or otherwise submit content or activity visible to the community.",
      "With admins or moderators who need access to review verification, reports, safety issues, account status, social connection abuse, copyright issues, or platform misuse.",
      "With law enforcement, courts, government authorities, emergency responders, installation officials, or other parties when required by law or when we believe disclosure is necessary to protect safety, rights, property, users, OPSEC-related concerns, or platform security.",
      "With a successor organization if Soldier Hub is involved in a merger, acquisition, reorganization, transfer, financing, or sale of assets, subject to this Privacy Policy or a replacement notice."
    ],
    footer: "We do not sell your personal information. We do not knowingly share personal information for cross-context behavioral advertising.",
    tone: "danger"
  },
  {
    id: "third-party-services",
    title: "11. Third-Party Services and External Links",
    body: [
      "Soldier Hub may use or link to third-party services such as hosting, authentication, databases, storage, email, maps, weather information, analytics, moderation tools, public resources, local services, official websites, or community resources. These may include providers such as Supabase, Vercel, email delivery providers, analytics providers, security providers, public weather services, and other operational tools, depending on the current platform setup.",
      "These third-party websites and services are not controlled by Soldier Hub. Their own privacy policies and terms apply. The appearance of external links does not mean Soldier Hub endorses those websites or that those websites, the U.S. Government, the U.S. Department of Defense, the U.S. Army, any military installation, command, or unit endorses Soldier Hub."
    ]
  },
  {
    id: "community-information",
    title: "12. Weather, BAH, Gate, Resource, and Community Information",
    body: [
      "Soldier Hub may display public information such as weather, local time, gate hours, BAH estimates, resource links, AFT calculator information, and community guidance. This information is provided for convenience only and may be delayed, incomplete, outdated, or incorrect.",
      "Always verify important information through official sources, your chain of command, installation offices, official government websites, or other authoritative sources before making decisions."
    ]
  },
  {
    id: "cookies",
    title: "13. Cookies and Similar Technologies",
    body: [
      "We may use cookies, browser storage, session storage, local storage, and similar technologies to keep you signed in, remember preferences, improve performance, protect accounts, maintain feed experience, and understand platform usage.",
      "You can control cookies through your browser settings. Some parts of Soldier Hub may not work properly if cookies or browser storage are disabled."
    ]
  },
  {
    id: "security-and-retention",
    title: "14. Data Security",
    body: [
      "We use reasonable administrative, technical, and organizational safeguards designed to protect information. However, no website, app, database, network, or online service is completely secure. You use Soldier Hub at your own risk.",
      "You are responsible for protecting your login credentials, using a strong password, keeping your email secure, and not sharing sensitive information through the platform."
    ]
  },
  {
    id: "data-retention",
    title: "15. Data Retention",
    body: [
      "We keep information for as long as reasonably necessary to operate Soldier Hub, provide services, maintain account records, enforce rules, resolve disputes, comply with legal obligations, prevent abuse, and maintain platform safety.",
      "When you request account deletion, we will review and process the request within a reasonable period unless retention is required or permitted for security, moderation, legal compliance, dispute resolution, fraud prevention, platform integrity, backups, or protection of other users. Deleted content, unfollow actions, removed connections, or account records may remain in backups, logs, moderation records, security records, or legal records for a limited period where necessary."
    ]
  },
  {
    id: "data-breach",
    title: "16. Data Breach Notice",
    body: [
      "If Soldier Hub becomes aware of a data security incident that requires notice under applicable law, we will notify affected users, regulators, or other required parties as required by applicable law."
    ]
  },
  {
    id: "privacy-requests",
    title: "17. Account Deletion and Privacy Requests",
    body: [
      "You may request account deletion, correction, access, or other privacy help by contacting us at support@soldierhub.com.",
      "We may need to verify your identity before processing a request. Some information may be retained if required or permitted for security, moderation, legal compliance, dispute resolution, fraud prevention, platform integrity, or protection of other users."
    ]
  },
  {
    id: "state-privacy-rights",
    title: "18. U.S. State Privacy Rights",
    body: [
      "Depending on where you live and whether applicable law applies to Soldier Hub, you may have rights to request access to, correction of, deletion of, portability of, or information about certain personal information. You may also have rights to opt out of certain sales, sharing, targeted advertising, or profiling where applicable law requires those rights.",
      "Soldier Hub does not sell personal information and does not knowingly share personal information for cross-context behavioral advertising. To submit a privacy request, contact support@soldierhub.com. We will review requests based on applicable law, identity verification, platform safety, and legal requirements."
    ]
  },
  {
    id: "childrens-privacy",
    title: "19. Children’s Privacy",
    body: [
      "Soldier Hub accounts and interactive features are not directed to children or minors. Users under 18 may not create accounts, post, comment, follow users, use marketplace features, or submit profile information. We do not knowingly collect personal information from children under 13. If you believe a child or minor has provided personal information, contact us at support@soldierhub.com so we can review and take appropriate action."
    ]
  },
  {
    id: "international-users",
    title: "20. International Users",
    body: [
      "Soldier Hub is operated for users in the United States. If you use Soldier Hub from outside the United States, you understand that your information may be processed in the United States or other locations where our service providers operate."
    ]
  },
  {
    id: "changes",
    title: "21. Changes to this Privacy Policy",
    body: [
      "We may update this Privacy Policy from time to time. The updated version will be posted on this page with a new effective date. For material changes, we may provide additional notice, such as email notice, in-app notice, or a request to review updated terms where appropriate. Your continued use of Soldier Hub after changes are posted means you acknowledge the updated Privacy Policy."
    ]
  },
  {
    id: "contact-us",
    title: "22. Contact Us",
    body: ["For privacy questions, deletion requests, safety concerns, copyright concerns, accessibility feedback, or policy questions, contact support@soldierhub.com."]
  },
];

export const metadata = {
  title: "Privacy Policy · Soldier Hub",
  description: "Privacy Policy for Soldier Hub, an independent unofficial community platform for military community information and support."
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      eyebrow="Soldier Hub Privacy"
      heroIcon={ShieldCheck}
      title="Privacy Policy"
      intro="Clear guidance on what Soldier Hub collects, how it is used, how privacy requests work, and what users should never share on the platform."
      effectiveDate={EFFECTIVE_DATE}
      quickTitle="Privacy basics"
      quickStats={[
        { icon: EyeOff, title: "Do not post sensitive info", body: "No OPSEC, classified, medical, financial, CAC, orders, or mission-sensitive data.", tone: "danger" },
        { icon: LockKeyhole, title: "Security matters", body: "We use safeguards, but no online platform is completely risk-free." },
        { icon: Database, title: "No sale of personal info", body: "Soldier Hub does not sell personal information or knowingly share it for behavioral ads." },
      ]}
      quickLinks={quickLinks}
      noticeIcon={UserCheck}
      noticeText="Soldier Hub is an independent, unofficial community platform. It is not affiliated with, endorsed by, sponsored by, or controlled by the U.S. Government, the U.S. Department of Defense, the U.S. Army, any military installation, command, or unit."
      contactLabel="Contact privacy"
      sections={sections}
      crossLinkTitle="Need the Terms of Use?"
      crossLinkBody="Review platform rules, safety expectations, moderation, disclaimers, and unofficial status."
      crossLinkHref="/terms"
      crossLinkLabel="Terms of Use"
    />
  );
}
