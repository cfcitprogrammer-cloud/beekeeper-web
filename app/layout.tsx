import { Fraunces, Space_Grotesk, Space_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers/react-query"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toast"

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
})

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
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
        spaceMono.variable,
        "font-sans",
        spaceGrotesk.variable,
        fraunces.variable
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
