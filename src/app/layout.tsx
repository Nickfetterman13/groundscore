import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "groundscore",
  description: "festival lineup → spotify playlist.",
  metadataBase: new URL("https://groundscore.fm"),
  openGraph: {
    title: "groundscore",
    description: "find something good.",
    url: "https://groundscore.fm",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "groundscore",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "groundscore",
    description: "find something good.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-[#F5F2EC]">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
