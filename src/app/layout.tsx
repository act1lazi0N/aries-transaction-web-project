import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";

export const metadata: Metadata = {
  title: "ATC project | Financial operations",
  description: "ATC project gives teams a calm, precise workspace for backend-confirmed financial operations.",
  applicationName: "ATC project",
  openGraph: {
    title: "ATC project | Financial operations",
    description: "A calm, precise workspace for backend-confirmed financial operations.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppProviders>{children}</AppProviders></body></html>;
}
