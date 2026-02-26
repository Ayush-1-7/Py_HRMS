"use client";

import { useState } from "react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import Sidebar from "@/components/global/sidebar";
import Navbar from "@/components/global/navbar";
import CommandSearch from "@/components/global/CommandSearch";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>ElevateHR | Premium HR Management</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={`${inter.variable} ${plusJakarta.variable} font-sans antialiased text-foreground`}>
        <ThemeProvider>
          <AuthProvider>
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />

            <Navbar
              onMenuClick={() => setIsSidebarOpen(true)}
            />

            <CommandSearch />

            <main className="layout-content">
              <div className="app-container">
                {children}
              </div>
            </main>

            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
