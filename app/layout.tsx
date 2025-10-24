import type React from "react"
import type { Metadata } from "next"
import { Poppins, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { RealTimeProvider } from "@/components/real-time-provider"
import { ToastProvider } from "@/components/toast-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { ClientProviders } from "@/components/client-providers"
import { AuthProvider } from "@/components/auth-provider"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "DeLuxe Job",
  description: "Plataforma premium de conteúdo exclusivo",
  generator: "Anoxqui",
  manifest: "/manifest.json",
  themeColor: "#ec4899",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DeLuxe Job",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={`font-sans ${poppins.variable} ${inter.variable} antialiased`}>
        <ErrorBoundary>
          <ToastProvider>
            <AuthProvider>
              <RealTimeProvider>
                <ClientProviders>
                  <Suspense fallback={null}>{children}</Suspense>
                </ClientProviders>
              </RealTimeProvider>
            </AuthProvider>
          </ToastProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}
