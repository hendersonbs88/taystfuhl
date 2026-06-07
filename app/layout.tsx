import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taystfuhl | Cooking Video Recipe Decoder",
  description: "Paste a cooking video. Get the real recipe.",
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
