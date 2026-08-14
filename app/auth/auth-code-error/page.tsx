import type { Metadata } from 'next';
import { AuthCodeError } from './auth-code-error-client';

export const metadata: Metadata = {
  title: 'That link didn’t work',
  // Nothing here should ever be indexed or shared: the URL only exists as the failure
  // branch of an email link and it carries the reason in a query param.
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// Thin server wrapper. All the behaviour is in the client component, because the one
// thing this page has to be able to do that a server cannot is read a URL fragment. The
// reasoning is written out at the top of that file.
export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; description?: string }>;
}) {
  const { reason, description } = await searchParams;
  return <AuthCodeError reason={reason} description={description} />;
}
