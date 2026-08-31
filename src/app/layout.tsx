import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { AuthProvider } from "@/context/auth-context";
import { AdminDevToolbar } from "@/components/admin-dev-toolbar";
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
  metadataBase: new URL('https://subthaitle.vercel.app'),
  title: {
    default: 'SUBTHAITLE — ระบบสร้าง Subtitle ภาษาไทยอัตโนมัติ สวยสะกดตา ไฮไลต์ทีละคำ',
    template: '%s | SUBTHAITLE',
  },
  description:
    'เว็บแอปถอดเสียงภาษาไทยอัตโนมัติด้วย AI พร้อมสตูดิโอปรับแต่งสไตล์ (CapCut Aesthetic), ไฮไลท์คำพูด Real-time, Export SRT, FCPXML, Premiere XML และ Burn Subtitle ฝังลง MP4 ได้ในตัว',
  keywords: [
    'Thai Subtitle',
    'ซับไตเติลภาษาไทย',
    'ถอดเสียงภาษาไทย',
    'AI Transcription',
    'Whisper Thai',
    'Auto Caption',
    'FCPXML Subtitle',
    'Burn Subtitle MP4',
    'Word Highlight',
    'CapCut Style Subtitle',
  ],
  authors: [{ name: 'SUBTHAITLE Team' }],
  creator: 'SUBTHAITLE',
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    url: 'https://subthaitle.vercel.app',
    title: 'SUBTHAITLE — AI Thai Caption Studio',
    description: 'ถอดเสียงภาษาไทยอัตโนมัติ สวยสะกดตา ไฮไลต์ทีละคำ พร้อมส่งออก FCPXML, SRT หรือเบิร์นซับลงวิดีโอ MP4 ได้ทันที',
    siteName: 'SUBTHAITLE',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'SUBTHAITLE Logo and Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SUBTHAITLE — AI Thai Caption Studio',
    description: 'ถอดเสียงภาษาไทยอัตโนมัติ สวยสะกดตา ไฮไลต์ทีละคำ พร้อมเบิร์นซับลงวิดีโอ MP4 ได้ทันที',
    images: ['/logo.png'],
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
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
        <AuthProvider>
          {children}
          <AdminDevToolbar />
        </AuthProvider>
      </body>
    </html>
  );
}
