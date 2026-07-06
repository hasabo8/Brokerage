import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import { DEFAULT_LOCALE, isRtl, type Locale } from "@/lib/i18n/config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const arabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Brokerage",
  description: "Your real estate workspace.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value as Locale) || DEFAULT_LOCALE;
  const dir = isRtl(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${arabic.variable}`}>
      <body className="min-h-screen bg-[#fafafa] font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
