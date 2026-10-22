import { safeNext } from '@/lib/auth/post-auth-path';
import { LoginForm } from './login-form';

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
