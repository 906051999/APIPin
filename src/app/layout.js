import { ConfigProvider, App } from 'antd';
import './globals.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { MusicProvider } from '@/contexts/MusicContext';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: '音乐播放器',
  description: '支持多平台的音乐播放器',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body className={inter.className}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#1677ff',
              colorBgContainer: '#fafafa',
              colorBgElevated: '#ffffff',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            },
          }}
        >
          <App>
            <MusicProvider>
              {children}
            </MusicProvider>
          </App>
          <Analytics />
          <SpeedInsights />
        </ConfigProvider>
      </body>
    </html>
  );
}
