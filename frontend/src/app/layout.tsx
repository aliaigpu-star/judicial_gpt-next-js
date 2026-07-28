import type { Metadata } from "next";
import { Inter, Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

// Using Inter font like ChatGPT
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

// Landing page fonts
const heading = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-heading",
  display: "swap",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JudicialGPT",
  description: "Advanced AI legal assistant for judicial research and analysis",
  keywords: ["legal", "AI", "judicial", "chat", "research", "law"],
  icons: {
    icon: "/judicial-logo.png",
    shortcut: "/judicial-logo.png",
    apple: "/judicial-logo.png",
  },
};

// Inline script to immediately set theme class before paint
const themeScript = `
(function(){
  try {
    var m = localStorage.getItem('themeMode');
    var t = m === 'dark' ? 'dark' : m === 'light' ? 'light' : 
      (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.add(t);
    document.documentElement.style.colorScheme = t;
  } catch(e){}
})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} style={{ opacity: 1 }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
