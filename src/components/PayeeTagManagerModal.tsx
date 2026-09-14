'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Tag, Store, Trash2, Plus, Search } from 'lucide-react';

interface PayeeTagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'payees' | 'tags';
  onUpdate?: () => void;
}

export const PayeeTagManagerModal: React.FC<PayeeTagManagerModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'payees',
  onUpdate,
}) => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'payees' | 'tags'>(initialTab);
  const [payees, setPayees] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(false);

  const tagColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#64748B'];

  const loadData = useCallback(async () => {
    try {
      const [merchRes, tagsRes] = await Promise.all([
        fetch('/api/merchants').then(r => r.json()),
        fetch('/api/tags').then(r => r.json()),
      ]);
      setPayees(merchRes.merchants || []);
      setTags(tagsRes.tags || []);
    } catch {
      showToast('Failed to load payees or tags', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
      loadData();
    }
  }, [isOpen, initialTab, loadData]);

  if (!isOpen) return null;

  const handleDeletePayee = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/merchants?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Payee "${name}" removed from suggestions`);
        setPayees(prev => prev.filter(p => p.id !== id));
        onUpdate?.();
      }
    } catch {
      showToast('Failed to delete payee', 'error');
    }
  };

  const handleDeleteTag = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/tags?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Tag "#${name}" removed`);
        setTags(prev => prev.filter(t => t.id !== id));
        onUpdate?.();
      }
    } catch {
      showToast('Failed to delete tag', 'error');
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Tag "#${data.tag.name}" created`);
        setNewTagName('');
        loadData();
        onUpdate?.();
      }
    } catch {
      showToast('Failed to create tag', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayees = payees.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTags = tags.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '500px', width: '100%', padding: '1.5rem' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--brand-light)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeTab === 'payees' ? <Store size={18} /> : <Tag size={18} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Manage Payees & Tags</h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Clean up or delete suggestions from your autocomplete lists
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.25rem',
            marginBottom: '1rem',
            gap: '0.25rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('payees')}
            style={{
              flex: 1,
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'payees' ? 600 : 500,
              backgroundColor: activeTab === 'payees' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'payees' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'payees' ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            Payees / Merchants ({payees.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            style={{
              flex: 1,
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'tags' ? 600 : 500,
              backgroundColor: activeTab === 'tags' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'tags' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'tags' ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            Tags ({tags.length})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.2rem', fontSize: '0.825rem' }}
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tab Content */}
        {activeTab === 'payees' ? (
          <div>
            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {filteredPayees.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {searchQuery ? 'No payees matching search' : 'No recorded payees yet'}
                </div>
              ) : (
                filteredPayees.map(p => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {p.transaction_count} transactions {p.default_category_name ? `• Category: ${p.default_category_name}` : ''}
                      </div>
                    </div>
                    <button
                      className="btn-icon"
                      style={{ width: '28px', height: '28px', color: 'var(--color-expense)' }}
                      onClick={() => handleDeletePayee(p.id, p.name)}
                      title="Remove payee from autocomplete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Create Tag Form */}
            <form onSubmit={handleCreateTag} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1, fontSize: '0.825rem' }}
                placeholder="New tag name (e.g. vacation)"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {tagColors.slice(0, 4).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewTagColor(c)}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: newTagColor === c ? '2px solid #ffffff' : 'none',
                    }}
                  />
                ))}
              </div>
              <button type="submit" className="btn-primary" disabled={loading || !newTagName.trim()} style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}>
                <Plus size={13} /> Add
              </button>
            </form>

            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {filteredTags.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {searchQuery ? 'No tags matching search' : 'No tags created yet'}
                </div>
              ) : (
                filteredTags.map(t => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: t.color || '#3B82F6',
                        }}
                      />
                      <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>#{t.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({t.transaction_count || 0})</span>
                    </div>
                    <button
                      className="btn-icon"
                      style={{ width: '28px', height: '28px', color: 'var(--color-expense)' }}
                      onClick={() => handleDeleteTag(t.id, t.name)}
                      title="Delete tag"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
