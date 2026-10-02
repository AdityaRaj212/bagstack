'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  X,
  Plus,
  Folder,
  Layers,
  Sparkles,
  Utensils,
  Coffee,
  ShoppingCart,
  Car,
  Fuel,
  Home,
  Zap,
  Wifi,
  ShoppingBag,
  Shirt,
  Laptop,
  Tv,
  Film,
  HeartPulse,
  Activity,
  Pill,
  CreditCard,
  Receipt,
  Shield,
  PiggyBank,
  TrendingUp,
  Target,
  Briefcase,
  Gift,
  Tag,
  Package,
  MoreHorizontal,
} from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'expense' | 'income';
  initialParentId?: string;
  initialName?: string;
  initialIsSubcategory?: boolean;
  onCategoryCreated?: (category: any) => void;
}

const ICON_OPTIONS = [
  { name: 'tag', Icon: Tag, label: 'Tag' },
  { name: 'utensils', Icon: Utensils, label: 'Dining' },
  { name: 'coffee', Icon: Coffee, label: 'Coffee' },
  { name: 'shopping-cart', Icon: ShoppingCart, label: 'Groceries' },
  { name: 'shopping-bag', Icon: ShoppingBag, label: 'Shopping' },
  { name: 'car', Icon: Car, label: 'Transport' },
  { name: 'fuel', Icon: Fuel, label: 'Fuel' },
  { name: 'home', Icon: Home, label: 'Housing' },
  { name: 'zap', Icon: Zap, label: 'Utilities' },
  { name: 'wifi', Icon: Wifi, label: 'Internet' },
  { name: 'shirt', Icon: Shirt, label: 'Apparel' },
  { name: 'laptop', Icon: Laptop, label: 'Tech' },
  { name: 'tv', Icon: Tv, label: 'Streaming' },
  { name: 'film', Icon: Film, label: 'Movies' },
  { name: 'heart-pulse', Icon: HeartPulse, label: 'Health' },
  { name: 'activity', Icon: Activity, label: 'Fitness' },
  { name: 'pill', Icon: Pill, label: 'Pharmacy' },
  { name: 'credit-card', Icon: CreditCard, label: 'Credit Card' },
  { name: 'receipt', Icon: Receipt, label: 'Bills' },
  { name: 'shield', Icon: Shield, label: 'Insurance' },
  { name: 'piggy-bank', Icon: PiggyBank, label: 'Savings' },
  { name: 'trending-up', Icon: TrendingUp, label: 'Investment' },
  { name: 'target', Icon: Target, label: 'Goals' },
  { name: 'briefcase', Icon: Briefcase, label: 'Salary' },
  { name: 'gift', Icon: Gift, label: 'Gifts' },
  { name: 'package', Icon: Package, label: 'Delivery' },
  { name: 'more-horizontal', Icon: MoreHorizontal, label: 'Others' },
];

