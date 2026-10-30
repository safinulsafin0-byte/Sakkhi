import type { Metadata } from "next";
import { Literata, Source_Sans_3, Hind_Siliguri } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  variable: "--font-hind-siliguri",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sakkhi — every taka, witnessed",
  description: "Grassroots accountability, transparent aid, and tamper-verified digital evidence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${literata.variable} ${sourceSans.variable} ${hindSiliguri.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-paper text-ink font-sans selection:bg-terracotta-soft selection:text-terracotta">
        <Header />
        <main className="flex-1 w-full mx-auto max-w-6xl px-4 sm:px-6 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
