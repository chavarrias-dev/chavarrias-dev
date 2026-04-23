import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins-family",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chavarrias CRM",
  description: "Portal CRM",
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
