const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: '#DCFCE7', color: '#166534' },
  DRAFT: { bg: '#F3F4F6', color: '#6B7280' },
  EXPIRED: { bg: '#FEE2E2', color: '#991B1B' },
  TERMINATED: { bg: '#FEE2E2', color: '#991B1B' },
  UNDER_REVIEW: { bg: '#FEF9C3', color: '#854D0E' },
  PENDING_SIGNATURE: { bg: '#DBEAFE', color: '#1E40AF' },
  ARCHIVED: { bg: '#F3F4F6', color: '#6B7280' },
};

const RISK_COLORS: Record<string, { bg: string; color: string }> = {
  LOW: { bg: '#DCFCE7', color: '#166534' },
  MEDIUM: { bg: '#FEF9C3', color: '#854D0E' },
  HIGH: { bg: '#FFEDD5', color: '#9A3412' },
  CRITICAL: { bg: '#FEE2E2', color: '#991B1B' },
};

export function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: colors.bg, color: colors.color }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function RiskBadge({ level }: { level: string }) {
  const colors = RISK_COLORS[level] ?? { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: colors.bg, color: colors.color }}
    >
      {level}
    </span>
  );
}
