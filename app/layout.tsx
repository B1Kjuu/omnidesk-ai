import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteUrl } from "@/lib/siteUrl";
import { cn } from "@/lib/utils";

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: false,
});

const atkinsonMono = Atkinson_Hyperlegible_Mono({
  variable: "--font-atkinson-mono",
  subsets: ["latin"],
  fallback: ["ui-monospace", "monospace"],
  adjustFontFallback: false,
});

const description =
  "Customer support that answers only from a business's approved knowledge, quotes the source of every answer, and hands everything else to a person.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "OmniDesk AI: support answers with sources", template: "%s · OmniDesk AI" },
  description,
  applicationName: "OmniDesk AI",
  openGraph: { type: "website", siteName: "OmniDesk AI", title: "OmniDesk AI: every answer leaves with its source", description, url: "/" },
  twitter: { card: "summary_large_image", title: "OmniDesk AI: every answer leaves with its source", description },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", atkinson.variable, atkinsonMono.variable, "font-sans")}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Analytics />
      </body>
    </html>
  );
}
