import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Idea Lab — DBIT | Register & Form Teams",
  description:
    "Idea Lab at Don Bosco Institute of Technology — Register as a pair and get automatically matched into cross-branch teams of 6 for collaborative innovation.",
  keywords: ["Idea Lab", "DBIT", "Don Bosco", "team formation", "hackathon"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
