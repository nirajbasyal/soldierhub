"use client";

import { T } from "@/lib/theme";

const currentYear = new Date().getFullYear();

export default function Footer() {
  return (
    <footer
      role="contentinfo"
      className="mt-10 border-t px-4 py-6 text-center"
      style={{ borderColor: T.borderSoft, backgroundColor: T.surfaceSoft }}
    >
      <p
        className="mx-auto max-w-2xl text-xs leading-relaxed"
        style={{ color: T.textSecondary }}
      >
        <strong>Soldier Hub is unofficial.</strong> It is independently operated and
        is not affiliated with, endorsed by, or sponsored by the U.S. Army, the
        Department of Defense, Fort Bliss, or any government agency. Do not post
        classified information, controlled unclassified information (CUI), troop
        movements, or other operationally sensitive details.
      </p>
      <p className="mt-3 text-xs" style={{ color: T.textMuted }}>
        <a href="/terms" className="hover:underline" style={{ color: T.blue }}>
          Terms of Use
        </a>
        <span className="mx-2" aria-hidden="true">·</span>
        <a href="/privacy" className="hover:underline" style={{ color: T.blue }}>
          Privacy Policy
        </a>
        <span className="mx-2" aria-hidden="true">·</span>
        <span>© {currentYear} Soldier Hub</span>
      </p>
    </footer>
  );
}
