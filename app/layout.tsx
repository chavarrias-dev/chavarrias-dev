import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins-family",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#227DE8",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Chavarrias CRM",
  description: "CRM de Chavarrias Servicios Aduanales SA de CV",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Chavarrias CRM",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
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
