import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Central NL Scholastic Chess Club",
  description: "Building skills and confidence for students K–12 through chess. Join our community of young chess players in Central Newfoundland.",
  keywords: ["chess", "scholastic", "club", "central newfoundland", "students", "K-12", "chess lessons"],
  authors: [{ name: "Central NL Scholastic Chess Club" }],
  openGraph: {
    title: "Central NL Scholastic Chess Club",
    description: "Building skills and confidence for students K–12 through chess. Join our community of young chess players in Central Newfoundland.",
    url: "https://cnlscc.com", // Replace with your actual domain
    siteName: "Central NL Scholastic Chess Club",
    images: [
      {
        url: "/Logo.png", // This will be your social media preview image
        width: 1200,
        height: 630,
        alt: "Central NL Scholastic Chess Club Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Central NL Scholastic Chess Club",
    description: "Building skills and confidence for students K–12 through chess. Join our community of young chess players in Central Newfoundland.",
    images: ["/Logo.png"], // Same image for Twitter
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
