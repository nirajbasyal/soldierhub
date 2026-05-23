import { BadgeCheck } from "lucide-react";

export default function ProfileVerifiedBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center ${className}`}
      aria-label="Verified profile"
      title="Verified profile"
    >
      <BadgeCheck size={18} fill="#3B82F6" stroke="#FFFFFF" strokeWidth={2.6} />
    </span>
  );
}
