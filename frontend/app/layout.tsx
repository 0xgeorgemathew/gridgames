import type { Metadata } from 'next'
import { Geist, Geist_Mono, Orbitron, JetBrains_Mono } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const orbitron = Orbitron({
  variable: '--font-orbitron',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800'],
})

const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://your-domain.com'

export const metadata: Metadata = {
  title: 'Grid Games',
  description: 'Real-time multiplayer games with blockchain settlement',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  other: {
    'base:app_id': '6995cd0fe0d5d2cf831b6001',
    'fc:miniapp': JSON.stringify({
      version: 'next',
      imageUrl: `${baseUrl}/og.png`,
      button: {
        title: 'Play Now',
        action: {
          type: 'launch_miniapp',
          name: 'Grid Games',
          url: baseUrl,
          splashImageUrl: `${baseUrl}/splash.png`,
          splashBackgroundColor: '#000000',
        },
      },
    }),
    // Backward compatibility with fc:frame
    'fc:frame': JSON.stringify({
      version: 'next',
      imageUrl: `${baseUrl}/og.png`,
      button: {
        title: 'Play Now',
        action: {
          type: 'launch_frame',
          name: 'Grid Games',
          url: baseUrl,
          splashImageUrl: `${baseUrl}/splash.png`,
          splashBackgroundColor: '#000000',
        },
      },
    }),
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
