import { AlertTriangle, FileText, Flag, Gavel, ShieldAlert } from "lucide-react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

const EFFECTIVE_DATE = "May 3, 2026";

const quickLinks = [
  { label: "No official use", href: "#no-official-use" },
  { label: "Eligibility and verification", href: "#eligibility-and-accounts" },
  { label: "User content rules", href: "#user-content" },
  { label: "OPSEC protection", href: "#opsec-protection" },
  { label: "Moderation", href: "#moderation" },
  { label: "Disclaimers", href: "#disclaimers" },
];

const sections = [
  { id: "acceptance", title: "1. Acceptance of Terms", body: ["These Terms of Use govern your access to and use of Soldier Hub, including our website, app, posts, comments, profiles, resources, verification tools, marketplace features, reports, moderation tools, and related services.", "By accessing or using Soldier Hub, you agree to these Terms. If you do not agree, do not use Soldier Hub."] },
  { id: "no-official-use", title: "2. Not an Official Government or Military Platform", body: ["Soldier Hub is privately operated and independent. Soldier Hub is not owned, operated, reviewed, approved, sponsored, controlled, or endorsed by the U.S. Government, the U.S. Department of Defense, the U.S. Army, Fort Bliss, or any military installation.", "References to military installations, military life, ranks, units, benefits, resources, or government websites are provided for community discussion and informational convenience only. Such references do not imply government endorsement of Soldier Hub or Soldier Hub endorsement of any government entity."] },
  { id: "emergency-command-legal-medical", title: "3. No Emergency, Command, Legal, Medical, or Official Use", body: ["Soldier Hub must not be used for emergencies or official military reporting. If you have an emergency, call 911 or contact the appropriate emergency service, military police desk, medical service, crisis line, command representative, or official agency.", "Soldier Hub does not provide legal, financial, medical, mental health, command, security, housing, benefits, or official military advice. Information posted by users is community content and may be incomplete, outdated, wrong, or based on personal opinion."] },
  { id: "eligibility-and-accounts", title: "4. Eligibility and Accounts", body: ["You must be at least 13 years old to use Soldier Hub. If you are under the age of majority where you live, you may use Soldier Hub only with permission from a parent or legal guardian.", "You are responsible for your account, login credentials, profile, posts, comments, listings, reports, and all activity under your account. You agree to provide accurate information and to keep your account secure.", "We may approve, deny, limit, suspend, delete, or terminate any account at our discretion, including accounts that appear fake, unsafe, abusive, misleading, inactive, unverifiable, or harmful to the community."] },
  { id: "verification", title: "5. Verification", body: ["Soldier Hub may offer verified access for certain users. Verification is used only to manage platform access and community trust. It is not an official confirmation of military status, rank, employment, unit assignment, identity, security clearance, or government affiliation.", "We may request information such as email, military email, phone number, role, base selection, or other details to review an account. Providing false or misleading information may result in denial, suspension, or deletion."] },
  { id: "user-content", title: "6. User Content", body: ["You are responsible for all content you submit, including posts, comments, profile text, images, reports, marketplace listings, resource suggestions, and messages.", "By posting content on Soldier Hub, you give Soldier Hub a worldwide, non-exclusive, royalty-free license to host, store, display, reproduce, modify for formatting, moderate, remove, and distribute that content as needed to operate and improve the platform.", "You keep ownership of your content, but you are responsible for ensuring you have the right to post it."] },
  { id: "prohibited-content", title: "7. Prohibited Content and Conduct", body: ["You agree not to post, upload, share, promote, or engage in:"], bullets: ["Classified information, controlled unclassified information, OPSEC-sensitive information, troop movement information, deployment details, base security vulnerabilities, gate security procedures, or non-public military information.", "Threats, harassment, bullying, stalking, hate speech, discriminatory content, sexual exploitation, graphic violence, or content encouraging harm.", "Personal information about another person without permission, including addresses, phone numbers, medical details, family details, identifying photos, or private communications.", "False information, impersonation, fraud, scams, phishing, spam, deceptive listings, or attempts to mislead users.", "Illegal goods or services, stolen goods, weapons transactions, controlled substances, counterfeit goods, or any transaction prohibited by law or platform rules.", "Content that violates intellectual property rights, privacy rights, publicity rights, contract rights, or other rights.", "Attempts to access accounts, systems, data, admin features, or platform infrastructure without authorization.", "Automated scraping, bots, spam tools, reverse engineering, security testing without permission, or activity that disrupts the platform.", "Use of Soldier Hub to conduct official military business, issue orders, bypass command channels, or represent government authority."] },
  { id: "opsec-protection", title: "8. OPSEC and Military-Sensitive Information", body: ["Users must protect operational security and personal safety. Do not post information that could expose service members, families, missions, units, facilities, movements, schedules, vulnerabilities, access control procedures, security practices, or other sensitive information.", "Soldier Hub may remove content, restrict accounts, preserve records, or report content when we believe content creates a safety, security, legal, or OPSEC concern."] },
  { id: "marketplace", title: "9. Marketplace and Local Recommendations", body: ["If marketplace or local recommendation features are available, Soldier Hub only provides a place for users to share or discover information. Soldier Hub is not a party to transactions between users and does not guarantee any item, seller, buyer, business, service, price, quality, safety, legality, or outcome.", "Users are responsible for complying with all applicable laws, installation rules, tax obligations, consumer protection rules, and safety practices. Meet safely, verify items, avoid scams, and use good judgment."] },
  { id: "resources-links", title: "10. Resources and External Links", body: ["Soldier Hub may provide links to public resources, official websites, local services, businesses, maps, weather, housing resources, benefit resources, or community information. These links are provided for convenience only.", "Soldier Hub does not control external websites and is not responsible for their accuracy, availability, security, privacy practices, content, products, or services. The appearance of external links does not constitute endorsement by Soldier Hub or endorsement of Soldier Hub by the linked website, the U.S. Government, the U.S. Department of Defense, the U.S. Army, or Fort Bliss."] },
  { id: "moderation", title: "11. Moderation and Enforcement", body: ["Soldier Hub may review, moderate, edit for formatting, hide, restrict, remove, or preserve content at any time. We may also warn, limit, suspend, block, delete, or ban accounts at our discretion.", "We are not required to monitor all content and cannot guarantee that all harmful, inaccurate, offensive, or prohibited content will be removed immediately. Users should report concerning content through available reporting tools."] },
  { id: "admins", title: "12. Admins and Platform Decisions", body: ["Admins may review pending users, reports, resources, account status, and platform safety issues. Admin decisions are made for platform safety and community management. Admin approval does not create any official status, government recognition, employment relationship, or legal right to use Soldier Hub."] },
  { id: "intellectual-property", title: "13. Intellectual Property", body: ["Soldier Hub, including its name, branding, design, layout, features, original text, graphics, and software, is owned by Soldier Hub or its licensors. You may not copy, modify, distribute, sell, or exploit Soldier Hub materials except as allowed by these Terms or with written permission.", "You must not use official government seals, Army logos, military insignia, unit patches, protected trademarks, or other marks in a way that suggests endorsement, sponsorship, approval, or official connection."] },
  { id: "privacy", title: "14. Privacy", body: ["Your use of Soldier Hub is also governed by our Privacy Policy. Please review it to understand how we collect, use, and protect information."] },
  { id: "disclaimers", title: "15. Disclaimers", body: ["Soldier Hub is provided “as is” and “as available.” We do not guarantee that the platform will be accurate, secure, uninterrupted, error-free, current, or available at all times.", "We do not guarantee the accuracy of posts, comments, resources, gate information, BAH estimates, weather, housing tips, marketplace listings, recommendations, or any other content. Always verify important information through official sources."] },
  { id: "liability", title: "16. Limitation of Liability", body: ["To the fullest extent permitted by law, Soldier Hub and its owners, operators, admins, moderators, service providers, and affiliates will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of data, profits, goodwill, safety, opportunity, or other intangible losses related to your use of the platform."] },
  { id: "changes", title: "17. Changes to These Terms", body: ["We may update these Terms from time to time. The updated version will be posted on this page with a new effective date. Your continued use of Soldier Hub after changes are posted means you accept the updated Terms."] },
  { id: "contact-us", title: "18. Contact Us", body: ["For questions about these Terms, contact us at support@soldierhub.com."] },
];

