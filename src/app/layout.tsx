import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orion - The Open Source Hub",
  description: "A platform designed to connect developers with open-source projects on GitHub needing help. Find your next contribution opportunity based on your skills and interests.",
  keywords: ["open source", "github", "contribute", "developer", "projects", "issues", "good first issue"],
  authors: [{ name: "Orion" }],
  openGraph: {
    title: "Orion - The Open Source Hub",
    description: "Find your next open source contribution opportunity based on your skills and interests.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <AuthProvider>
          <SmoothScroll>
            <AppLayout>
              {children}
            </AppLayout>
          </SmoothScroll>
        </AuthProvider>
      </body>
    </html>
  );
}


