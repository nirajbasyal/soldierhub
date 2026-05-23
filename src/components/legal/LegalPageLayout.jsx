import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import CircularBackButton from "@/components/ui/CircularBackButton";

function toneColor(tone = "blue") {
  if (tone === "danger" || tone === "red") return "#B31942";
  if (tone === "navy") return T.navy;
  return T.blue;
}

function HeroStat({ icon: Icon, title, body, tone = "blue" }) {
  const color = toneColor(tone);

  return (
    <div
      className="flex items-start gap-3 rounded-[20px] border px-3.5 py-3"
      style={{
        backgroundColor: "rgba(255,255,255,0.92)",
        borderColor: "rgba(207,218,232,0.82)",
      }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: tone === "danger" ? "rgba(179,25,66,0.08)" : "rgba(220,232,247,0.72)" }}
      >
        <Icon size={17} style={{ color }} strokeWidth={2.3} />
      </div>

      <div className="min-w-0">
        <div className="text-sm font-extrabold tracking-[-0.01em]" style={{ color: T.navy }}>
          {title}
        </div>
        <div className="mt-1 text-xs leading-relaxed" style={{ color: T.textMuted }}>
          {body}
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, body = [], bullets, footer, tone = "blue" }) {
  const accentColor = toneColor(tone);

  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-[26px] border bg-white px-5 py-5 md:px-7 md:py-6"
      style={{
        borderColor: "rgba(207,218,232,0.86)",
        boxShadow: "0 12px 30px rgba(11,28,44,0.045)",
      }}
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
        <h2 className="text-lg font-extrabold leading-snug tracking-[-0.02em] md:text-xl" style={{ color: T.navy }}>
          {title}
        </h2>
      </div>

      <div className="space-y-3 text-[14px] leading-7 md:text-[15px]" style={{ color: T.textMuted }}>
        {body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        {bullets ? (
          <ul className="grid gap-2.5 pt-1">
            {bullets.map((item) => (
              <li key={item} className="flex gap-2.5 rounded-2xl bg-[#F7FAFE] px-3 py-2.5">
                <CheckCircle2 size={16} className="mt-1 shrink-0" style={{ color: accentColor }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {footer ? (
          <p
            className="rounded-2xl border px-4 py-3 font-semibold"
            style={{
              backgroundColor: tone === "danger" ? "rgba(179,25,66,0.06)" : "#F7FAFE",
              borderColor: tone === "danger" ? "rgba(179,25,66,0.18)" : "rgba(207,218,232,0.86)",
              color: T.text,
            }}
          >
            {footer}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default function LegalPageLayout({
  eyebrow,
  heroIcon: HeroIcon,
  title,
  intro,
  effectiveDate,
  quickTitle,
  quickStats = [],
  noticeIcon: NoticeIcon,
  noticeText,
  sections = [],
  crossLinkTitle,
  crossLinkBody,
  crossLinkHref,
  crossLinkLabel,
}) {
  return (
    <AppShell hideNav>
      <main
        className="min-h-screen scroll-smooth pb-24 md:pb-12"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(220,232,247,0.9), transparent 32%), linear-gradient(180deg, #F4F8FD 0%, #FFFFFF 48%, #F4F8FD 100%)",
        }}
      >
        <div className="soldierhub-profile-shell mx-auto w-full max-w-[660px] px-3 py-4 sm:px-5 md:px-6 md:py-6">
          <CircularBackButton href="/" label="Back to feed" />

          <section
            className="mt-4 overflow-hidden rounded-[28px] border bg-white"
            style={{
              borderColor: "rgba(207,218,232,0.9)",
              boxShadow: "0 18px 42px rgba(7,27,51,0.09)",
            }}
          >
            <div className="h-1.5 w-full bg-[#B31942]" />

            <div className="grid gap-5 p-5 md:p-6">
              <div className="min-w-0">
                <div
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em]"
                  style={{
                    backgroundColor: "#F7FAFE",
                    borderColor: "#DCE7F4",
                    color: T.blue,
                  }}
                >
                  <HeroIcon size={15} />
                  {eyebrow}
                </div>

                <h1
                  className="mt-5 text-[38px] font-black leading-[0.95] tracking-[-0.055em] md:text-5xl"
                  style={{ color: T.navy }}
                >
                  {title}
                </h1>

                <p className="mt-4 text-sm leading-7 md:text-base" style={{ color: T.textMuted }}>
                  {intro}
                </p>

                <p
                  className="mt-5 inline-flex rounded-full border px-3 py-1.5 text-xs font-extrabold"
                  style={{ backgroundColor: "#F7FAFE", borderColor: "#DCE7F4", color: T.text }}
                >
                  Effective date: {effectiveDate}
                </p>
              </div>

              <div
                className="rounded-[24px] border p-4"
                style={{
                  backgroundColor: "#F7FAFE",
                  borderColor: "#DCE7F4",
                }}
              >
                <div className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: T.textSubtle }}>
                  {quickTitle}
                </div>

                <div className="mt-3 grid gap-2.5">
                  {quickStats.map((item) => (
                    <HeroStat key={item.title} {...item} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="mt-5 grid gap-4">
            <div
              className="rounded-[26px] border bg-white p-5 md:p-6"
              style={{
                borderColor: "rgba(207,218,232,0.9)",
                boxShadow: "0 12px 30px rgba(11,28,44,0.045)",
              }}
            >
              <div className="flex gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "rgba(179,25,66,0.08)" }}
                >
                  <NoticeIcon size={20} style={{ color: "#B31942" }} />
                </div>

                <p className="text-[14px] font-semibold leading-7 md:text-[15px]" style={{ color: T.text }}>
                  {noticeText}
                </p>
              </div>
            </div>

            {sections.map((section) => (
              <Section key={section.id} {...section} />
            ))}

            <div
              className="flex flex-col gap-4 rounded-[26px] border bg-white p-5 md:flex-row md:items-center md:justify-between md:p-6"
              style={{
                borderColor: "rgba(207,218,232,0.9)",
                boxShadow: "0 12px 30px rgba(11,28,44,0.04)",
              }}
            >
              <div>
                <div className="text-lg font-extrabold" style={{ color: T.navy }}>
                  {crossLinkTitle}
                </div>
                <p className="mt-1 text-sm leading-6" style={{ color: T.textMuted }}>
                  {crossLinkBody}
                </p>
              </div>

              <Link
                href={crossLinkHref}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold transition hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg, ${T.navy} 0%, ${T.blue} 100%)`, color: "#FFFFFF" }}
              >
                {crossLinkLabel}
                <ExternalLink size={15} />
              </Link>
            </div>
          </div>

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}
