'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login(email, password);
      const { accessToken, user } = res.data;
      setAuth(user, accessToken);
      router.push('/dashboard');
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#F7F5F0' }}
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center" style={{ background: '#1B2A4A' }}>
            <h1 className="text-3xl font-bold text-white tracking-tight">Mithaqyn</h1>
            <div className="w-12 h-0.5 mx-auto mt-2" style={{ background: '#C5A55A' }} />
            <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Contract Intelligence Platform
            </p>
          </div>

          <div className="px-8 py-8">
            <h2 className="text-xl font-semibold mb-6" style={{ color: '#1B2A4A' }}>
              Sign in to your account
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: '#3A3A3A' }}
                >
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    borderColor: '#D4C8A8',
                    color: '#3A3A3A',
                    background: '#FAFAF8',
                  }}
                  placeholder="you@mithaqyn.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: '#3A3A3A' }}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    borderColor: '#D4C8A8',
                    color: '#3A3A3A',
                    background: '#FAFAF8',
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-white font-medium text-sm transition-opacity disabled:opacity-60"
                style={{ background: '#1B2A4A' }}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>

          <div className="px-8 pb-6 text-center text-xs" style={{ color: '#888' }}>
            AI-assisted analysis. Not legal advice.
          </div>
        </div>
      </div>
    </div>
  );
}
