import Image from "next/image";
import Link from "next/link";

export default function BrandLogo({ variant = "nav", href = "/" }) {
  const sizeClass =
    variant === "footer"
      ? "h-16 sm:h-20"
      : variant === "mobile"
      ? "h-10"
      : "h-11 sm:h-14";

  return (
    <Link href={href} className="inline-flex items-center shrink-0">
      <Image
        src="/brand/soldierhub-logo.png"
        alt="SoldierHub"
        width={472}
        height={190}
        priority={variant === "nav"}
        className={`${sizeClass} w-auto object-contain`}
      />
    </Link>
  );
}