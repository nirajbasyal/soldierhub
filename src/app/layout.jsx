import "./globals.css";
import Providers from "./providers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soldierhub.com";
const SITE_NAME = "Soldier Hub";
const SITE_TITLE = "Soldier Hub — Fort Bliss Community, Tools & Support";
const SITE_DESCRIPTION =
  "Unofficial Fort Bliss community for soldiers and families to ask questions, share local help, check BAH estimates, gate hours, AFT tools, and resources.";

const siteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: "Soldier Hub Fort Bliss Community",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "en-US",
  audience: {
    "@type": "Audience",
    audienceType: "Soldiers, military families, veterans, and Fort Bliss community members",
  },
  about: [
    "Fort Bliss community support",
    "BAH estimates",
    "Fort Bliss gate hours",
    "Army Fitness Test tools",
    "PCS and local resources",
    "El Paso military life",
  ],
  isAccessibleForFree: true,
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  },
  disambiguatingDescription:
    "Soldier Hub is an unofficial community platform and is not affiliated with, endorsed by, or operated by the U.S. Army, Fort Bliss, the Department of Defense, or any government agency.",
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
    "Soldier Hub",
    "Fort Bliss community",
    "Fort Bliss soldiers",
    "Fort Bliss families",
    "Fort Bliss resources",
    "Fort Bliss BAH calculator",
    "Fort Bliss BAH estimate",
    "Fort Bliss gate hours",
    "Army gate hours",
    "AFT score calculator",
    "Army Fitness Test calculator",
    "Army community app",
    "military community platform",
    "military family support",
    "PCS help",
    "Fort Bliss PCS",
    "El Paso military",
    "El Paso Army community",
    "military housing",
    "soldier support",
  ],

  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,

  alternates: {
    canonical: SITE_URL,
  },

  icons: {
    icon: [
      { url: "/brand/soldierhub-favicon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    shortcut: ["/brand/soldierhub-favicon.svg"],
    apple: [{ url: "/brand/soldierhub-favicon.svg", sizes: "512x512", type: "image/svg+xml" }],
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
        url: "/brand/soldierhub-favicon.svg",
        width: 512,
        height: 512,
        alt: "Soldier Hub logo",
      },
    ],
  },

  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/brand/soldierhub-favicon.svg"],
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
