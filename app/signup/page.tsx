import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignupForm } from './signup-form';

export const dynamic = 'force-dynamic';

// Server wrapper for the TRIAL signup: a new shop, its owner, 14 days. If the visitor is
// already signed in, the dashboard resolves shop / pending-join / create-shop instead of
// showing a second signup.
//
// Joining a shop is NOT done here any more (Jon, 2026-10-22 #6): /join/<code> names the shop
// and never mentions a trial. An old /signup?join=<code> link is sent there.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ join?: string }>;
}) {
  const { join } = await searchParams;
  if (join?.trim()) redirect(`/join/${encodeURIComponent(join.trim())}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return <SignupForm />;
}
