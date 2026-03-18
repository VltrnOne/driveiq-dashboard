import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'DriveIQ — AI Coffee Shop',
  description: 'Intelligent drive-thru customer recognition dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F5F0EB]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
