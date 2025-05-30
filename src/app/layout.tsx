import type { Metadata } from "next";
import { Poppins } from "next/font/google"; // Changed from GeistSans and GeistMono
import "./globals.css";
import { Providers } from "@/components/Providers";
import { siteConfig } from "@/config/site";

const poppins = Poppins({ // Configure Poppins
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'], // Added more weights for flexibility
  variable: '--font-poppins', 
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name, // Will use the updated name
    template: `%s | ${siteConfig.name}`, // Will use the updated name
  },
  description: siteConfig.description,
  keywords: ["CRM", "Maintenance", "Luxe Maintainance", "Automation"], // Adjusted keyword
  authors: [{ name: "Luxe Maintainance Team" }], // Adjusted author
  creator: "Luxe Maintainance Team", // Adjusted creator
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name, // Will use the updated name
    description: siteConfig.description,
    siteName: siteConfig.name, // Will use the updated name
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name, // Will use the updated name
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name, // Will use the updated name
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@YourTwitterHandle", 
  },
  icons: {
    icon: "/favicon.ico", 
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} font-sans antialiased bg-background text-foreground`} // Used Poppins variable
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
