async function fetchCases() {
  try {
    const base = process.env.NEXT_PUBLIC_CASE_API_URL || 'http://localhost:5004';
    const res = await fetch(`${base}/`, { cache: 'no-store' });
    if (!res.ok) return { cases: [] };
    return res.json();
  } catch {
    return { cases: [] };
  }
}

export default async function CasesPage() {
  const { cases = [] } = await fetchCases();
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Analyst Case Management</h2>
      <ul className="space-y-2">
        {cases.length === 0 && <li className="text-slate-400">No cases yet — create via case-service API.</li>}
        {cases.map((item) => (
          <li key={item.case_id || item.payload?.caseId} className="rounded-lg border border-slate-800 p-3">
            <p className="font-medium">{item.payload?.title || item.case_id}</p>
            <p className="text-sm text-slate-400">Status: {item.status}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
