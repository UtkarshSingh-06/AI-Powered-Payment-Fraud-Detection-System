export default function InvestigationsPage() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Investigation Workspace</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="font-medium">Risk Timeline</h3>
          <ol className="mt-3 space-y-2 text-sm text-slate-300">
            <li>10:01 — Transaction ingested</li>
            <li>10:01 — Ensemble score 72 (Fraudulent)</li>
            <li>10:02 — Rule hit: high_amount_hard_stop</li>
            <li>10:02 — Case opened by analyst</li>
          </ol>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="font-medium">XAI Report (SHAP / LIME)</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>velocity_5m — impact +12.6 (positive)</li>
            <li>amount_ratio — impact +8.0 (positive)</li>
            <li>gnn_device_risk — impact +4.5 (positive)</li>
          </ul>
        </div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="font-medium">AI Investigation Summary</h3>
        <p className="mt-2 text-sm text-slate-300">
          High-velocity pattern detected from new device in elevated-risk region. Recommend OTP challenge and analyst review within 15 minutes.
        </p>
      </div>
    </section>
  );
}
