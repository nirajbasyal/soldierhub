import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, Mail } from "lucide-react";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";

function HeroStat({ icon: Icon, title, body, tone = "blue" }) {
  const iconColor = tone === "danger" ? "#B31942" : T.blue;

  return (
    <div
      className="flex items-start gap-3 rounded-2xl border p-3"
      style={{
        backgroundColor: "rgba(255,255,255,0.88)",
        borderColor: "rgba(188,208,234,0.85)",
      }}
    >
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: "rgba(244,248,253,0.95)" }}
      >
        <Icon size={18} style={{ color: iconColor }} strokeWidth={2.2} />
      </div>

      <div>
        <div className="text-sm font-bold" style={{ color: T.navy }}>
          {title}
        </div>
        <div className="mt-1 text-xs leading-relaxed" style={{ color: T.textMuted }}>
          {body}
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, body = [], bullets, footer }) {
  return (
    <section
      id={id}
      className="rounded-[24px] border p-5 md:p-6 scroll-mt-28 relative"
      style={{
        backgroundColor: "rgba(255,255,255,0.94)",
        borderColor: "#D5E2F2",
        boxShadow: "0 10px 26px rgba(7,27,51,0.045)",
      }}
    >
      <div
        className="absolute left-5 right-5 top-0 h-1 rounded-b-full"
        style={{ backgroundColor: "rgba(30,78,140,0.52)" }}
      />

      <h2 className="text-lg md:text-xl font-bold leading-snug pt-1" style={{ color: T.navy }}>
        {title}
      </h2>

      <div className="mt-3 space-y-3 text-[14px] md:text-[15px] leading-7" style={{ color: T.textMuted }}>
        {body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        {bullets ? (
          <ul className="grid gap-2.5">
            {bullets.map((item) => (
              <li key={item} className="flex gap-2.5">
                <CheckCircle2 size={16} className="mt-1 shrink-0" style={{ color: T.blue }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {footer ? (
          <p
            className="rounded-2xl border px-4 py-3 font-medium"
            style={{
              backgroundColor: "rgba(244,248,253,0.95)",
              borderColor: "#D5E2F2",
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
  quickLinks = [],
  noticeIcon: NoticeIcon,
  noticeText,
  contactLabel,
  sections = [],
  crossLinkTitle,
  crossLinkBody,
  crossLinkHref,
  crossLinkLabel,
}) {
  return (
    <AppShell hideNav>
      <main
        className="min-h-screen pb-24 md:pb-12 scroll-smooth"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(220,232,247,0.9), transparent 32%), linear-gradient(180deg, #F4F8FD 0%, #FFFFFF 48%, #F4F8FD 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
            style={{
              backgroundColor: "rgba(255,255,255,0.86)",
              borderColor: "#D5E2F2",
              color: T.navy,
            }}
          >
            <ArrowLeft size={16} />
            Back to feed
          </Link>

          <section
            className="mt-6 rounded-[26px] md:rounded-[30px] border relative"
            style={{
              borderColor: "#D5E2F2",
              backgroundColor: "rgba(255,255,255,0.94)",
              boxShadow: "0 14px 38px rgba(7,27,51,0.07)",
            }}
          >
            <div
              className="absolute left-5 right-5 top-0 h-1 rounded-b-full"
              style={{ backgroundColor: "rgba(30,78,140,0.72)" }}
            />

            <div className="p-6 md:p-8">
              <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-end">
                <div>
                  <div
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]"
                    style={{
                      backgroundColor: "rgba(244,248,253,0.95)",
                      borderColor: "#D5E2F2",
                      color: T.blue,
                    }}
                  >
                    <HeroIcon size={15} />
                    {eyebrow}
                  </div>

                  <h1
                    className="mt-5 text-4xl md:text-5xl font-extrabold tracking-[-0.04em] leading-[0.95]"
                    style={{ color: T.navy }}
                  >
                    {title}
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm md:text-base leading-7" style={{ color: T.textMuted }}>
                    {intro}
                  </p>

                  <p className="mt-3 text-sm font-semibold" style={{ color: T.text }}>
                    Effective date: {effectiveDate}
                  </p>
                </div>

                <div
                  className="rounded-3xl border p-4"
                  style={{
                    backgroundColor: "rgba(244,248,253,0.9)",
                    borderColor: "#D5E2F2",
                  }}
                >
                  <div className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: T.textSubtle }}>
                    {quickTitle}
                  </div>

                  <div className="mt-3 grid gap-2">
                    {quickStats.map((item) => (
                      <HeroStat key={item.title} {...item} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-5 grid lg:grid-cols-[280px_1fr] gap-5 items-start">
            <aside
              className="lg:sticky lg:top-24 rounded-[24px] border p-4 relative"
              style={{
                backgroundColor: "rgba(255,255,255,0.9)",
                borderColor: "#D5E2F2",
              }}
            >
              <div
                className="absolute left-5 right-5 top-0 h-1 rounded-b-full"
                style={{ backgroundColor: "rgba(30,78,140,0.45)" }}
              />

              <div className="text-xs font-bold uppercase tracking-[0.14em] pt-1" style={{ color: T.textSubtle }}>
                Page guide
              </div>

              <nav className="mt-3 grid gap-2" aria-label={`${title} sections`}>
                {quickLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-2xl px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-sm"
                    style={{ backgroundColor: "rgba(244,248,253,0.95)", color: T.navy }}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              <a
                href="mailto:support@soldierhub.com"
                className="mt-4 flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #071B33 0%, #1E4E8C 100%)", color: "#FFFFFF" }}
              >
                <Mail size={16} />
                {contactLabel}
              </a>
            </aside>

            <div className="grid gap-4">
              <div
                className="rounded-[24px] border p-5 md:p-6 relative"
                style={{
                  backgroundColor: "rgba(255,255,255,0.94)",
                  borderColor: "#D5E2F2",
                }}
              >
                <div
                  className="absolute left-5 right-5 top-0 h-1 rounded-b-full"
                  style={{ backgroundColor: "rgba(30,78,140,0.45)" }}
                />

                <div className="flex gap-3 pt-1">
                  <div
                    className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "rgba(244,248,253,0.95)" }}
                  >
                    <NoticeIcon size={20} style={{ color: T.blue }} />
                  </div>

                  <p className="text-[15px] leading-7 font-medium" style={{ color: T.text }}>
                    {noticeText}
                  </p>
                </div>
              </div>

              {sections.map((section) => (
                <Section key={section.id} {...section} />
              ))}

              <div
                className="rounded-[24px] border p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative"
                style={{
                  backgroundColor: "rgba(255,255,255,0.94)",
                  borderColor: "#D5E2F2",
                }}
              >
                <div
                  className="absolute left-5 right-5 top-0 h-1 rounded-b-full"
                  style={{ backgroundColor: "rgba(30,78,140,0.72)" }}
                />

                <div className="pt-1">
                  <div className="text-lg font-bold" style={{ color: T.navy }}>
                    {crossLinkTitle}
                  </div>
                  <p className="mt-1 text-sm" style={{ color: T.textMuted }}>
                    {crossLinkBody}
                  </p>
                </div>

                <Link
                  href={crossLinkHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold"
                  style={{ background: "linear-gradient(135deg, #071B33 0%, #1E4E8C 100%)", color: "#FFFFFF" }}
                >
                  {crossLinkLabel}
                  <ExternalLink size={15} />
                </Link>
              </div>
            </div>
          </div>

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}
