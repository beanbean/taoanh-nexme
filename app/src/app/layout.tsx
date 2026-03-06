import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ClientErrorBoundary from '@/components/ClientErrorBoundary';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Công cụ tạo ảnh thi đấu Marathon của Nexme',
  description: 'Tạo ảnh cho đội chơi của bạn để tuyên đường',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <ClientErrorBoundary>
          {children}
        </ClientErrorBoundary>
      </body>
    </html>
  );
}