export const metadata = { title: "Terms of Use · Soldier Hub", description: "Terms of Use for Soldier Hub, an independent unofficial community platform." };

export default function TermsOfUsePage() {
  return (
    <LegalPageLayout
      eyebrow="Soldier Hub Terms"
      heroIcon={FileText}
      title="Terms of Use"
      intro="Platform rules for safe community use, responsible posting, OPSEC protection, moderation, and unofficial status."
      effectiveDate={EFFECTIVE_DATE}
      quickTitle="Key rules"
      quickStats={[
        { icon: ShieldAlert, title: "Not official", body: "Do not use Soldier Hub for command, emergency, or official reporting." },
        { icon: Flag, title: "Protect OPSEC", body: "Never share sensitive military, mission, security, or movement details.", tone: "danger" },
        { icon: Gavel, title: "Moderation applies", body: "Unsafe, misleading, or prohibited content may be restricted or removed." },
      ]}
      quickLinks={quickLinks}
      noticeIcon={AlertTriangle}
      noticeText="Soldier Hub is an independent, unofficial community platform. It is not affiliated with, endorsed by, sponsored by, or controlled by the U.S. Department of Defense, the U.S. Army, Fort Bliss, or any government agency. Soldier Hub is not an official military communication system."
      contactLabel="Contact support"
      sections={sections}
      crossLinkTitle="Need the Privacy Policy?"
      crossLinkBody="Review what information Soldier Hub collects, uses, shares, and protects."
      crossLinkHref="/privacy"
      crossLinkLabel="Privacy Policy"
    />
  );
}
