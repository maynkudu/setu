import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./motion.css";
import "./branding.css";
import "./workspace.css";
import "./page-transitions.css";
import { SiteMotion } from "@/components/site-motion";
const body = localFont({
  src: [
    { path: "../../public/fonts/dm-sans-400.ttf", weight: "400" },
    { path: "../../public/fonts/dm-sans-500.ttf", weight: "500" },
    { path: "../../public/fonts/dm-sans-600.ttf", weight: "600" },
    { path: "../../public/fonts/dm-sans-700.ttf", weight: "700" },
  ],
  variable: "--font-body",
  display: "swap",
});
const heading = localFont({
  src: [
    { path: "../../public/fonts/manrope-600.ttf", weight: "500 600" },
    { path: "../../public/fonts/manrope-800.ttf", weight: "700 800" },
  ],
  variable: "--font-heading",
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "SETU | IIT Madras BS alumni mentorship",
    template: "%s | SETU",
  },
  description:
    "Career guidance for degree-level IIT Madras BS students, with alumni mentors and IIC support.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${body.variable} ${heading.variable}`}
    >
      <body>
        <SiteMotion>{children}</SiteMotion>
      </body>
    </html>
  );
}
