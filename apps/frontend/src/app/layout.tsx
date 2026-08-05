import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { SWRegister } from "@/components/pwa/SWRegister";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Nisky", template: "%s - Nisky" },
  description: "Tu espacio para organizar el día, tareas, hábitos y notas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-background text-on-surface antialiased">
        <Providers>{children}</Providers>
        <SWRegister />
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
