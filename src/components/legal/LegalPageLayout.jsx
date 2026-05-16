import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, Mail } from "lucide-react";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";

function toneColor(tone = "blue") {
  if (tone === "danger" || tone === "red") return T.gold;
  if (tone === "navy") return T.navy;
  return T.blue;
}

function HeroStat({ icon: Icon, title, body, tone = "blue" }) {
  const color = toneColor(tone);

  return (
    <div
      className="group flex items-start gap-3 rounded-2xl border p-3.5 transition hover:-translate-y-0.5 hover:shadow-sm"
      style={{
        backgroundColor: "rgba(255,255,255,0.92)",
        borderColor: T.borderSoft,
      }}
    >
      <div
        className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 transition group-hover:scale-[1.03]"
        style={{ backgroundColor: tone === "danger" ? T.goldBg : T.surface }}
      >
        <Icon size={18} style={{ color }} strokeWidth={2.25} />
      </div>

      <div>
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
      className="rounded-[24px] border p-5 md:p-6 scroll-mt-28 relative overflow-hidden"
      style={{
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: T.borderSoft,
        boxShadow: "0 10px 26px rgba(7,27,51,0.045)",
      }}
    >
      <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: accentColor }} />

      <h2 className="text-lg md:text-xl font-extrabold leading-snug pl-1" style={{ color: T.navy }}>
        {title}
      </h2>

      <div className="mt-3 space-y-3 text-[14px] md:text-[15px] leading-7 pl-1" style={{ color: T.textMuted }}>
        {body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        {bullets ? (
          <ul className="grid gap-2.5">
            {bullets.map((item) => (
              <li key={item} className="flex gap-2.5">
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
              backgroundColor: tone === "danger" ? T.goldBg : T.surface,
              borderColor: tone === "danger" ? T.goldSoft : T.borderSoft,
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
            "radial-gradient(circle at 10% 0%, rgba(179,25,66,0.10), transparent 28%), radial-gradient(circle at 92% 7%, rgba(30,78,140,0.13), transparent 30%), linear-gradient(180deg, #F7FAFE 0%, #EAF0F8 52%, #F7FAFE 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98]"
            style={{
              backgroundColor: "rgba(255,255,255,0.88)",
              borderColor: T.borderSoft,
              color: T.navy,
            }}
          >
            <ArrowLeft size={16} />
            Back to feed
          </Link>

          <section
            className="mt-5 rounded-[28px] md:rounded-[34px] border relative overflow-hidden"
            style={{
              borderColor: T.borderSoft,
              backgroundColor: "rgba(255,255,255,0.95)",
              boxShadow: "0 18px 46px rgba(7,27,51,0.075)",
            }}
          >
            <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: T.gold }} />
            <div
              className="absolute -right-20 -top-24 h-64 w-64 rounded-full"
              style={{ backgroundColor: "rgba(30,78,140,0.08)" }}
            />
            <div
              className="absolute -left-20 bottom-0 h-56 w-56 rounded-full"
              style={{ backgroundColor: "rgba(179,25,66,0.07)" }}
            />

            <div className="relative p-5 md:p-8">
              <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-end">
                <div>
                  <div
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.13em]"
                    style={{
                      backgroundColor: T.goldBg,
                      borderColor: T.goldSoft,
                      color: T.gold,
                    }}
                  >
                    <HeroIcon size={15} />
                    {eyebrow}
                  </div>

                  <h1
                    className="mt-5 text-4xl md:text-5xl font-black tracking-[-0.045em] leading-[0.95]"
                    style={{ color: T.navy }}
                  >
                    {title}
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm md:text-base leading-7" style={{ color: T.textMuted }}>
                    {intro}
                  </p>

                  <p
                    className="mt-4 inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold"
                    style={{ backgroundColor: T.surface, color: T.text }}
                  >
                    Effective date: {effectiveDate}
                  </p>
                </div>

                <div
                  className="rounded-3xl border p-4"
                  style={{
                    backgroundColor: "rgba(244,248,253,0.88)",
                    borderColor: T.borderSoft,
                  }}
                >
                  <div className="text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: T.textSubtle }}>
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

          <div className="mt-5 grid lg:grid-cols-[290px_minmax(0,1fr)] gap-5 items-start">
            <aside
              className="lg:sticky lg:top-24 rounded-[24px] border p-4 relative overflow-hidden"
              style={{
                backgroundColor: "rgba(255,255,255,0.92)",
                borderColor: T.borderSoft,
                boxShadow: "0 10px 24px rgba(7,27,51,0.045)",
              }}
            >
              <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: T.gold }} />

              <div className="text-xs font-extrabold uppercase tracking-[0.14em] pt-1" style={{ color: T.textSubtle }}>
                Page guide
              </div>

              <nav className="mt-3 grid gap-2" aria-label={`${title} sections`}>
                {quickLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-2xl px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98]"
                    style={{ backgroundColor: T.surface, color: T.navy }}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              <a
                href="mailto:support@soldierhub.com"
                className="mt-4 flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-extrabold transition hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg, ${T.navy} 0%, ${T.blue} 100%)`, color: "#FFFFFF" }}
              >
                <Mail size={16} />
                {contactLabel}
              </a>
            </aside>

            <div className="grid gap-4">
              <div
                className="rounded-[24px] border p-5 md:p-6 relative overflow-hidden"
                style={{
                  backgroundColor: "rgba(255,255,255,0.95)",
                  borderColor: T.borderSoft,
                  boxShadow: "0 10px 24px rgba(7,27,51,0.04)",
                }}
              >
                <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: T.gold }} />

                <div className="flex gap-3 pl-1">
                  <div
                    className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: T.goldBg }}
                  >
                    <NoticeIcon size={20} style={{ color: T.gold }} />
                  </div>

                  <p className="text-[15px] leading-7 font-semibold" style={{ color: T.text }}>
                    {noticeText}
                  </p>
                </div>
              </div>

              {sections.map((section) => (
                <Section key={section.id} {...section} />
              ))}

              <div
                className="rounded-[24px] border p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative overflow-hidden"
                style={{
                  backgroundColor: "rgba(255,255,255,0.95)",
                  borderColor: T.borderSoft,
                }}
              >
                <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: T.gold }} />

                <div className="pt-1">
                  <div className="text-lg font-extrabold" style={{ color: T.navy }}>
                    {crossLinkTitle}
                  </div>
                  <p className="mt-1 text-sm" style={{ color: T.textMuted }}>
                    {crossLinkBody}
                  </p>
                </div>

                <Link
                  href={crossLinkHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold transition hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg, ${T.navy} 0%, ${T.blue} 100%)`, color: "#FFFFFF" }}
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
