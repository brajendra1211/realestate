import type { Metadata } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, Fraunces, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { GuddyChatbot } from "@/components/GuddyChatbot";
import { isChatbotConfigured } from "@/lib/chatbot";
import { LocationDetector } from "@/components/LocationDetector";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { getSiteSettings } from "@/lib/site-settings";
import { getLocationCookie } from "@/lib/location-context";
import { SITE_URL } from "@/lib/seo";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { SiteShell } from "@/components/SiteShell";
import { ScrollToTop } from "@/components/ScrollToTop";
import { TermsGate } from "@/components/TermsGate";
import { LiveRefresh } from "@/components/LiveRefresh";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = settings.metaTitle ?? settings.siteName;
  const description = settings.metaDescription ?? settings.tagline ?? "Real estate marketplace";

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${settings.siteName}`,
    },
    description,
    icons: settings.favicon ? { icon: settings.favicon } : undefined,
    openGraph: {
      siteName: settings.siteName,
      title,
      description,
      type: "website",
      url: SITE_URL,
      images: settings.ogImage ? [{ url: settings.ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: settings.ogImage ? [settings.ogImage] : undefined,
    },
    robots: { index: true, follow: true },
    verification: settings.googleSiteVerification
      ? { google: settings.googleSiteVerification }
      : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, location, cities] = await Promise.all([
    getSiteSettings(),
    getLocationCookie(),
    prisma.city.findMany({
      where: { published: true },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const session = await auth().catch(() => null);
  const needsTerms =
    !!session &&
    session.user.role !== "ADMIN" &&
    session.user.role !== "SUBADMIN" &&
    !(await prisma.user.findUnique({ where: { id: session.user.id }, select: { termsAcceptedAt: true } }))?.termsAcceptedAt;

  const gaId =
    settings.googleAnalyticsId && /^[A-Z0-9-]{1,20}$/i.test(settings.googleAnalyticsId)
      ? settings.googleAnalyticsId
      : null;

  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-ink font-sans">
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
        <LocationDetector hasLocation={location !== null} />
        <SiteShell
          navbar={
            <Navbar
              siteName={settings.siteName}
              logoUrl={settings.logoUrl}
              currentCity={location ? { slug: location.citySlug, name: location.cityName } : null}
              cities={cities}
            />
          }
          footer={
            <Footer
              siteName={settings.siteName}
              tagline={settings.tagline}
              contactEmail={settings.contactEmail}
              contactPhone={settings.contactPhone}
              contactAddress={settings.contactAddress}
              instagramUrl={settings.instagramUrl}
              facebookUrl={settings.facebookUrl}
              youtubeUrl={settings.youtubeUrl}
              linkedinUrl={settings.linkedinUrl}
            />
          }
          whatsapp={<WhatsAppButton phoneNumber={settings.whatsappNumber} />}
          chatbot={isChatbotConfigured() ? <GuddyChatbot siteName={settings.siteName} /> : null}
          mobileNav={<MobileBottomNav />}
        >
          {children}
        </SiteShell>
        {needsTerms && <TermsGate />}
        <ScrollToTop />
        <LiveRefresh enabled={!!session} />
      </body>
    </html>
  );
}