const COLOR_PRESETS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#64748B', // Slate
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  initialType = 'expense',
  initialParentId = '',
  initialName = '',
  initialIsSubcategory = false,
  onCategoryCreated,
}) => {
  const { showToast, triggerRefresh } = useApp();

  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const [isSubcategory, setIsSubcategory] = useState<boolean>(initialIsSubcategory);
  const [parentId, setParentId] = useState<string>(initialParentId);
  const [name, setName] = useState<string>(initialName);
  const [icon, setIcon] = useState<string>('tag');
  const [color, setColor] = useState<string>('#3B82F6');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [existingCategories, setExistingCategories] = useState<any[]>([]);

  // Fetch existing categories whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setIsSubcategory(initialIsSubcategory || Boolean(initialParentId));
      setParentId(initialParentId || '');
      setName(initialName || '');
      setIcon('tag');
      setColor(initialType === 'income' ? '#10B981' : '#EF4444');
      setError(null);

      fetch('/api/categories')
        .then(res => res.json())
        .then(data => {
          if (data.categories) {
            setExistingCategories(data.categories);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialType, initialParentId, initialName, initialIsSubcategory]);

  if (!isOpen) return null;

  // Filter top-level parents matching the selected type
  const parentCandidates = existingCategories.filter(
    c => !c.parent_id && c.type === type
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter a category name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          type,
          isSubcategory,
          parentId: isSubcategory ? (parentId || null) : null,
          icon,
          color,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create category');
      }

      const createdCat = data.category;
      if (isSubcategory && !parentId) {
        showToast(`Subcategory "${cleanName}" created under 'Others'`);
      } else if (isSubcategory) {
        const parentObj = parentCandidates.find(p => p.id === parentId);
        showToast(`Subcategory "${cleanName}" created under ${parentObj?.name || 'parent'}`);
      } else {
        showToast(`Category "${cleanName}" created successfully`);
      }

      triggerRefresh();
      if (onCategoryCreated) {
        onCategoryCreated(createdCat);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving category');
    } finally {
      setLoading(false);
    }
  };

  const SelectedIconComp = ICON_OPTIONS.find(i => i.name === icon)?.Icon || Tag;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--border-color)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: isSubcategory ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isSubcategory ? '#818CF8' : '#34D399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSubcategory ? <Layers size={20} /> : <Folder size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {isSubcategory ? 'Add Subcategory' : 'Add Main Category'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {isSubcategory
                  ? "Create a nested subcategory (defaults to 'Others' if unparented)"
                  : 'Create a new high-level budgeting category'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto' }}>
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#EF4444',
                fontSize: '0.8125rem',
                marginBottom: '1.25rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Level Switcher (Main vs Subcategory) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block' }}>
              CATEGORY STRUCTURE
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                padding: '4px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
              }}
            >
              <button
                type="button"
                onClick={() => setIsSubcategory(false)}
                style={{
                  padding: '0.625rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease',
                  backgroundColor: !isSubcategory ? 'var(--card-bg)' : 'transparent',
                  color: !isSubcategory ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: !isSubcategory ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Folder size={16} />
                Main Category
              </button>
              <button
                type="button"
                onClick={() => setIsSubcategory(true)}
                style={{
                  padding: '0.625rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease',
                  backgroundColor: isSubcategory ? 'var(--card-bg)' : 'transparent',
                  color: isSubcategory ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: isSubcategory ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Layers size={16} />
                Subcategory
              </button>
            </div>
          </div>

          {/* Type Switcher (Expense vs Income) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block' }}>
              TRANSACTION TYPE
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  if (color === '#10B981') setColor('#EF4444');
                }}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid',
                  borderColor: type === 'expense' ? '#EF4444' : 'var(--border-color)',
                  backgroundColor: type === 'expense' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-subtle)',
                  color: type === 'expense' ? '#EF4444' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  if (color === '#EF4444') setColor('#10B981');
                }}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid',
                  borderColor: type === 'income' ? '#10B981' : 'var(--border-color)',
                  backgroundColor: type === 'income' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-subtle)',
                  color: type === 'income' ? '#10B981' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Income
              </button>
            </div>
          </div>

          {/* Parent Category Dropdown (Conditional for Subcategory) */}
          {isSubcategory && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>
                  PARENT MAIN CATEGORY
                </label>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  Optional (defaults to &ldquo;Others&rdquo;)
                </span>
              </div>
              <select
                className="form-select"
                value={parentId}
                onChange={e => {
                  const val = e.target.value;
                  setParentId(val);
                  if (val) {
                    const sel = parentCandidates.find(p => p.id === val);
                    if (sel && sel.color) setColor(sel.color);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              >
                <option value="">None (Automatically group under &ldquo;Others&rdquo;)</option>
                {parentCandidates.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {!parentId && (
                <div
                  style={{
                    marginTop: '0.375rem',
                    fontSize: '0.6875rem',
                    color: 'var(--brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Sparkles size={12} /> If unselected, this subcategory will automatically appear under <strong>&ldquo;Others&rdquo;</strong>
                </div>
              )}
            </div>
          )}

          {/* Category Name Input with Live Preview */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block' }}>
              {isSubcategory ? 'SUBCATEGORY NAME' : 'MAIN CATEGORY NAME'}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: color ? `${color}20` : 'var(--bg-subtle)',
                  color: color || 'var(--text-primary)',
                  border: `1px solid ${color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SelectedIconComp size={20} />
              </div>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={isSubcategory ? 'e.g., Groceries, Coffee, Cab' : 'e.g., Food & Dining, Pet Care'}
                autoFocus
                style={{
                  flex: 1,
                  padding: '0.625rem 0.75rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Color Presets */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block' }}>
              CATEGORY COLOR
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: color === c ? '3px solid var(--card-bg)' : '1px solid transparent',
                    outline: color === c ? `2px solid ${c}` : 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.12s ease',
                    transform: color === c ? 'scale(1.15)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Icon Selector Grid */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block' }}>
              SELECT ICON
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(9, 1fr)',
                gap: '0.375rem',
                maxHeight: '120px',
                overflowY: 'auto',
                padding: '0.5rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              {ICON_OPTIONS.map(opt => {
                const isSelected = icon === opt.name;
                const IconComponent = opt.Icon;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    title={opt.label}
                    onClick={() => setIcon(opt.name)}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? `1px solid ${color}` : '1px solid transparent',
                      backgroundColor: isSelected ? `${color}25` : 'transparent',
                      color: isSelected ? color : 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    <IconComponent size={16} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !name.trim()}
              style={{
                padding: '0.625rem 1.5rem',
                fontSize: '0.875rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !name.trim() ? 0.65 : 1,
              }}
            >
              <Plus size={16} />
              {loading ? 'Saving...' : isSubcategory ? 'Add Subcategory' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const GlobalCategoryModal: React.FC = () => {
  const { isCategoryModalOpen, closeCategoryModal, categoryModalOptions } = useApp();

  if (!isCategoryModalOpen) return null;

  return (
    <CategoryModal
      isOpen={isCategoryModalOpen}
      onClose={closeCategoryModal}
      initialType={categoryModalOptions.initialType}
      initialParentId={categoryModalOptions.initialParentId}
      initialName={categoryModalOptions.initialName}
      initialIsSubcategory={categoryModalOptions.initialIsSubcategory}
      onCategoryCreated={categoryModalOptions.onCategoryCreated}
    />
  );
};
