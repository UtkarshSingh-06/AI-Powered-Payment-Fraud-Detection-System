import './globals.css';

export const metadata = {
  title: 'FraudShield Enterprise',
  description: 'AI-powered financial risk intelligence platform'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <h1 className="text-xl font-semibold">FraudShield Enterprise</h1>
            <nav className="flex gap-4 text-sm text-slate-300">
              <a href="/dashboard">Dashboard</a>
              <a href="/heatmap">Fraud Heatmap</a>
              <a href="/cases">Cases</a>
              <a href="/investigations">Investigations</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
