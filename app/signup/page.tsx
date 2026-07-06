import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignupForm } from './signup-form';

export const dynamic = 'force-dynamic';

// Server wrapper: reads the (optional) invite code from the URL and, if the visitor is
// already signed in, sends them to the dashboard (which resolves shop / pending-join /
// create-shop) instead of showing a second signup. The actual form is a client component.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ join?: string }>;
}) {
  const { join } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const joinCode = join?.trim() ? join.trim() : null;
  return <SignupForm joinCode={joinCode} />;
}
