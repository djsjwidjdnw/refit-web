import type { Metadata } from 'next';
import { safeNext } from '@/lib/auth/post-auth-path';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in to ReFitIQ',
  description: 'Sign in to your ReFitIQ shop on the web: billing, your team and your invite link.',
};


// Server wrapper so the form can read `?next=` without a Suspense boundary around
// useSearchParams. Only a same-site path survives safeNext.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <LoginForm next={safeNext(next ?? null)} />;
}
