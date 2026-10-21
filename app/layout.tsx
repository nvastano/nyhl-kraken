import type { Metadata, Viewport } from "next";
import { Geist, Teko } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const teko = Teko({
  variable: "--font-teko",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sabres Shift Tracker",
  description: "8U house league shift tracker for the Sabres.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sabres Shifts",
  },
  icons: {
    // metadata.icons paths aren't auto-prefixed with basePath, unlike
    // next/link and next/image — the project-site prefix is baked in here.
    apple: "/nyhl-sabres/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#070b16",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${teko.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <header
          className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top, 0px))" }}
        >
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Image
              // Same basePath quirk as the apple-touch-icon above — next/image
              // doesn't prefix a plain string src when images are unoptimized.
              // Placeholder monogram until the real team logo is swapped in.
              src="/nyhl-sabres/sabres-logo.png"
              alt=""
              width={38}
              height={38}
              priority
              className="shrink-0 rounded-full border border-accent/30"
            />
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-display text-xl font-semibold tracking-wide">SABRES</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                Shift Tracker
              </span>
            </div>
          </Link>
          <Link
            href="/roster"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted active:scale-95"
          >
            Roster
          </Link>
        </header>
        <main
          className="mx-auto w-full max-w-lg flex-1 px-4"
          style={{
            paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
            paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
