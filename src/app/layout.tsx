import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeProvider from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui";

export const metadata: Metadata = {
  title: "Digital Twin - Personal Intelligence",
  description:
    "Your personal digital twin for self-reflection, habit tracking, and growth.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
