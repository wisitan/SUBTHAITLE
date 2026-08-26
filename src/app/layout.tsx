import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

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
    <html lang="th">
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body className={`${notoSansThai.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
