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
  manifest: "/manifest.webmanifest",
  applicationName: "Nisky",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nisky",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "theme-color": "#303e51",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-background text-on-surface antialiased">
        <Providers>{children}</Providers>
        <SWRegister />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
