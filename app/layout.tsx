import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReFit — teardown & reassembly, documented',
  description:
    'Photograph and voice-note every part of a teardown so it goes back together right. Sign up, manage your shop, and choose a plan.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
