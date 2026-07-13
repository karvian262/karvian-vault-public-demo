import type { Metadata } from "next";
import "./globals.css";
import KyraAlwaysActive from "@/components/KyraAlwaysActive";
import StartupExperience from "@/components/StartupExperience";

export const metadata: Metadata = {
  title: "Karvian Vault",
  description: "Personal AI Founder Operating System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body><StartupExperience/>{children}<KyraAlwaysActive/></body>
    </html>
  );
}
