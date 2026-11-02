import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { StylePanel } from "@/components/style-panel";
import { Translator } from "@/components/translator";
import "./globals.css";

// Studio noir typeface (one face for the whole app).
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Shift Report",
  description: "Close the night in minutes. An AI-assisted end-of-shift report for bar and club managers.",
};

export const viewport: Viewport = {
  themeColor: "#101010",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg text-text-1">
        {children}
        <Translator />
        {process.env.NEXT_PUBLIC_STYLE_PANEL !== "off" && <StylePanel />}
      </body>
    </html>
  );
}
