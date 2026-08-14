import type { Metadata } from 'next';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata: Metadata = {
  title: 'Reset your password',
  robots: { index: false, follow: false },
};

// Server wrapper so the page itself stays static-ish and the form owns the client
// boundary, matching how /signup is put together.
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
