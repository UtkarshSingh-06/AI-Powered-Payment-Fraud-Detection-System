import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold">Financial Risk Intelligence Platform</h2>
      <p className="max-w-2xl text-slate-300">
        Real-time fraud detection, AML monitoring, explainable AI decisioning, and analyst case management for banks, fintechs, and digital wallets.
      </p>
      <div className="flex gap-4">
        <Link className="rounded-lg bg-indigo-600 px-4 py-2 font-medium" href="/dashboard">
          Open Dashboard
        </Link>
        <Link className="rounded-lg border border-slate-700 px-4 py-2" href="/investigations">
          Investigation Workspace
        </Link>
      </div>
    </section>
  );
}
