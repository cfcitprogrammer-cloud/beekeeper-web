import { Geist_Mono, Nunito_Sans, Noto_Sans } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers/react-query"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toast"

const notoSansHeading = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
})

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        nunitoSans.variable,
        notoSansHeading.variable
      )}
    >
      <body>
        <Providers>
          <ThemeProvider>{children}</ThemeProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
