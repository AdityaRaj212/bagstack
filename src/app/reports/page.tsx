'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { formatDateDMY } from '@/lib/date';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Scale,
  Tag,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  List,
  Columns2,
} from 'lucide-react';

/* ──── SVG Speedometer Gauge ──── */
export function SpeedometerGauge({ value, max, label, sublabel }: { value: number; max: number; label: string; sublabel?: string }) {
  const safeVal = Number.isFinite(value) ? value : 0;
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const clampedPercent = Math.min(100, Math.max(0, (safeVal / safeMax) * 100));
  // Arc from 135° to 405° (270° sweep)
  const startAngle = 135;
  const sweepAngle = 270;
  const endAngle = startAngle + sweepAngle;
  const radius = 80;
  const cx = 100;
  const cy = 100;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (from: number, to: number) => {
    const x1 = cx + radius * Math.cos(toRad(from));
    const y1 = cy + radius * Math.sin(toRad(from));
    const x2 = cx + radius * Math.cos(toRad(to));
    const y2 = cy + radius * Math.sin(toRad(to));
    const largeArc = to - from > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const needleAngle = startAngle + (clampedPercent / 100) * sweepAngle;
  const needleLen = radius - 15;
  const nx = cx + needleLen * Math.cos(toRad(needleAngle));
  const ny = cy + needleLen * Math.sin(toRad(needleAngle));

  // Color zones
  const getColor = (pct: number) => {
    if (pct <= 50) return 'var(--color-income)';
    if (pct <= 80) return 'var(--color-warning)';
    return 'var(--color-expense)';
  };

  const fillAngle = startAngle + (clampedPercent / 100) * sweepAngle;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
      <svg viewBox="0 0 200 170" width="180" height="153" style={{ overflow: 'visible' }}>
        {/* Background track */}
        <path
          d={arcPath(startAngle, endAngle)}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        {clampedPercent > 0 && (
          <path
            d={arcPath(startAngle, fillAngle)}
            fill="none"
            stroke={getColor(clampedPercent)}
            strokeWidth="12"
            strokeLinecap="round"
            style={{ transition: 'all 600ms ease' }}
          />
        )}
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="var(--text-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transition: 'all 600ms ease' }}
        />
        <circle cx={cx} cy={cy} r="5" fill="var(--text-primary)" />
        {/* Center value */}
        <text
          x={cx}
          y={cy + 28}
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize="20"
          fontWeight="700"
          fontFamily="inherit"
        >
          {Math.round(clampedPercent)}%
        </text>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sublabel}</div>}
      </div>
    </div>
  );
}

