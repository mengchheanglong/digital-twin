import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeProvider from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui";

export const metadata: Metadata = {
  title: "Digital Twin - Personal Intelligence",
  description:
    "Your personal digital twin for self-reflection, habit tracking, and growth.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.svg", type: "image/svg+xml", sizes: "192x192" },
      { url: "/icon-512.svg", type: "image/svg+xml", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    title: "Digital Twin",
    statusBarStyle: "black-translucent",
  },
  applicationName: "Digital Twin",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7c5cfc",
};

const themeInitScript = `
  (function() {
    try {
      var theme = localStorage.getItem("digital-twin-theme");
      var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var resolved = theme || (systemDark ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", resolved);
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider position="bottom-right">{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
