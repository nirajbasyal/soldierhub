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
    "An unofficial Fort Bliss community platform for housing tips, gate updates, PCS advice, and warnings — by and for verified soldiers and families.",
  keywords: [
    "Fort Bliss",
    "Army community",
    "PCS",
    "El Paso",
    "BAH",
    "military housing",
    "soldier community",
  ],
  authors: [{ name: "Soldier Hub" }],
  openGraph: {
    title: "Soldier Hub — Fort Bliss Community",
    description:
      "Real questions, answered by people who've been there. Get help with housing, gates, PCS, and El Paso life from verified Fort Bliss community members.",
    url: SITE_URL,
    siteName: "Soldier Hub",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Soldier Hub — Fort Bliss Community",
    description:
      "Real questions, answered by people who've been there.",
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
  themeColor: "#F6F3EC",
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
