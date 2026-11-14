import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    // Keep recently visited dynamic pages in the client router cache so
    // back/forward and repeat navigation is instant. Server actions call
    // revalidatePath, which still invalidates the affected segments.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
}

export default nextConfig
