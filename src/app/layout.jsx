import "./globals.css";
import Providers from "./providers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soldierhub.com";

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Soldier Hub — Fort Bliss Community",
    template: "%s · Soldier Hub",
  },

  description:
    "An unofficial Fort Bliss community platform to ask for help, share tips, get recommendations, and support each other around housing, gates, PCS moves, local services, and everyday Fort Bliss life.",

  keywords: [
    "Fort Bliss",
    "Army community",
    "PCS",
    "El Paso",
    "BAH",
    "military housing",
    "soldier community",
    "gate hours",
    "Fort Bliss housing",
    "military PCS help",
  ],

  authors: [{ name: "Soldier Hub" }],

  icons: {
    icon: [
      { url: "/brand/soldierhub-favicon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    shortcut: ["/brand/soldierhub-favicon.svg"],
    apple: [{ url: "/brand/soldierhub-favicon.svg", sizes: "512x512", type: "image/svg+xml" }],
  },

  openGraph: {
    title: "Soldier Hub — Fort Bliss Community",
    description:
      "Connect with the Fort Bliss community to ask for help, share tips, get recommendations, and support each other.",
    url: SITE_URL,
    siteName: "Soldier Hub",
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
    title: "Soldier Hub — Fort Bliss Community",
    description:
      "Ask for help, share tips, get recommendations, and support the Fort Bliss community.",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
