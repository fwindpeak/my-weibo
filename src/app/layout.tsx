import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Weibo - Personal Microblog",
  description: "A personal microblog built with Next.js, Prisma, and Tailwind CSS for sharing short updates and images.",
  keywords: ["microblog", "Next.js", "Prisma", "Tailwind CSS", "personal website", "React"],
  authors: [{ name: "My Weibo" }],
  openGraph: {
    title: "My Weibo",
    description: "Share life moments with a modern personal microblog platform.",
    url: "https://my-weibo.example.com",
    siteName: "My Weibo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Weibo",
    description: "Share life moments with a modern personal microblog platform.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
