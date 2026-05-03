"use client";

import Link from "next/link";
import Image from "next/image";
import { T } from "@/lib/theme";

export default function Footer() {
  return (
    <footer
      className="mt-10 md:mt-14 pt-8 pb-5 border-t"
      style={{ borderColor: T.border }}
    >
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Image
            src="/brand/soldierhub-icon.png"
            alt="SoldierHub logo"
            width={28}
            height={28}
            className="rounded-lg"
            priority={false}
          />

          <span
            className="text-xs font-semibold tracking-wider uppercase"
            style={{ color: T.navy }}
          >
            Soldier Hub
          </span>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: T.textSubtle }}>
          Independent and unofficial. Not affiliated with, endorsed by,
          sponsored by, or controlled by Department of War or the U.S.
          Army.{" "}
        </p>

        <div
          className="mt-6 pt-5 border-t flex items-center justify-center gap-8"
          style={{ borderColor: T.borderSoft }}
        >
          <Link
            href="/privacy"
            className="text-sm transition-opacity hover:opacity-75"
            style={{ color: T.textMuted }}
          >
            Privacy Policy
          </Link>

          <Link
            href="/terms"
            className="text-sm transition-opacity hover:opacity-75"
            style={{ color: T.textMuted }}
          >
            Terms of Use
          </Link>
        </div>
      </div>
    </footer>
  );
}
