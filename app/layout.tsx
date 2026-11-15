import type { Metadata } from "next";
import { SquircleNoScript } from "@squircle-js/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shaquon Hamilton — Developer & Creative Builder",
  description: "Shaquon Hamilton is a developer and creative builder from Barbados.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SquircleNoScript />
        {children}
      </body>
    </html>
  );
}
