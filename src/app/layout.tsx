import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-questora-sans",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-questora-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-questora-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Questora",
    template: "%s · Questora",
  },
  description: "Estudos para concurso: questões, live e revisão",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${sans.variable} ${display.variable} ${mono.variable}`}
    >
      <body className={sans.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
