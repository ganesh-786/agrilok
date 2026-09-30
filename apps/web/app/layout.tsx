import type { Metadata, Viewport } from "next";
import { Martel, Mukta } from "next/font/google";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ServiceWorkerRegister } from "@/components/ServiceWorker";
import { SITE_URL } from "@/lib/config";
import { getDictionary, getLite } from "@/lib/preferences";

import "./globals.css";

// Mukta for reading and interface text; Martel for headings. Both are
// designed for Devanagari first and carry a matching Latin, so Nepali and
// English share one voice. Weights are kept to the few actually used, because
// every font file is paid for in data on a rural connection.
const mukta = Mukta({
  subsets: ["devanagari", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-mukta",
  display: "swap",
});
const martel = Martel({
  subsets: ["devanagari", "latin"],
  weight: ["700", "800"],
  variable: "--font-martel",
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `agrilok · ${t.site.tagline}`, template: "%s · agrilok" },
    description: t.site.description,
    applicationName: "agrilok",
    openGraph: {
      type: "website",
      siteName: "agrilok",
      title: `agrilok · ${t.site.tagline}`,
      description: t.site.description,
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e6" },
    { media: "(prefers-color-scheme: dark)", color: "#121611" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getDictionary();
  const lite = await getLite();
  return (
    <html lang={t.htmlLang} className={`${mukta.variable} ${martel.variable}`}>
      <body className="flex min-h-dvh flex-col bg-paper text-ink antialiased">
        <SiteHeader t={t} lang={lang} lite={lite} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter t={t} />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
