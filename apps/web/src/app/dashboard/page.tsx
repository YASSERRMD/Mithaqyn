export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: '#888' }}>
          Contract intelligence overview
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Contracts', value: '—', sub: 'Loading...' },
          { label: 'Active Contracts', value: '—', sub: 'Loading...' },
          { label: 'High Risk', value: '—', sub: 'Loading...' },
          { label: 'Upcoming Renewals', value: '—', sub: 'Loading...' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-5 shadow-sm border" style={{ borderColor: '#E8E4DC' }}>
            <p className="text-sm font-medium" style={{ color: '#888' }}>
              {card.label}
            </p>
            <p className="text-3xl font-bold mt-1" style={{ color: '#1B2A4A' }}>
              {card.value}
            </p>
            <p className="text-xs mt-1" style={{ color: '#AAA' }}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: '#E8E4DC' }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: '#1B2A4A' }}>
          Recent Contracts
        </h2>
        <div className="text-sm py-8 text-center" style={{ color: '#BBB' }}>
          No contracts yet — upload your first contract to get started.
        </div>
      </div>
    </div>
  );
}
