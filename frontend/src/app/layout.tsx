import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { SettingsSynchronizer } from "@/components/settings-synchronizer";
import { MemoryInitializer } from "@/components/memory-initializer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

const appName = process.env.NEXT_PUBLIC_APP_NAME!;

export const metadata: Metadata = {
  title: `${appName} - AI Keyboard Assistant`,
  description: `${appName} - AI Keyboard Assistant`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${outfit.variable}`}>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SettingsSynchronizer />
            <MemoryInitializer />
            {children}
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
