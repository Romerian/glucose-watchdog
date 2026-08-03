import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"] });
const display = Fraunces({ variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Glucose Watchdog",
  description: "A calm, vigilant view of your glucose patterns.",
  openGraph: { title: "Glucose Watchdog", description: "Your glucose signal, watched with care.", images: ["/glucose-watchdog-bulldog.png"] },
  icons: { icon: "/glucose-watchdog-bulldog.png", shortcut: "/glucose-watchdog-bulldog.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${display.variable}`}>{children}</body></html>;
}
