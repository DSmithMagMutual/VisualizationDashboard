import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ThemeRegistry from '../components/ThemeRegistry';
import QueryProvider from '../components/QueryProvider';
import Navigation from '../components/Navigation';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Jira Dashboard',
  description: 'A minimalist dashboard for Jira data visualization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: '#181C24' }}>
        <QueryProvider>
          <ThemeRegistry>
            <Navigation />
            {children}
          </ThemeRegistry>
        </QueryProvider>
      </body>
    </html>
  )
} 