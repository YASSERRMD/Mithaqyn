import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#F7F5F0' }}>
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold" style={{ color: '#1B2A4A' }}>
            Mithaqyn
          </h1>
          <div className="w-16 h-1 mx-auto rounded" style={{ background: '#C5A55A' }} />
          <p className="text-xl mt-3" style={{ color: '#3A3A3A', opacity: 0.7 }}>
            Enterprise Contract Intelligence Platform
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-block px-8 py-3 rounded-lg text-white font-medium transition-colors"
          style={{ background: '#1B2A4A' }}
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
