import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import { Suspense } from "react";

import { InlineScript } from "@/components/InlineScript";
import { ServiceWorkerRegister } from "@/components/ServiceWorker";
import { NavProgress } from "@/components/shell/NavProgress";
import { SITE_URL } from "@/lib/config";
import { getDictionary } from "@/lib/preferences";

import { fontDevanagari, fontLatin, fontSerifDevanagari, fontSerifLatin } from "./fonts";
import "./globals.css";

const themeInitScript = `(() => {
  try {
    const theme = localStorage.getItem("agrilok:theme");
    if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
  } catch {}
})();`;

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
  // The top of every page is the masthead, which sits on the canvas colour.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f141b" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getDictionary();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang={t.htmlLang}
      className={`${fontLatin.variable} ${fontDevanagari.variable} ${fontSerifLatin.variable} ${fontSerifDevanagari.variable}`}
      suppressHydrationWarning
    >
      <head>
        <InlineScript nonce={nonce} html={themeInitScript} />
      </head>
      <body className="bg-canvas text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
        >
          {t.nav.skip}
        </a>
        <Suspense>
          <NavProgress />
        </Suspense>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
