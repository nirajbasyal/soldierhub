"use client";

import Image from "next/image";
import Link from "next/link";
import { T } from "@/lib/theme";

export default function Footer() {
  return (
    <footer
      className="mt-10 md:mt-14 pt-8 pb-4 border-t"
      style={{ borderColor: T.border }}
    >
      <div className="max-w-md mx-auto px-4 text-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2.5 mb-2"
        >
          <Image
            src="/brand/soldierhub-icon.png"
            alt="SoldierHub"
            width={34}
            height={34}
            className="h-8.5 w-8.5 object-contain"
          />

          <div className="text-left leading-tight">
            <div
              className="text-sm font-semibold"
              style={{ color: T.navy }}
            >
              Soldier Hub
            </div>
            <div
              className="text-[11px] uppercase tracking-wider"
              style={{ color: T.textSubtle }}
            >
              Connect • Share • Support
            </div>
          </div>
        </Link>

        <p
          className="text-xs leading-relaxed"
          style={{ color: T.textSubtle }}
        >
          Soldier Hub is unofficial. Not affiliated with the Department of War.
        </p>
      </div>
    </footer>
  );
}