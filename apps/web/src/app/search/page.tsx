'use client';
import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { Search, Zap, BookOpen } from 'lucide-react';

interface SearchResult {
  contractId: string;
  contractTitle: string;
  chunkIndex: number;
  chunkText: string;
  score: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'hybrid' | 'semantic'>('hybrid');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const r = await apiClient.get(`/search/${mode}?q=${encodeURIComponent(query)}&limit=20`);
      setResults(r.data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>Semantic Search</h1>
        <p className="text-sm mt-0.5" style={{ color: '#888' }}>Search contracts using AI embeddings and keyword matching</p>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#AAA' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for payment terms, liability caps, confidentiality clauses..."
              className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              style={{ borderColor: '#E8E4DC' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#1B2A4A' }}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div className="flex gap-3">
          {[
            { value: 'hybrid', label: 'Hybrid', icon: <Zap size={13} />, desc: 'Keyword + Semantic' },
            { value: 'semantic', label: 'Semantic', icon: <BookOpen size={13} />, desc: 'AI embeddings only' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMode(opt.value as 'hybrid' | 'semantic')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={{
                borderColor: mode === opt.value ? '#C5A55A' : '#E8E4DC',
                background: mode === opt.value ? '#FFF8EC' : 'white',
                color: mode === opt.value ? '#C5A55A' : '#666',
              }}
            >
              {opt.icon} {opt.label} <span style={{ color: '#AAA' }}>({opt.desc})</span>
            </button>
          ))}
        </div>
      </form>

      {searched && !loading && (
        <p className="text-xs" style={{ color: '#888' }}>
          {results.length === 0 ? 'No results found.' : `${results.length} result${results.length !== 1 ? 's' : ''} found`}
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r, i) => (
            <div key={`${r.contractId}-${r.chunkIndex}`}
              className="bg-white rounded-xl border shadow-sm p-5"
              style={{ borderColor: '#E8E4DC' }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <Link href={`/contracts/${r.contractId}`}
                  className="text-sm font-semibold hover:underline" style={{ color: '#1B2A4A' }}>
                  {r.contractTitle}
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs" style={{ color: '#AAA' }}>chunk {r.chunkIndex + 1}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: '#F7F5F0', color: '#C5A55A' }}>
                    {(r.score * 100).toFixed(0)}% match
                  </span>
                  <span className="text-xs font-bold" style={{ color: '#CCC' }}>#{i + 1}</span>
                </div>
              </div>
              <p className="text-xs leading-relaxed line-clamp-4" style={{ color: '#555' }}>
                {r.chunkText}
              </p>
            </div>
          ))}
        </div>
      )}

      {!searched && (
        <div className="bg-white rounded-xl border shadow-sm py-16 text-center" style={{ borderColor: '#E8E4DC' }}>
          <Search size={40} className="mx-auto mb-3" style={{ color: '#DDD' }} />
          <p className="text-sm font-medium" style={{ color: '#888' }}>Search across all your contracts</p>
          <p className="text-xs mt-1" style={{ color: '#AAA' }}>
            First run "Generate Embeddings" on a contract from its detail page
          </p>
        </div>
      )}
    </div>
  );
}
