import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./ui.css";

export const metadata: Metadata = {
  title: "Nova Studio — A complete dev environment in your browser",
  description:
    "A local-first browser IDE with Monaco, a file explorer, WebAssembly runtimes, terminal, live previews, and IndexedDB persistence. Deployable on Vercel.",
  applicationName: "Nova Studio",
  keywords: ["browser IDE", "Monaco", "WebAssembly", "IndexedDB", "Vercel", "code editor"],
  openGraph: {
    title: "Nova Studio — a complete dev environment in your browser",
    description:
      "Monaco, a file explorer, terminal, live previews and WebAssembly runtimes — local-first and deployable on Vercel.",
    type: "website",
    siteName: "Nova Studio",
  },
  twitter: {
    card: "summary",
    title: "Nova Studio — a complete dev environment in your browser",
    description:
      "Monaco, a file explorer, terminal, live previews and WebAssembly runtimes — local-first and deployable on Vercel.",
  },
};

export const viewport: Viewport = {
  themeColor: "#080b12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const themeScript = `
try {
  var saved = localStorage.getItem("nova-theme");
  document.documentElement.dataset.theme = saved === "light" ? "light" : "dark";
} catch (error) {
  document.documentElement.dataset.theme = "dark";
}
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://esm.sh" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
