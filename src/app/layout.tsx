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

// Textura's actual type pairing (per the discovery doc §6.2): Gilda Display — a
// high-contrast Didone serif — as the display face, and Lato as the body face.
// Loaded as CSS variables; the Textura surfaces (the /intro landing and the
// Command Center, both `.tx-stage`) opt into them, so the data-dense dashboard
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
const SITE_NAME = "VitalChain";
const DESCRIPTION =
  "VitalChain is an enterprise pharmaceutical supply-chain command center for India and global markets. It unifies GS1 track & trace, cold-chain temperature monitoring, NSQ/quality surveillance, FEFO inventory & shortage prediction, a QMS (deviations & CAPA), warehouse management, and recall & compliance — in one real-time dashboard.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VitalChain — Pharma Supply Chain Intelligence",
    template: "%s · VitalChain",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "VitalChain" }],
  generator: "Next.js",
  category: "Healthcare / Supply Chain",
  keywords: [
    "pharmaceutical supply chain",
    "pharma track and trace",
    "GS1 serialization",
    "cold chain monitoring",
    "drug shortage prediction",
    "NSQ not of standard quality",
    "CDSCO",
    "Schedule M GMP",
    "FEFO inventory",
    "QMS deviation CAPA",
    "warehouse management WMS",
    "recall compliance",
    "DSCSA",
    "EU FMD",
    "India pharma",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "VitalChain — Pharma Supply Chain Intelligence",
    description: DESCRIPTION,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "VitalChain — Pharma Supply Chain Intelligence",
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

/**
 * JSON-LD structured data. This is the machine-readable description that search
 * engines (SEO) and AI answer/generative engines (AEO/GEO — ChatGPT, Perplexity,
 * Gemini, Google AI Overviews) parse to understand and cite the product.
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: DESCRIPTION,
      inLanguage: "en",
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: SITE_NAME,
      url: SITE_URL,
      description:
        "VitalChain builds pharmaceutical supply-chain intelligence software for manufacturers, distributors and regulators.",
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Supply Chain Management",
      operatingSystem: "Web",
      url: SITE_URL,
      description: DESCRIPTION,
      featureList: [
        "GS1 track & trace with hash-chained chain-of-custody",
        "Cold-chain temperature monitoring with MKT and freeze detection",
        "NSQ / spurious / DEG-EG quality surveillance (CDSCO alerts)",
        "FEFO inventory and drug-shortage prediction",
        "QMS: deviation register and CAPA lifecycle",
        "Warehouse management (WMS) with FEFO-enforced picking",
        "Recall tracking and Schedule M / DSCSA / EU FMD compliance",
      ],
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
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
