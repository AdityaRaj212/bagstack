'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';

export interface ModernDatePickerProps {
  value: string; // Format: "YYYY-MM-DD"
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  style?: React.CSSProperties;
  showPresets?: boolean;
  align?: 'left' | 'right' | 'auto';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Helpers to format YYYY-MM-DD
function formatDateString(year: number, monthZeroIndexed: number, day: number): string {
  const y = year.toString();
  const m = (monthZeroIndexed + 1).toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateString(str?: string): { year: number; month: number; day: number } | null {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

function formatDisplayDate(str?: string): string {
  if (!str) return '';
  const parsed = parseDateString(str);
  if (!parsed) return str;
  const date = new Date(parsed.year, parsed.month, parsed.day);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function addDays(baseDate: Date, days: number): string {
  const d = new Date(baseDate.getTime());
  d.setDate(d.getDate() + days);
  return formatDateString(d.getFullYear(), d.getMonth(), d.getDate());
}

function addMonths(baseDate: Date, months: number): string {
  const d = new Date(baseDate.getTime());
  d.setMonth(d.getMonth() + months);
  return formatDateString(d.getFullYear(), d.getMonth(), d.getDate());
}

export const ModernDatePicker: React.FC<ModernDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  minDate,
  maxDate,
  disabled = false,
  required = false,
  id,
  style,
  showPresets = true,
  align = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [effectiveAlign, setEffectiveAlign] = useState<'left' | 'right'>(align === 'right' ? 'right' : 'left');

  useEffect(() => {
    if (align === 'right' || align === 'left') {
      setEffectiveAlign(align);
    } else if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // If less than 330px from right edge of viewport or near container right edge, align right
      if (window.innerWidth - rect.left < 330 || rect.right > window.innerWidth - 100) {
        setEffectiveAlign('right');
      } else {
        setEffectiveAlign('left');
      }
    }
  }, [isOpen, align]);

  // Determine current viewed month/year
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(
    () => formatDateString(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );

  const parsedValue = useMemo(() => parseDateString(value), [value]);

  const [viewYear, setViewYear] = useState<number>(parsedValue ? parsedValue.year : today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsedValue ? parsedValue.month : today.getMonth());

  // Update view when value changes externally
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
    }
  }, [value]);

  // Click-outside listener
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleMouseDown);
      return () => document.removeEventListener('mousedown', handleMouseDown);
    }
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  // Build 42-day calendar grid
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }> = [];

    // Prev month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = formatDateString(prevYear, prevMonth, d);
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
        isDisabled: Boolean((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = formatDateString(viewYear, viewMonth, d);
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
        isDisabled: Boolean((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)),
      });
    }

    // Next month padding to fill complete grid of 42
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = formatDateString(nextYear, nextMonth, d);
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
        isDisabled: Boolean((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)),
      });
    }

    return days;
  }, [viewYear, viewMonth, todayStr, value, minDate, maxDate]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        ...style,
      }}
    >
      {/* Input Trigger */}
      <div
        id={id}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) setIsOpen(prev => !prev);
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(prev => !prev);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0.6rem 0.85rem',
          backgroundColor: 'var(--bg-surface)',
          border: `1px solid ${isOpen ? 'var(--border-focus)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-md)',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '0.875rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          boxShadow: isOpen ? '0 0 0 2px var(--brand-light)' : 'var(--shadow-sm)',
          transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
          <Calendar
            size={16}
            style={{
              color: isOpen ? 'var(--brand-primary)' : 'var(--text-muted)',
              flexShrink: 0,
              transition: 'color var(--transition-fast)',
            }}
          />
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: value ? 500 : 400,
            }}
          >
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </div>

        {value && !required && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="btn-icon"
            style={{
              padding: '2px',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-sm)',
            }}
            title="Clear date"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Popover Calendar */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: effectiveAlign === 'right' ? 'auto' : 0,
            right: effectiveAlign === 'right' ? 0 : 'auto',
            zIndex: 1500,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-modal)',
            width: '310px',
            padding: '0.85rem',
            animation: 'scaleUp 140ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Quick Presets */}
          {showPresets && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                flexWrap: 'wrap',
                marginBottom: '0.75rem',
                paddingBottom: '0.65rem',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => handleSelectDate(todayStr)}
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: value === todayStr ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                  color: value === todayStr ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all var(--transition-fast)',
                }}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => handleSelectDate(addDays(today, 1))}
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all var(--transition-fast)',
                }}
              >
                Tomorrow
              </button>

              <button
                type="button"
                onClick={() => handleSelectDate(addDays(today, 7))}
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all var(--transition-fast)',
                }}
              >
                +1 Week
              </button>

              <button
                type="button"
                onClick={() => handleSelectDate(addMonths(today, 1))}
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all var(--transition-fast)',
                }}
              >
                +1 Month
              </button>
            </div>
          )}

          {/* Month / Year Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="btn-icon"
                style={{
                  padding: '4px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                }}
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewYear(today.getFullYear());
                  setViewMonth(today.getMonth());
                }}
                className="btn-ghost"
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.45rem',
                  color: 'var(--brand-primary)',
                  fontWeight: 600,
                }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="btn-icon"
                style={{
                  padding: '4px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                }}
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              marginBottom: '0.35rem',
            }}
          >
            {DAYS_OF_WEEK.map((d, i) => (
              <div
                key={i}
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  padding: '0.2rem 0',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar day grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '2px',
            }}
          >
            {calendarDays.map((day, idx) => {
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={day.isDisabled}
                  onClick={() => handleSelectDate(day.dateStr)}
                  style={{
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: day.isSelected ? 700 : day.isToday ? 600 : 400,
                    backgroundColor: day.isSelected
                      ? 'var(--brand-primary)'
                      : day.isToday
                      ? 'var(--brand-light)'
                      : 'transparent',
                    color: day.isSelected
                      ? '#ffffff'
                      : day.isDisabled
                      ? 'var(--text-muted)'
                      : day.isCurrentMonth
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                    border: day.isToday && !day.isSelected ? '1px solid var(--brand-primary)' : 'none',
                    cursor: day.isDisabled ? 'not-allowed' : 'pointer',
                    opacity: day.isDisabled ? 0.35 : day.isCurrentMonth ? 1 : 0.45,
                    transition: 'all var(--transition-fast)',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!day.isSelected && !day.isDisabled) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!day.isSelected && !day.isDisabled) {
                      e.currentTarget.style.backgroundColor =
                        day.isToday ? 'var(--brand-light)' : 'transparent';
                    }
                  }}
                >
                  {day.dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
