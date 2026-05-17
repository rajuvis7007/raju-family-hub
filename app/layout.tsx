import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FamilyProvider } from "./context/FamilyContext";
import { TasksProvider } from "./context/TasksContext";
import { PhotosProvider } from "./context/PhotosContext";
import { AppShell } from "./components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Raju Family Dashboard",
  description: "Our family hub for photos, tasks, and events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-slate-50 font-sans">
        <FamilyProvider>
          <TasksProvider>
            <PhotosProvider>
              <AppShell>{children}</AppShell>
            </PhotosProvider>
          </TasksProvider>
        </FamilyProvider>
      </body>
    </html>
  );
}
