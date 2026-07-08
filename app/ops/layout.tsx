import Link from 'next/link';
import { requireOperator } from '@/lib/ops/access';

export const dynamic = 'force-dynamic';

// Every /ops route renders inside this layout, which re-checks the operator gate server-side
// (in addition to middleware). Non-operators are redirected to home before any child renders.
export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const op = await requireOperator();
  return (
    <>
      <header className="container">
        <div className="dash-header">
          <Link href="/ops" className="brand" style={{ textDecoration: 'none' }}>
            Re<span>Fit</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: 14, marginLeft: 8 }}>
              ops
            </span>
          </Link>
          <div className="row">
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{op.email}</span>
            <Link href="/dashboard" style={{ color: 'var(--accent)', fontSize: 14 }}>
              Dashboard →
            </Link>
          </div>
        </div>
      </header>
      <main className="container" style={{ paddingBottom: 64 }}>
        {children}
      </main>
    </>
  );
}
