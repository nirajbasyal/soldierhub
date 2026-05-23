import { Info } from "lucide-react";
import { T } from "@/lib/theme";

export default function ProfileAboutCard({ bio }) {
  const cleanBio = typeof bio === "string" ? bio.trim() : "";

  return (
    <section
      className="mx-4 mt-4 rounded-3xl border px-4 py-3.5 sm:mx-5"
      style={{ backgroundColor: "rgba(244,248,253,0.92)", borderColor: "#D5E2F2" }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#DCE8F7] text-[#1E4E8C]">
          <Info size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black" style={{ color: T.navy }}>
            About
          </h2>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6" style={{ color: cleanBio ? T.text : T.textMuted }}>
            {cleanBio || "Add a short bio so other verified community members know who you are."}
          </p>
        </div>
      </div>
    </section>
  );
}
