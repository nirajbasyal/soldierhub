import { Database, EyeOff, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

const EFFECTIVE_DATE = "May 16, 2026";

const quickLinks = [
  { label: "Information we collect", href: "#information-we-collect" },
  { label: "Social connections", href: "#social-connections" },
  { label: "What not to post", href: "#what-not-to-post" },
  { label: "How we use information", href: "#how-we-use-information" },
  { label: "How we share information", href: "#how-we-share-information" },
  { label: "Privacy choices", href: "#privacy-requests" },
];

const sections = [
  {
    id: "purpose",
    title: "1. Purpose of this Privacy Policy",
    body: [
      "This Privacy Policy explains how Soldier Hub collects, uses, stores, shares, and protects information when you use our website, app, community features, resource pages, verification features, posts, comments, reports, follow and unfollow features, marketplace features, moderation tools, or related services.",
      "By using Soldier Hub, you acknowledge this Privacy Policy. If you do not agree with how information is handled, do not create an account or use the platform."
    ]
  },
  {
    id: "information-we-collect",
    title: "2. Information We Collect",
    body: ["We may collect the following categories of information depending on how you use Soldier Hub:"],
    bullets: [
      "Account information, such as your name, email address, login information, base/community selection, profile information, avatar, account status, and verification status.",
      "Optional verification information, such as personal email, phone number, role, unit-related information you voluntarily provide, or other information needed to review account eligibility and community access.",
      "User-generated content, such as posts, comments, reports, profile text, resource suggestions, marketplace listings, images, and any other content you submit.",
      "Community activity information, such as likes, upvotes, comments, reports, moderation history, verification status, blocked status, admin actions, and notification-related activity.",
      "Social connection information, such as users you follow, users who follow you, follow and unfollow actions, follower and following counts, and related notification activity.",
      "Technical and usage information, such as IP address, device type, browser type, operating system, approximate location derived from your device or network, log data, cookies, browser storage, session data, and similar usage information.",
      "Communication information, such as messages you send to us, feedback, support requests, verification requests, safety reports, and emails related to account or platform safety."
    ],
    footer: "Do not submit classified information, controlled unclassified information, sensitive mission information, medical information, financial account information, Social Security numbers, military orders, CAC images, passwords, or any information you are not authorized to share.",
    tone: "danger"
  },
  {
    id: "what-not-to-post",
    title: "3. Information You Should Not Post",
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
    title: "4. How We Use Information",
    body: ["We use information to operate, protect, and improve Soldier Hub, including to:"],
    bullets: [
      "Create, maintain, authenticate, and secure user accounts.",
      "Review and manage account verification, pending review, rejection, suspension, or account status.",
      "Display posts, comments, resources, marketplace listings, profiles, notifications, and community activity.",
      "Show follower and following lists, support profile and community connection features, send related notifications, personalize community activity, prevent abuse, and protect platform safety.",
      "Moderate content, investigate reports, detect abuse, remove prohibited content, and enforce our Terms of Use.",
      "Send account, security, verification, password reset, and platform-related communications.",
      "Improve Soldier Hub features, design, performance, reliability, safety, and user experience.",
      "Prevent fraud, spam, unauthorized access, impersonation, harassment, scraping, and misuse.",
      "Comply with legal obligations, court orders, law enforcement requests, or government requests when required by law."
    ]
  },
  {
    id: "verification",
    title: "5. Verification and Military Community Features",
    body: [
      "Soldier Hub may use personal email, phone number, base selection, role information, or other information you voluntarily provide to review whether an account should receive verified access. Verification is a platform access decision only.",
      "Verification does not confirm official military status, security clearance, rank, unit assignment, employment, identity, eligibility for benefits, or any legal, official, or government status. Soldier Hub does not issue government credentials and does not replace official military systems, command channels, installation offices, military police, emergency services, housing offices, legal assistance offices, or family support programs."
    ]
  },
  {
    id: "social-connections",
    title: "6. Follow, Unfollow, and Social Connections",
    body: [
      "Soldier Hub may allow users to follow or unfollow other users for community connection purposes. Your profile, follower count, following count, and follower or following lists may be visible to other users depending on the feature design, your account status, and platform settings.",
      "Unfollowing a user does not automatically delete prior posts, comments, notifications, reports, logs, moderation records, or other information that may be retained for platform safety, legal compliance, account records, or community integrity."
    ]
  },
  {
    id: "moderation-and-automation",
    title: "7. Moderation, Safety Review, and Automated Tools",
    body: [
      "Soldier Hub may use manual review, automated tools, filters, third-party services, or other safety systems to help detect spam, abuse, prohibited content, OPSEC concerns, unsafe content, or policy violations.",
      "Automated systems may make mistakes. Admins may review reports and take action based on platform safety, user protection, legal compliance, or community integrity."
    ]
  },
  {
    id: "how-we-share-information",
    title: "8. How We Share Information",
    body: ["We may share information in limited situations:"],
    bullets: [
      "With service providers that help us operate the platform, such as hosting, database, authentication, storage, email, analytics, moderation, security, or support providers.",
      "With other users when you choose to post, comment, create a profile, follow users, create follow connections, list an item, or otherwise submit content or activity visible to the community.",
      "With admins or moderators who need access to review verification, reports, safety issues, account status, social connection abuse, or platform misuse.",
      "With law enforcement, courts, government authorities, emergency responders, or other parties when required by law or when we believe disclosure is necessary to protect safety, rights, property, users, or platform security.",
      "With a successor organization if Soldier Hub is involved in a merger, acquisition, reorganization, transfer, financing, or sale of assets, subject to this Privacy Policy or a replacement notice."
    ],
    footer: "We do not sell your personal information. We do not knowingly share personal information for cross-context behavioral advertising.",
    tone: "danger"
  },
  {
    id: "third-party-services",
    title: "9. Third-Party Services and External Links",
    body: [
      "Soldier Hub may use or link to third-party services such as hosting, authentication, databases, email, maps, weather information, analytics, moderation tools, public resources, local services, official websites, or community resources. These third-party websites and services are not controlled by Soldier Hub. Their own privacy policies and terms apply.",
      "The appearance of external links does not mean Soldier Hub endorses those websites or that those websites, the U.S. Government, the U.S. Department of Defense, the U.S. Army, Fort Bliss, or any other installation endorses Soldier Hub."
    ]
  },
  {
    id: "community-information",
    title: "10. Weather, BAH, Gate, Resource, and Community Information",
    body: [
      "Soldier Hub may display public information such as weather, local time, gate hours, BAH estimates, resource links, and community guidance. This information is provided for convenience only and may be delayed, incomplete, outdated, or incorrect.",
      "Always verify important information through official sources, your chain of command, installation offices, official government websites, or other authoritative sources before making decisions."
    ]
  },
  {
    id: "cookies",
    title: "11. Cookies and Similar Technologies",
    body: [
      "We may use cookies, browser storage, session storage, local storage, and similar technologies to keep you signed in, remember preferences, improve performance, protect accounts, maintain feed experience, and understand platform usage.",
      "You can control cookies through your browser settings. Some parts of Soldier Hub may not work properly if cookies or browser storage are disabled."
    ]
  },
  {
    id: "security-and-retention",
    title: "12. Data Security",
    body: [
      "We use reasonable administrative, technical, and organizational safeguards designed to protect information. However, no website, app, database, network, or online service is completely secure. You use Soldier Hub at your own risk.",
      "You are responsible for protecting your login credentials, using a strong password, keeping your email secure, and not sharing sensitive information through the platform."
    ]
  },
  {
    id: "data-retention",
    title: "13. Data Retention",
    body: [
      "We keep information for as long as reasonably necessary to operate Soldier Hub, provide services, maintain account records, enforce rules, resolve disputes, comply with legal obligations, prevent abuse, and maintain platform safety.",
      "Deleted content, unfollow actions, or removed connections may remain in backups, logs, moderation records, security records, or legal records for a limited period where necessary. We may also retain records related to banned accounts, reports, rejected accounts, fraud, or abuse to protect the platform and users."
    ]
  },
  {
    id: "privacy-requests",
    title: "14. Account Deletion and Privacy Requests",
    body: [
      "You may request account deletion, correction, access, or other privacy help by contacting us at support@soldierhub.com.",
      "We may need to verify your identity before processing a request. Some information may be retained if required for security, moderation, legal compliance, dispute resolution, fraud prevention, platform integrity, or protection of other users."
    ]
  },
  {
    id: "california-privacy-rights",
    title: "15. California and Other Privacy Rights",
    body: [
      "Depending on where you live and whether applicable law applies to Soldier Hub, you may have rights to request access to, correction of, deletion of, portability of, or information about certain personal information. You may also have the right to know whether personal information is sold or shared for certain advertising purposes.",
      "Soldier Hub does not sell personal information and does not knowingly share personal information for cross-context behavioral advertising. To submit a privacy request, contact support@soldierhub.com. We will review requests based on applicable law and platform safety requirements."
    ]
  },
  {
    id: "childrens-privacy",
    title: "16. Children’s Privacy",
    body: [
      "Soldier Hub is not directed to children under 13 years old. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided personal information, contact us at support@soldierhub.com so we can review and take appropriate action."
    ]
  },
  {
    id: "international-users",
    title: "17. International Users",
    body: [
      "Soldier Hub is operated for users in the United States. If you use Soldier Hub from outside the United States, you understand that your information may be processed in the United States or other locations where our service providers operate."
    ]
  },
  {
    id: "changes",
    title: "18. Changes to this Privacy Policy",
    body: [
      "We may update this Privacy Policy from time to time. The updated version will be posted on this page with a new effective date. Your continued use of Soldier Hub after changes are posted means you acknowledge the updated Privacy Policy."
    ]
  },
  {
    id: "contact-us",
    title: "19. Contact Us",
    body: ["For privacy questions, deletion requests, safety concerns, or policy questions, contact support@soldierhub.com."]
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
      noticeText="Soldier Hub is an independent, unofficial community platform. It is not affiliated with, endorsed by, sponsored by, or controlled by the U.S. Department of Defense, the U.S. Army, Fort Bliss, or any government agency."
      contactLabel="Contact privacy"
      sections={sections}
      crossLinkTitle="Need the Terms of Use?"
      crossLinkBody="Review platform rules, safety expectations, moderation, disclaimers, and unofficial status."
      crossLinkHref="/terms"
      crossLinkLabel="Terms of Use"
    />
  );
}
