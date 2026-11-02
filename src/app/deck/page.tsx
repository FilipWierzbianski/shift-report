import type { Metadata } from "next";
import { Brawler, Instrument_Serif, PT_Serif } from "next/font/google";
import { Deck } from "./deck";

// The deck borrows the type system of wierzbianski.com: Instrument Serif for display type,
// Brawler for uppercase labels and running text. Brawler ships Latin only, so PT Serif
// (similar weight and colour) fills in the Polish letters it lacks: ą ę ł ś ć ń ź ż.
const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext"],
  variable: "--fwd-serif",
  display: "swap",
});
const brawler = Brawler({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--fwd-brawler",
  display: "swap",
  adjustFontFallback: false,
});
const fill = PT_Serif({
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  variable: "--fwd-fill",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Create Shift Report · Filip Wierzbiański",
  description: "Presentation for the Tonik Design & Build task: context, decisions, prototype and process.",
};

export default function Page() {
  return (
    <div className={`${serif.variable} ${brawler.variable} ${fill.variable}`}>
      <Deck />
    </div>
  );
}
