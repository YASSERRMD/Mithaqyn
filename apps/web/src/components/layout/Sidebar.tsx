'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  CheckSquare,
  RefreshCw,
  GitCompare,
  Settings,
  ClipboardList,
  Users,
  LogOut,
  Search,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contracts', label: 'Contracts', icon: FileText },
  { href: '/clauses', label: 'Clause Analysis', icon: ClipboardList },
  { href: '/risks', label: 'Risk Analysis', icon: AlertTriangle },
  { href: '/obligations', label: 'Obligations', icon: CheckSquare },
  { href: '/renewals', label: 'Renewals', icon: RefreshCw },
  { href: '/comparison', label: 'Compare', icon: GitCompare },
  { href: '/search', label: 'Semantic Search', icon: Search },
  { href: '/counterparties', label: 'Vendors', icon: Building2 },
];

const adminItems = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/audit', label: 'Audit Logs', icon: ClipboardList },
  { href: '/admin/providers', label: 'AI Providers', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  const isSuperUser = user?.role === 'SUPER_ADMIN' || user?.role === 'LEGAL_ADMIN';

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      router.push('/login');
    }
  }

  return (
    <aside
      className="flex flex-col w-64 min-h-screen fixed left-0 top-0 z-30"
      style={{ background: '#1B2A4A' }}
    >
      <div className="px-6 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <h1 className="text-xl font-bold text-white">Mithaqyn</h1>
        <div className="w-8 h-0.5 mt-1" style={{ background: '#C5A55A' }} />
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Contract Intelligence
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                background: active ? 'rgba(197,165,90,0.18)' : 'transparent',
              }}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}

        {isSuperUser && (
          <>
            <div
              className="px-3 pt-5 pb-1 text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Admin
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                    background: active ? 'rgba(197,165,90,0.18)' : 'transparent',
                  }}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
              style={{ background: '#C5A55A' }}
            >
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {user.role.replace('_', ' ')}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
