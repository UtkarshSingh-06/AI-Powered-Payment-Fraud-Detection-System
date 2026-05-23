async function fetchMetrics() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/analytics/dashboard`, {
      cache: 'no-store',
      headers: process.env.API_TOKEN ? { Authorization: `Bearer ${process.env.API_TOKEN}` } : {}
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const data = await fetchMetrics();
  const summary = data?.summary || { totalTransactions: 0, fraudRate: 0, blockedCount: 0 };

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Executive Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Transactions" value={summary.totalTransactions} />
        <StatCard label="Fraud Rate" value={`${summary.fraudRate || 0}%`} />
        <StatCard label="Blocked" value={summary.blockedCount || 0} />
      </div>
      {!data && (
        <p className="text-sm text-amber-300">Connect API token to load live analytics (gateway :8080).</p>
      )}
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