/* ──── Tooltip Bar for Daily Spending ──── */
export function DailyBar({ day, date, spent, cumulative, maxSpend, avgSpend }: {
  day: number; date: string; spent: number; cumulative: number; maxSpend: number; avgSpend: number;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const safeMax = Number.isFinite(maxSpend) && maxSpend > 0 ? maxSpend : 100;
  const safeSpent = Number.isFinite(spent) ? spent : 0;
  const barHeight = safeMax > 0 ? (safeSpent / safeMax) * 110 : 0;
  const hasSpend = safeSpent > 0;
  const isSpike = safeSpent > avgSpend * 1.5;

  return (
    <div
      ref={barRef}
      tabIndex={0}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100%',
        justifyContent: 'flex-end',
        position: 'relative',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: `${Math.max(2, barHeight) + 8}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: '0.4rem 0.6rem',
            fontSize: '0.7rem',
            whiteSpace: 'nowrap',
            zIndex: 20,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            color: 'var(--text-primary)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 600 }}>Day {day} · {formatDateDMY(date)}</div>
          <div>Spent: <strong>₹{(safeSpent / 100).toLocaleString('en-IN')}</strong></div>
          <div style={{ color: 'var(--text-muted)' }}>Cumulative: ₹{((cumulative || 0) / 100).toLocaleString('en-IN')}</div>
        </div>
      )}
      <div
        style={{
          width: '100%',
          maxWidth: '14px',
          height: `${Math.max(2, barHeight)}px`,
          background: hasSpend
            ? isSpike
              ? 'linear-gradient(180deg, #F43F5E, #BE123C)'
              : 'linear-gradient(180deg, #6366F1, #4F46E5)'
            : 'var(--border-subtle)',
          borderRadius: '2px 2px 0 0',
          transition: 'height 300ms ease',
          cursor: 'pointer',
        }}
      />
    </div>
  );
}

/* ──── Interactive SVG Donut / Pie Chart ──── */
const DONUT_PALETTE = [
  '#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6',
  '#8B5CF6', '#14B8A6', '#F43F5E', '#06B6D4', '#EAB308',
  '#84CC16', '#A855F7',
];

interface DonutSliceData {
  id: string;
  name: string;
  total: number;
  percentage: number;
  color: string;
  count?: number;
}

export function ExpenseDonutChart({
  items,
  totalSpend,
  analyticsLabel,
  hoveredId,
  onHover,
}: {
  items: Array<{ id: string; name: string; total: number; percentage: number; color?: string; count?: number }>;
  totalSpend: number;
  analyticsLabel: string;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}) {
  const cx = 110;
  const cy = 110;
  const rIn = 60;
  const rOutDefault = 88;
  const rOutHover = 96;

  // Curated color mapping
  const slices: DonutSliceData[] = useMemo(() => {
    return (items || [])
      .filter(it => (it?.total || 0) > 0)
      .map((it, idx) => ({
        ...it,
        id: it.id || `slice_${idx}`,
        name: it.name || 'Uncategorized',
        total: it.total || 0,
        percentage: Number.isFinite(it.percentage) ? it.percentage : 0,
        color: it.color || DONUT_PALETTE[idx % DONUT_PALETTE.length],
      }));
  }, [items]);

  const totalSum = useMemo(() => {
    return slices.reduce((acc, s) => acc + (s.total || 0), 0);
  }, [slices]);

  // Angles for each slice
  const sliceAngles = useMemo(() => {
    if (totalSum <= 0 || slices.length === 0) return [];
    let currentAngle = 0;
    return slices.map(s => {
      const angleSweep = (s.total / totalSum) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSweep;
      currentAngle = endAngle;
      return { ...s, startAngle, endAngle, angleSweep };
    });
  }, [slices, totalSum]);

  const activeSlice = useMemo(() => {
    if (!hoveredId) return null;
    return slices.find(s => s.id === hoveredId) || null;
  }, [hoveredId, slices]);

  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

  const getPath = (startAngle: number, endAngle: number, isHovered: boolean) => {
    const rOut = isHovered ? rOutHover : rOutDefault;
    const sweep = endAngle - startAngle;

    if (sweep >= 359.9) {
      return `
        M ${cx} ${cy - rOut}
        A ${rOut} ${rOut} 0 1 1 ${cx - 0.01} ${cy - rOut}
        L ${cx - 0.01} ${cy - rIn}
        A ${rIn} ${rIn} 0 1 0 ${cx} ${cy - rIn}
        Z
      `;
    }

    const gap = slices.length > 1 ? Math.min(1.5, Math.max(0, sweep * 0.1)) : 0;
    const actualStart = startAngle + gap / 2;
    const actualEnd = Math.max(actualStart + 0.05, endAngle - gap / 2);

    const x1 = cx + rOut * Math.cos(toRad(actualStart));
    const y1 = cy + rOut * Math.sin(toRad(actualStart));
    const x2 = cx + rOut * Math.cos(toRad(actualEnd));
    const y2 = cy + rOut * Math.sin(toRad(actualEnd));

    const x3 = cx + rIn * Math.cos(toRad(actualEnd));
    const y3 = cy + rIn * Math.sin(toRad(actualEnd));
    const x4 = cx + rIn * Math.cos(toRad(actualStart));
    const y4 = cy + rIn * Math.sin(toRad(actualStart));

    const largeArc = (actualEnd - actualStart) > 180 ? 1 : 0;

    return `
      M ${x1} ${y1}
      A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;
  };

  if (slices.length === 0 || totalSum === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', color: 'var(--text-muted)' }}>
        <svg viewBox="0 0 220 220" width="180" height="180">
          <circle cx="110" cy="110" r="75" fill="none" stroke="var(--border-subtle)" strokeWidth="22" />
          <text x="110" y="115" textAnchor="middle" fill="var(--text-muted)" fontSize="12" fontWeight="500">No expenses</text>
        </svg>
      </div>
    );
  }

  const activeSliceName = activeSlice?.name || 'Uncategorized';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <svg
        viewBox="0 0 220 220"
        width="210"
        height="210"
        style={{ overflow: 'visible' }}
        role="img"
        aria-label={`Donut chart of expenses by ${analyticsLabel}`}
      >
        {/* Background center circle */}
        <circle cx={cx} cy={cy} r={rIn} fill="var(--bg-surface)" />

        {/* Slices */}
        {sliceAngles.map(s => {
          const isHovered = hoveredId === s.id;
          const isDimmed = hoveredId !== null && !isHovered;
          return (
            <path
              key={s.id}
              d={getPath(s.startAngle, s.endAngle, isHovered)}
              fill={s.color}
              opacity={isDimmed ? 0.35 : 1}
              style={{
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
              }}
              onMouseEnter={() => onHover(s.id)}
              onMouseLeave={() => onHover(null)}
              tabIndex={0}
              onFocus={() => onHover(s.id)}
              onBlur={() => onHover(null)}
            />
          );
        })}

        {/* Center cutout label */}
        <text
          x={cx}
          y={activeSlice ? cy - 14 : cy - 10}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize="9.5"
          fontWeight="600"
          letterSpacing="0.04em"
          style={{ textTransform: 'uppercase' }}
        >
          {activeSlice
            ? (activeSliceName.length > 14 ? activeSliceName.substring(0, 12) + '…' : activeSliceName)
            : (analyticsLabel === 'Tag' ? 'TOTAL TAGGED' : 'TOTAL SPENT')}
        </text>

        <text
          x={cx}
          y={activeSlice ? cy + 8 : cy + 12}
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize={activeSlice ? '15' : '17'}
          fontWeight="700"
        >
          ₹{Math.round((activeSlice ? activeSlice.total : (totalSpend || totalSum)) / 100).toLocaleString('en-IN')}
        </text>

        <text
          x={cx}
          y={activeSlice ? cy + 24 : cy + 28}
          textAnchor="middle"
          fill={activeSlice ? activeSlice.color : 'var(--text-muted)'}
          fontSize="11"
          fontWeight="600"
        >
          {activeSlice ? `${activeSlice.percentage}% of ${analyticsLabel === 'Tag' ? 'tagged' : 'total'}` : `${slices.length} ${analyticsLabel.toLowerCase()}s`}
        </text>
      </svg>
    </div>
  );
}

