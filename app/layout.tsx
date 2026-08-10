import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'
import { Footer } from '@/components/Footer'
import { Navbar } from '@/components/Navbar'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['500', '600'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'LevPriv — Private, self-destructing notes',
  description:
    'Share a note that disappears on its own. No accounts, no tracking, encrypted at rest.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${fraunces.variable} font-sans bg-base-black text-base-white antialiased min-h-screen flex flex-col`}
      >
        <div className="flex-1 flex flex-col">
          <Navbar />
          <div className="flex-1 flex flex-col">{children}</div>
        </div>
        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
