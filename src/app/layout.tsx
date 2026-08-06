import type { Metadata, Viewport } from "next";
import { Fira_Sans, Fira_Code, Gilda_Display, Lato } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { AppShell } from "@/components/layout/app-shell";

// Fira pairing (ui-ux-pro-max recommendation for data/technical dashboards):
// Fira Sans for readable body, Fira Code as the monospaced display/data face —
// monospace headings + tabular figures read as precision instrumentation.
// Reuses the existing --font-geist-* variable names so the whole design system
// picks them up with no token renames.
const firaSans = Fira_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const firaCode = Fira_Code({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// The editorial type pairing: Gilda Display — a
// high-contrast Didone serif — as the display face, and Lato as the body face.
// Loaded as CSS variables; the Editorial surfaces (the /intro landing and the
// Command Center, both `.ed-stage`) opt into them, so the data-dense dashboard
// pages keep their Fira instrument typography.
const gildaDisplay = Gilda_Display({
  variable: "--font-gilda",
  subsets: ["latin"],
  weight: ["400"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["100", "300", "400", "700"],
});

const SITE_URL = "https://vitalchain.vercel.app";
const PUBLIC_URL = `${SITE_URL}/intro`;
const SITE_NAME = "Provenra";
const DESCRIPTION =
  "Prototype pharmaceutical supply-chain dashboard for serialization, cold-chain monitoring, quality alerts, inventory, QMS, warehouse, and recall workflows using deterministic demo data.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Provenra | Pharmaceutical supply-chain prototype",
    template: "%s · Provenra",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Provenra" }],
  generator: "Next.js",
  category: "Healthcare / Supply Chain",
  openGraph: {
    type: "website",
    url: PUBLIC_URL,
    siteName: SITE_NAME,
    title: "Provenra | Pharmaceutical supply-chain prototype",
    description: DESCRIPTION,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Provenra | Pharmaceutical supply-chain prototype",
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f1a",
  width: "device-width",
  initialScale: 1,
};

/** Machine-readable identity for the public product page. */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${PUBLIC_URL}#website`,
      url: PUBLIC_URL,
      name: SITE_NAME,
      description: DESCRIPTION,
      inLanguage: "en",
    },
    {
      "@type": "WebApplication",
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Supply Chain Management",
      operatingSystem: "Web",
      url: PUBLIC_URL,
      description: DESCRIPTION,
      featureList: [
        "GS1 serialization and demo chain-of-custody workflows",
        "Cold-chain calculations with MKT and freeze detection",
        "Quality and NSQ alert workflow demonstrations",
        "FEFO inventory and shortage-risk calculations",
        "QMS deviation and CAPA workflows",
        "Warehouse and recall workflow demonstrations",
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${firaSans.variable} ${firaCode.variable} ${gildaDisplay.variable} ${lato.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AppShell>{children}</AppShell>
        <Analytics />
      </body>
    </html>
  );
}
