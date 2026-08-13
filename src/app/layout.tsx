import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { LocationDetector } from "@/components/LocationDetector";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { getSiteSettings } from "@/lib/site-settings";
import { getLocationCookie } from "@/lib/location-context";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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

  const gaId =
    settings.googleAnalyticsId && /^[A-Z0-9-]{1,20}$/i.test(settings.googleAnalyticsId)
      ? settings.googleAnalyticsId
      : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-slate-900">
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
        <Navbar
          siteName={settings.siteName}
          logoUrl={settings.logoUrl}
          currentCity={location ? { slug: location.citySlug, name: location.cityName } : null}
          cities={cities}
        />
        <main className="flex-1">{children}</main>
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
        <WhatsAppButton phoneNumber={settings.whatsappNumber} />
        <MobileBottomNav />
      </body>
    </html>
  );
}