export default function ReportsPage({
  initialData,
  initialForecast,
}: {
  initialData?: any;
  initialForecast?: any;
} = {}) {
  const { refreshKey } = useApp();

  // Selected Month (YYYY-MM)
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Month Comparison State
  const [compareEnabled, setCompareEnabled] = useState(false);
  const prevMonthStr = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prev = new Date(year, month - 2, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);
  const [compareMonth, setCompareMonth] = useState<string>(prevMonthStr);

  // Analytics view mode: 'category' or 'tag'
  const [analyticsView, setAnalyticsView] = useState<'category' | 'tag'>('category');

  // Chart presentation mode: 'split' | 'chart' | 'list'
  const [chartLayout, setChartLayout] = useState<'split' | 'chart' | 'list'>('split');
  const [hoveredAnalyticsId, setHoveredAnalyticsId] = useState<string | null>(null);

  const [data, setData] = useState<any>(initialData || null);
  const [forecast, setForecast] = useState<any>(initialForecast || null);
  const [loading, setLoading] = useState(!initialData);

  // Load analytics when selectedMonth or compareMonth changes
  useEffect(() => {
    if (initialData && !compareEnabled && selectedMonth === currentMonthStr) {
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    params.set('month', selectedMonth);
    if (compareEnabled && compareMonth) {
      params.set('compareMonth', compareMonth);
    }

    Promise.all([
      fetch(`/api/reports?${params.toString()}`).then(r => r.json()),
      fetch('/api/forecast').then(r => r.json()),
    ])
      .then(([rep, fc]) => {
        setData(rep);
        setForecast(fc);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedMonth, compareEnabled, compareMonth, refreshKey]);

  // Month Navigation Helpers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prev = new Date(year, month - 2, 1);
    const newMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const next = new Date(year, month, 1);
    const newMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const formatMonthDisplay = (mStr: string) => {
    if (!mStr) return '';
    const [y, m] = mStr.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading comprehensive analytics and reports...
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-expense)' }}>
        <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Failed to load reports data</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{data.error}</p>
        <button
          onClick={() => setSelectedMonth(currentMonthStr)}
          className="btn-secondary"
          style={{ marginTop: '1rem' }}
        >
          Reset to Current Month
        </button>
      </div>
    );
  }

  const spendingByCategory = Array.isArray(data?.spendingByCategory) ? data.spendingByCategory : [];
  const spendingByTag = Array.isArray(data?.spendingByTag) ? data.spendingByTag : [];
  const spendingByMerchant = Array.isArray(data?.spendingByMerchant) ? data.spendingByMerchant : [];
  const periods = Array.isArray(forecast?.periods) ? forecast.periods : [];
  const dailySpending = Array.isArray(data?.dailySpending?.days)
    ? data.dailySpending.days
    : Array.isArray(data?.dailySpending)
    ? data.dailySpending
    : [];
  const budgetHealth = data?.budgetHealth && typeof data.budgetHealth === 'object' ? data.budgetHealth : null;
  const comparison = data?.comparison && typeof data.comparison === 'object' ? data.comparison : null;
  const metrics = (data?.metrics && typeof data.metrics === 'object') ? data.metrics : {};

  // Fix: use correct field names from getDashboardMetrics
  const totalMonthSpend = metrics.monthlyExpenses || 0;
  const totalMonthIncome = metrics.monthlyIncome || 0;
  const daysInMonth = dailySpending.length || 30;
  const today = new Date();
  const [selYear, selMon] = selectedMonth.split('-').map(Number);
  const isCurrentMonth = selYear === today.getFullYear() && selMon === (today.getMonth() + 1);
  const elapsedDays = isCurrentMonth ? today.getDate() : daysInMonth;
  const avgDailySpend = elapsedDays > 0 ? Math.round(totalMonthSpend / elapsedDays) : 0;
  const maxDailySpend = dailySpending.length > 0 ? Math.max(...dailySpending.map((d: any) => d.dailySpent ?? d.amount ?? 0), 100) : 100;

  // Savings rate for speedometer
  const savingsRate = totalMonthIncome > 0 ? Math.round(((totalMonthIncome - totalMonthSpend) / totalMonthIncome) * 100) : 0;

  // Active analytics data based on view mode
  const totalTaggedSpend = spendingByTag.reduce((acc: number, t: any) => acc + (t.total || 0), 0);
  const activeAnalytics = analyticsView === 'category' ? spendingByCategory : spendingByTag;
  const activeAnalyticsTotal = analyticsView === 'category' ? totalMonthSpend : totalTaggedSpend;
  const analyticsLabel = analyticsView === 'category' ? 'Category' : 'Tag';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header & Export Options */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Analytics & Reports</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Deep dive into monthly cash flows, spending patterns, budget health, and forecasts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a href="/api/export?format=json" download className="btn-secondary">
            <Download size={16} /> Export JSON Backup
          </a>
          <a href="/api/export?format=csv" download className="btn-secondary">
            <Download size={16} /> Export CSV
          </a>
        </div>
      </div>

      {/* Top Month Selector & Comparison Toggle Bar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Month Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn-icon"
            onClick={handlePrevMonth}
            title="Previous Month"
            style={{ width: '32px', height: '32px' }}
          >
            <ChevronLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '190px', justifyContent: 'center' }}>
            <Calendar size={16} style={{ color: 'var(--brand-primary)' }} />
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              {formatMonthDisplay(selectedMonth)}
            </span>
          </div>
          <button
            className="btn-icon"
            onClick={handleNextMonth}
            title="Next Month"
            style={{ width: '32px', height: '32px' }}
          >
            <ChevronRight size={18} />
          </button>

          {selectedMonth !== currentMonthStr && (
            <button
              className="btn-ghost"
              onClick={() => setSelectedMonth(currentMonthStr)}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: 'var(--brand-primary)' }}
            >
              Current Month
            </button>
          )}
        </div>

        {/* Comparison Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setCompareEnabled(!compareEnabled)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              backgroundColor: compareEnabled ? 'var(--brand-primary)' : 'var(--bg-subtle)',
              color: compareEnabled ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Scale size={14} /> Compare Months
          </button>

          {compareEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>vs</span>
              <input
                type="month"
                className="form-input"
                value={compareMonth}
                onChange={e => setCompareMonth(e.target.value)}
                style={{ fontSize: '0.8125rem', padding: '0.3rem 0.6rem' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Month-over-Month Comparison Widget (If Enabled) */}
      {compareEnabled && comparison?.diff && (
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--brand-primary)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--brand-light)',
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Scale size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                  Month Comparison: {formatMonthDisplay(comparison.monthA || selectedMonth)} vs {formatMonthDisplay(comparison.monthB || compareMonth)}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Detailed delta in income, expenses, and category variance.
                </div>
              </div>
            </div>
          </div>

          {/* Delta KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Income Delta */}
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>INCOME DELTA</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: (comparison.diff?.income ?? 0) >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                  {(comparison.diff?.income ?? 0) >= 0 ? '+' : ''}₹{Math.round((comparison.diff?.income ?? 0) / 100).toLocaleString('en-IN')}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: (comparison.diff?.income ?? 0) >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                  ({comparison.diff?.incomePercent ?? 0}%)
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                ₹{(((comparison.metricsA?.totalIncome ?? comparison.metricsA?.monthlyIncome) || 0) / 100).toLocaleString('en-IN')} vs ₹{(((comparison.metricsB?.totalIncome ?? comparison.metricsB?.monthlyIncome) || 0) / 100).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Expense Delta */}
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>EXPENSE DELTA</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: (comparison.diff?.expense ?? 0) <= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                  {(comparison.diff?.expense ?? 0) >= 0 ? '+' : ''}₹{Math.round((comparison.diff?.expense ?? 0) / 100).toLocaleString('en-IN')}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: (comparison.diff?.expense ?? 0) <= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                  ({comparison.diff?.expensePercent ?? 0}%)
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                ₹{(((comparison.metricsA?.totalExpense ?? comparison.metricsA?.monthlyExpenses) || 0) / 100).toLocaleString('en-IN')} vs ₹{(((comparison.metricsB?.totalExpense ?? comparison.metricsB?.monthlyExpenses) || 0) / 100).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Savings Delta */}
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>NET SAVINGS DELTA</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: (comparison.diff?.netSavings ?? 0) >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                  {(comparison.diff?.netSavings ?? 0) >= 0 ? '+' : ''}₹{Math.round((comparison.diff?.netSavings ?? 0) / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Savings Rate: {comparison.metricsA?.savingsRate ?? 0}% vs {comparison.metricsB?.savingsRate ?? 0}%
              </div>
            </div>
          </div>

          {/* Category Variance Table */}
          {Array.isArray(comparison.categoryComparison) && comparison.categoryComparison.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Category-by-Category Shift
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {comparison.categoryComparison.slice(0, 6).map((c: any) => {
                  const increased = (c.diff || 0) > 0;
                  return (
                    <div
                      key={c.id || c.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.4rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-subtle)',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{c.name || 'Category'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          ₹{Math.round((c.amountA || 0) / 100).toLocaleString('en-IN')} vs ₹{Math.round((c.amountB || 0) / 100).toLocaleString('en-IN')}
                        </span>
                        <span
                          style={{
                            fontWeight: 600,
                            minWidth: '80px',
                            textAlign: 'right',
                            color: increased ? 'var(--color-expense)' : 'var(--color-income)',
                          }}
                        >
                          {increased ? '↑ +' : '↓ '}₹{Math.round(Math.abs(c.diff || 0) / 100).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Speedometer Gauges Row: Savings Rate & Budget Health */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {/* Savings Rate Gauge */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <Gauge size={15} /> SAVINGS RATE
          </div>
          <SpeedometerGauge
            value={Math.max(0, savingsRate)}
            max={100}
            label={totalMonthIncome >= totalMonthSpend ? `₹${Math.round((totalMonthIncome - totalMonthSpend) / 100).toLocaleString('en-IN')} saved` : `₹${Math.round((totalMonthSpend - totalMonthIncome) / 100).toLocaleString('en-IN')} deficit`}
            sublabel={`of ₹${Math.round(totalMonthIncome / 100).toLocaleString('en-IN')} income (${Math.round(totalMonthIncome > 0 ? (totalMonthSpend / totalMonthIncome) * 100 : 0)}% spent)`}
          />
        </div>

        {/* Budget Utilization Gauge */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <BarChart3 size={15} /> BUDGET UTILIZATION
          </div>
          {budgetHealth ? (
            <SpeedometerGauge
              value={budgetHealth.overallPercent ?? 0}
              max={100}
              label={`₹${Math.round((budgetHealth.totalSpent || 0) / 100).toLocaleString('en-IN')} spent`}
              sublabel={`of ₹${Math.round((budgetHealth.totalBudgeted || 0) / 100).toLocaleString('en-IN')} budgeted (${budgetHealth.healthyCount ?? 0} healthy, ${budgetHealth.overBudgetCount ?? 0} over)`}
            />
          ) : (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              No budgets set for this month.
            </div>
          )}
        </div>
      </div>

      {/* Daily Spending Burn Trend for Selected Month */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={18} style={{ color: 'var(--color-expense)' }} />
              Daily Spending Burn Rate ({formatMonthDisplay(selectedMonth)})
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Daily expense velocity and spending spikes. Hover over any bar for details.
            </div>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Average: <strong style={{ color: 'var(--text-primary)' }}>₹{(avgDailySpend / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}/day</strong>
          </div>
        </div>

        {/* Y-axis + Daily Bars */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Y-axis labels */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '140px',
            paddingBottom: '1px',
            minWidth: '48px',
            textAlign: 'right',
            paddingRight: '6px',
          }}>
            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', lineHeight: 1 }}>
              ₹{Math.round(maxDailySpend / 100).toLocaleString('en-IN')}
            </span>
            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', lineHeight: 1 }}>
              ₹{Math.round(maxDailySpend / 200).toLocaleString('en-IN')}
            </span>
            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', lineHeight: 1 }}>₹0</span>
          </div>

          {/* Bars */}
          <div
            style={{
              flex: 1,
              height: '140px',
              display: 'flex',
              alignItems: 'flex-end',
              gap: '3px',
              paddingTop: '1rem',
              borderBottom: '1px solid var(--border-default)',
              borderLeft: '1px solid var(--border-default)',
            }}
          >
            {dailySpending.map((d: any) => (
              <DailyBar
                key={d.day}
                day={d.day}
                date={d.date}
                spent={d.dailySpent ?? d.amount ?? 0}
                cumulative={d.cumulativeSpent ?? d.cumulative ?? 0}
                maxSpend={maxDailySpend}
                avgSpend={avgDailySpend}
              />
            ))}
          </div>
        </div>

        {/* Day scale markings */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)', padding: '0 2px', marginLeft: '52px' }}>
          <span>Day 1</span>
          <span>Day 7</span>
          <span>Day 14</span>
          <span>Day 21</span>
          <span>Day {daysInMonth}</span>
        </div>
      </div>

      {/* Budget Health Summary */}
      {budgetHealth && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={18} style={{ color: 'var(--brand-primary)' }} />
                Budget Health ({formatMonthDisplay(selectedMonth)})
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {budgetHealth.totalCategories ?? 0} budget categories tracked · {budgetHealth.overallPercent ?? 0}% overall utilization
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(budgetHealth.overBudgetCount || 0) > 0 && (
                <span className="badge badge-expense">
                  <ShieldAlert size={12} /> {budgetHealth.overBudgetCount} Over Budget
                </span>
              )}
              {(budgetHealth.nearLimitCount || 0) > 0 && (
                <span className="badge" style={{ backgroundColor: 'var(--color-warning-subtle)', color: 'var(--color-warning)' }}>
                  <AlertTriangle size={12} /> {budgetHealth.nearLimitCount} Near Limit
                </span>
              )}
              {(budgetHealth.healthyCount || 0) > 0 && (
                <span className="badge badge-income">
                  <CheckCircle2 size={12} /> {budgetHealth.healthyCount} Healthy
                </span>
              )}
            </div>
          </div>

          {/* Over budget alerts */}
          {(budgetHealth.overBudgetItems || []).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-expense)' }}>OVER BUDGET</div>
              {(budgetHealth.overBudgetItems || []).map((b: any) => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{b.category_name || 'Budget Category'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      ₹{Math.round((b.spent || 0) / 100).toLocaleString('en-IN')} / ₹{Math.round((b.amount || 0) / 100).toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontWeight: 700, color: '#EF4444' }}>{b.percentUsed ?? 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Near limit warnings */}
          {(budgetHealth.nearLimitItems || []).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#F59E0B' }}>APPROACHING LIMIT (≥80%)</div>
              {(budgetHealth.nearLimitItems || []).map((b: any) => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.15)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{b.category_name || 'Budget Category'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      ₹{Math.round((b.spent || 0) / 100).toLocaleString('en-IN')} / ₹{Math.round((b.amount || 0) / 100).toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontWeight: 700, color: '#F59E0B' }}>{b.percentUsed ?? 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2-Column Analytics: Category/Tag & Top Merchants */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* Spending by Category or Tag with Donut Chart / Split View */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PieChart size={18} style={{ color: 'var(--brand-primary)' }} />
              Expenses by {analyticsLabel} ({formatMonthDisplay(selectedMonth)})
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Layout Switcher: Split | Chart | List */}
              <div
                style={{
                  display: 'flex',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  overflow: 'hidden',
                }}
                role="group"
                aria-label="Chart display layout"
              >
                <button
                  type="button"
                  title="Split view: Chart & List side-by-side"
                  onClick={() => setChartLayout('split')}
                  style={{
                    padding: '0.3rem 0.55rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    backgroundColor: chartLayout === 'split' ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                    color: chartLayout === 'split' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 150ms ease',
                  }}
                >
                  <Columns2 size={12} /> Split
                </button>
                <button
                  type="button"
                  title="Circle / Donut Chart view"
                  onClick={() => setChartLayout('chart')}
                  style={{
                    padding: '0.3rem 0.55rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: 'none',
                    borderLeft: '1px solid var(--border-default)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    backgroundColor: chartLayout === 'chart' ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                    color: chartLayout === 'chart' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 150ms ease',
                  }}
                >
                  <PieChart size={12} /> Chart
                </button>
                <button
                  type="button"
                  title="List view"
                  onClick={() => setChartLayout('list')}
                  style={{
                    padding: '0.3rem 0.55rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: 'none',
                    borderLeft: '1px solid var(--border-default)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    backgroundColor: chartLayout === 'list' ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                    color: chartLayout === 'list' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 150ms ease',
                  }}
                >
                  <List size={12} /> List
                </button>
              </div>

              {/* Dimension Switcher: Category vs Tag */}
              <div
                style={{
                  display: 'flex',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  overflow: 'hidden',
                }}
                role="group"
                aria-label="Dimension filter"
              >
                <button
                  type="button"
                  onClick={() => setAnalyticsView('category')}
                  style={{
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    backgroundColor: analyticsView === 'category' ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                    color: analyticsView === 'category' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 150ms ease',
                  }}
                >
                  <Layers size={12} /> Category
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsView('tag')}
                  style={{
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: 'none',
                    borderLeft: '1px solid var(--border-default)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    backgroundColor: analyticsView === 'tag' ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                    color: analyticsView === 'tag' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 150ms ease',
                  }}
                >
                  <Tag size={12} /> Tag
                </button>
              </div>
            </div>
          </div>

          {activeAnalytics.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No {analyticsLabel.toLowerCase()} data available for this month.
            </div>
          ) : (
            <div>
              {/* Split Mode: Donut Chart on left + Progress List on right */}
              {chartLayout === 'split' && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1.5rem',
                    alignItems: 'center',
                  }}
                >
                  <ExpenseDonutChart
                    items={activeAnalytics}
                    totalSpend={activeAnalyticsTotal}
                    analyticsLabel={analyticsLabel}
                    hoveredId={hoveredAnalyticsId}
                    onHover={setHoveredAnalyticsId}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
                    {activeAnalytics.map((c: any) => {
                      const isHovered = hoveredAnalyticsId === c.id;
                      return (
                        <div
                          key={c.id}
                          onMouseEnter={() => setHoveredAnalyticsId(c.id)}
                          onMouseLeave={() => setHoveredAnalyticsId(null)}
                          style={{
                            padding: '0.35rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isHovered ? 'var(--bg-subtle)' : 'transparent',
                            transition: 'background-color 150ms ease',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: isHovered ? 600 : 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.color || 'var(--brand-primary)', flexShrink: 0 }} />
                              {c.name}
                              {analyticsView === 'tag' && c.count && (
                                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>({c.count} txns)</span>
                              )}
                            </span>
                            <span style={{ fontWeight: 600 }}>
                              ₹{Math.round(c.total / 100).toLocaleString('en-IN')} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({c.percentage}%)</span>
                            </span>
                          </div>
                          <div className="progress-bar-bg" style={{ height: '5px' }}>
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${c.percentage}%`,
                                backgroundColor: c.color || 'var(--brand-primary)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chart-Only Mode: Large Donut Chart + Interactive Badges */}
              {chartLayout === 'chart' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '0.5rem 0' }}>
                  <ExpenseDonutChart
                    items={activeAnalytics}
                    totalSpend={activeAnalyticsTotal}
                    analyticsLabel={analyticsLabel}
                    hoveredId={hoveredAnalyticsId}
                    onHover={setHoveredAnalyticsId}
                  />

                  {/* Interactive Badges / Pill Legend */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', maxWidth: '520px' }}>
                    {activeAnalytics.map((c: any) => {
                      const isHovered = hoveredAnalyticsId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onMouseEnter={() => setHoveredAnalyticsId(c.id)}
                          onMouseLeave={() => setHoveredAnalyticsId(null)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            backgroundColor: isHovered ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                            border: `1px solid ${isHovered ? c.color || 'var(--brand-primary)' : 'var(--border-default)'}`,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                          }}
                        >
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: c.color || 'var(--brand-primary)', flexShrink: 0 }} />
                          <span>{c.name}</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{c.percentage}%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* List-Only Mode: Full Width Progress Bars */}
              {chartLayout === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeAnalytics.map((c: any) => (
                    <div key={c.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.color || 'var(--brand-primary)', flexShrink: 0 }} />
                          {c.name}
                          {analyticsView === 'tag' && c.count && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({c.count} txns)</span>
                          )}
                        </span>
                        <span style={{ fontWeight: 600 }}>
                          ₹{Math.round(c.total / 100).toLocaleString('en-IN')} ({c.percentage}%)
                        </span>
                      </div>
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${c.percentage}%`,
                            backgroundColor: c.color || 'var(--brand-primary)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top Merchants Breakdown */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Top Payees & Merchants</h2>
          {spendingByMerchant.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No merchant data available.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {spendingByMerchant.map((m: any, idx: number) => (
                <div
                  key={m.merchant_name || `merchant_${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--border-default)',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '20px' }}>#{idx + 1}</span>
                    <span style={{ fontWeight: 500 }}>{m.merchant_name || 'Unknown Payee'}</span>
                    {m.count != null && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({m.count} txns)</span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    ₹{Math.round((m.total || 0) / 100).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 30/60/90 Day Cash-Flow Forecast — moved to end */}
      {periods.length > 0 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600 }}>30 / 60 / 90-Day Cash Flow Forecast</h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Deterministic projections based on recurring schedules & obligations.
              </div>
            </div>
            <span className="badge badge-neutral">Estimate</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            {periods.map((p: any, idx: number) => (
              <div
                key={p.days || idx}
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {p.days}-DAY PROJECTION
                  </div>
                  <MoneyDisplay amount={p.projectedBalance || 0} size="lg" weight="bold" />
                </div>
                <div style={{ fontSize: '0.75rem', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: 'var(--color-income)' }}>In: +₹{Math.round((p.expectedIncome || 0) / 100).toLocaleString('en-IN')}</span>
                  <span style={{ color: 'var(--color-expense)' }}>Out: -₹{Math.round((p.expectedExpenses || 0) / 100).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
