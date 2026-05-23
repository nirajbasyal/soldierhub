import "./globals.css";
import "./feed-polish.css";
import "./production-polish.css";
import Providers from "./providers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soldierhub.com";
const SITE_NAME = "SoldierHub";
const SITE_TITLE = "SoldierHub — Fort Bliss & El Paso Military Community";
const SITE_DESCRIPTION =
  "SoldierHub is an independent, unofficial Fort Bliss and El Paso military community platform for local questions, PCS help, BAH tools, gate information, resources, and community support.";
const SITE_TAGLINE = "Ask, share, and support the Fort Bliss community.";
const BRAND_ICON = "/brand/soldierhub-favicon.svg?v=20260518";

const siteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: [
    "SoldierHub Fort Bliss",
    "Soldier Hub",
    "Soldier Hub Fort Bliss",
    "Fort Bliss SoldierHub",
    "El Paso Military Community",
  ],
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "en-US",
  slogan: SITE_TAGLINE,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/?q={search_term_string}`,
    "query-input": "required name={search_term_string}",
  },
  audience: {
    "@type": "Audience",
    audienceType: "Soldiers, military families, veterans, and Fort Bliss / El Paso community members",
  },
  areaServed: [
    {
      "@type": "Place",
      name: "Fort Bliss",
      address: {
        "@type": "PostalAddress",
        addressLocality: "El Paso",
        addressRegion: "TX",
        addressCountry: "US",
      },
    },
    {
      "@type": "City",
      name: "El Paso",
      addressRegion: "TX",
      addressCountry: "US",
    },
  ],
  about: [
    "Fort Bliss community support",
    "El Paso military community",
    "Fort Bliss PCS help",
    "Fort Bliss BAH estimates",
    "Fort Bliss gate information",
    "Army Fitness Test tools",
    "military family resources",
    "local military questions and answers",
  ],
  isAccessibleForFree: true,
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: "Soldier Hub",
    url: SITE_URL,
    logo: `${SITE_URL}/brand/soldierhub-favicon.svg`,
  },
  disambiguatingDescription:
    "SoldierHub is an independent, unofficial community platform and is not affiliated with, endorsed by, or operated by the U.S. Government, Department of Defense, Department of the Army, Fort Bliss, or any military installation.",
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  category: "community",

  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },

  description: SITE_DESCRIPTION,

  keywords: [
    "SoldierHub",
    "Soldier Hub",
    "SoldierHub Fort Bliss",
    "Soldier Hub Fort Bliss",
    "Fort Bliss SoldierHub",
    "Fort Bliss community",
    "Fort Bliss soldiers",
    "Fort Bliss families",
    "Fort Bliss military community",
    "Fort Bliss resources",
    "Fort Bliss PCS help",
    "Fort Bliss BAH calculator",
    "Fort Bliss BAH estimate",
    "Fort Bliss gate hours",
    "Fort Bliss gate information",
    "El Paso military community",
    "El Paso soldiers",
    "El Paso Army community",
    "El Paso military families",
    "Army community app",
    "military community platform",
    "military family support",
    "PCS help",
    "military housing",
    "soldier support",
    "AFT score calculator",
    "Army Fitness Test calculator",
  ],

  authors: [{ name: SITE_NAME }],
  creator: "Niraj Basyal",
  publisher: SITE_NAME,

  alternates: {
    canonical: SITE_URL,
  },

  icons: {
    icon: [
      { url: BRAND_ICON, type: "image/svg+xml", sizes: "any" },
      { url: "/brand/soldierhub-favicon.svg?v=20260518", type: "image/svg+xml" },
    ],
    shortcut: [BRAND_ICON],
    apple: [{ url: BRAND_ICON, sizes: "512x512", type: "image/svg+xml" }],
  },

  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: BRAND_ICON,
        width: 512,
        height: 512,
        alt: "SoldierHub logo for the Fort Bliss and El Paso military community",
      },
    ],
  },

  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [BRAND_ICON],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  verification: {
    other: {
      "application-name": SITE_NAME,
    },
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B1C2C",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#F6F3EC" }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
