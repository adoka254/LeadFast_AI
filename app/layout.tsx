import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadFast AI | HVAP Contractor Portal",
  description: "AI-powered lead management and contractor portal for HVAP businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
