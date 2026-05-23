const REGIONS = [
  { region: 'IN', risk: 42, volume: 1200 },
  { region: 'US', risk: 28, volume: 980 },
  { region: 'GB', risk: 35, volume: 640 },
  { region: 'NG', risk: 78, volume: 210 }
];

export default function HeatmapPage() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Live Fraud Heatmap</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {REGIONS.map((item) => (
          <div
            key={item.region}
            className="rounded-xl border border-slate-800 p-4"
            style={{ background: `rgba(239,68,68,${item.risk / 100})` }}
          >
            <p className="font-semibold">{item.region}</p>
            <p className="text-sm">Risk score: {item.risk}</p>
            <p className="text-sm">Volume: {item.volume}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
