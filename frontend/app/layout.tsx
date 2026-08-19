import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ArjunaVision — Detect. Protect. Connect.",
  description:
    "AI-powered personal safety and emergency response platform. Real-time monitoring, smart SOS, fall detection, health AI, and family dashboard.",
  keywords: ["personal safety", "emergency response", "AI monitoring", "fall detection", "health monitoring"],
  openGraph: {
    title: "ArjunaVision",
    description: "Detect. Protect. Connect.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${manrope.variable} font-sans bg-background text-on-surface antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
