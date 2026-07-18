import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexa | Document Intelligence",
  description: "Understand long documents in minutes."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
