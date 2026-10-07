import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import {
  PWA_APP_ICON_TYPE,
  PWA_APP_ICON_URL,
} from "@/lib/pwa-app-icon";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins-family",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Chavarrias CRM",
  description: "CRM de Chavarrias Servicios Aduanales SA de CV",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Chavarrias CRM",
  },
  icons: {
    icon: [
      {
        url: PWA_APP_ICON_URL,
        sizes: "192x192",
        type: PWA_APP_ICON_TYPE,
      },
      {
        url: PWA_APP_ICON_URL,
        sizes: "512x512",
        type: PWA_APP_ICON_TYPE,
      },
    ],
    apple: [
      {
        url: PWA_APP_ICON_URL,
        sizes: "180x180",
        type: PWA_APP_ICON_TYPE,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${poppins.variable} h-full`}>
      <body className="font-poppins min-h-full flex flex-col bg-[#FFFFFF] text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
