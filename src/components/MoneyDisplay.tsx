'use client';

import React from 'react';
import { formatMoney } from '@/lib/money';

interface MoneyDisplayProps {
  amount: number; // minor units (e.g. paise)
  currency?: string;
  showSign?: boolean;
  compact?: boolean;
  colored?: boolean;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  className?: string;
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amount,
  currency = 'INR',
  showSign = false,
  compact = false,
  colored = false,
  size = 'base',
  weight = 'semibold',
  className = '',
}) => {
  const formatted = formatMoney(amount, currency, { showSign, compact });

  const fontSizeMap = {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
    '2xl': '2rem',
    '3xl': '2.5rem',
  };

  const fontWeightMap = {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  };

  let colorStyle = 'inherit';
  if (colored) {
    if (amount > 0) colorStyle = 'var(--color-income)';
    else if (amount < 0) colorStyle = 'var(--color-expense)';
  }

  return (
    <span
      className={className}
      style={{
        fontSize: fontSizeMap[size],
        fontWeight: fontWeightMap[weight],
        color: colorStyle,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
        display: 'inline-block',
      }}
    >
      {formatted}
    </span>
  );
};
