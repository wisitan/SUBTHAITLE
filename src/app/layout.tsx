import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "sub[THAI]tle — AI Thai Caption Studio",
  description: "ถอดเสียงภาษาไทยอัตโนมัติ สวยสะกดตา ไฮไลต์ทีละคำ พร้อมส่งออก FCPXML, SRT หรือฝังซับลงวิดีโอ MP4 ได้ทันที",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="overflow-x-hidden">
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body className={`${notoSansThai.className} antialiased overflow-x-hidden max-w-full w-full bg-zinc-950 text-zinc-100`}>
        {children}
      </body>
    </html>
  );
}
