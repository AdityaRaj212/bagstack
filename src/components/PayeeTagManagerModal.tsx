'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Tag, Store, Trash2, Plus, Search, Edit2, AlertTriangle, Check, Folder, Layers } from 'lucide-react';

interface PayeeTagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'categories' | 'payees' | 'tags';
  onUpdate?: () => void;
}

export const PayeeTagManagerModal: React.FC<PayeeTagManagerModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'categories',
  onUpdate,
}) => {
  const { showToast, openCategoryModal } = useApp();
  const [activeTab, setActiveTab] = useState<'categories' | 'payees' | 'tags'>(initialTab);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryTree, setCategoryTree] = useState<any[]>([]);
  const [payees, setPayees] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(false);

  const tagColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#64748B'];

  const loadData = useCallback(async () => {
    try {
      const [merchRes, tagsRes, catRes] = await Promise.all([
        fetch('/api/merchants').then(r => r.json()),
        fetch('/api/tags').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
      ]);
      setPayees(merchRes.merchants || []);
      setTags(tagsRes.tags || []);
      setCategories(catRes.categories || []);
      setCategoryTree(catRes.tree || []);
    } catch {
      showToast('Failed to load data', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
      setEditingTagId(null);
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
        if (editingTagId === id) setEditingTagId(null);
        onUpdate?.();
      }
    } catch {
      showToast('Failed to delete tag', 'error');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Category "${name}" removed`);
        loadData();
        onUpdate?.();
      }
    } catch {
      showToast('Failed to delete category', 'error');
    }
  };

  const handleStartEditTag = (tag: any) => {
    setEditingTagId(tag.id);
    setEditTagName(tag.name);
    setEditTagColor(tag.color || '#3B82F6');
  };

  const handleUpdateTag = async (id: string, originalName: string) => {
    const cleanName = editTagName.trim().replace(/^#/, '');
    if (!cleanName) {
      showToast('Tag name cannot be empty', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: cleanName, color: editTagColor }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          cleanName !== originalName
            ? `Tag renamed to "#${cleanName}" and previous transactions updated`
            : `Tag "#${cleanName}" updated`
        );
        setEditingTagId(null);
        loadData();
        onUpdate?.();
      } else {
        showToast(data.error || 'Failed to update tag', 'error');
      }
    } catch {
      showToast('Failed to update tag', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newTagName.trim().replace(/^#/, '');
    if (!cleanName) return;

    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, color: newTagColor }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Tag "#${cleanName}" created`);
        setNewTagName('');
        loadData();
        onUpdate?.();
      } else {
        showToast(data.error || 'Failed to create tag', 'error');
      }
    } catch {
      showToast('Failed to create tag', 'error');
    }
  };

  const filteredPayees = payees.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTags = tags.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase().replace(/^#/, ''))
  );

  const filteredCategoryTree = categoryTree.filter(cat => {
    const matchesParent = cat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSub = cat.subcategories?.some((s: any) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesParent || matchesSub;
  });

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
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
          maxWidth: '560px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          padding: '1.25rem',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(79, 70, 229, 0.12)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeTab === 'categories' ? <Folder size={18} /> : activeTab === 'payees' ? <Store size={18} /> : <Tag size={18} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Manage Categories, Payees & Tags
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Organize your financial classification data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
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
            onClick={() => setActiveTab('categories')}
            style={{
              flex: 1,
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.825rem',
              fontWeight: activeTab === 'categories' ? 600 : 500,
              backgroundColor: activeTab === 'categories' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'categories' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'categories' ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Categories ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payees')}
            style={{
              flex: 1,
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.825rem',
              fontWeight: activeTab === 'payees' ? 600 : 500,
              backgroundColor: activeTab === 'payees' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'payees' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'payees' ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Payees ({payees.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            style={{
              flex: 1,
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.825rem',
              fontWeight: activeTab === 'tags' ? 600 : 500,
              backgroundColor: activeTab === 'tags' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'tags' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'tags' ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Tags ({tags.length})
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.2rem', fontSize: '0.825rem', width: '100%' }}
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {activeTab === 'categories' && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => openCategoryModal('expense', undefined, '', false, () => loadData())}
              style={{ fontSize: '0.8125rem', padding: '0.45rem 0.75rem', whiteSpace: 'nowrap' }}
            >
              <Plus size={14} /> Add Category
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'categories' ? (
          <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredCategoryTree.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {searchQuery ? 'No categories matching search' : 'No categories found'}
              </div>
            ) : (
              filteredCategoryTree.map(parent => (
                <div
                  key={parent.id}
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    padding: '0.65rem 0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: parent.subcategories?.length ? '0.5rem' : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: parent.color || '#6B7280',
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {parent.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: parent.type === 'income' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: parent.type === 'income' ? '#10B981' : '#EF4444',
                          fontWeight: 500,
                        }}
                      >
                        {parent.type}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => openCategoryModal(parent.type, parent.id, '', true, () => loadData())}
                        title={`Add subcategory under ${parent.name}`}
                        style={{ fontSize: '0.725rem', color: 'var(--brand-primary)', padding: '2px 6px', height: 'auto' }}
                      >
                        + Sub
                      </button>
                      {!parent.id.startsWith('cat-') && (
                        <button
                          className="btn-icon"
                          style={{ width: '26px', height: '26px', color: 'var(--color-expense)' }}
                          onClick={() => handleDeleteCategory(parent.id, parent.name)}
                          title="Delete category"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subcategories list */}
                  {parent.subcategories && parent.subcategories.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.35rem', paddingLeft: '1rem' }}>
                      {parent.subcategories.map((sub: any) => (
                        <span
                          key={sub.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            fontSize: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: sub.color || parent.color || '#6B7280' }} />
                          {sub.name}
                          {!sub.id.startsWith('cat-') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(sub.id, sub.name)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px' }}
                              title="Delete subcategory"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'payees' ? (
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
                placeholder="New tag name (e.g. vacation, taxes)..."
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                {tagColors.slice(0, 5).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewTagColor(c)}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: newTagColor === c ? '2px solid var(--text-primary)' : 'none',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={!newTagName.trim()}
                style={{ fontSize: '0.825rem', padding: '0.45rem 0.75rem' }}
              >
                <Plus size={14} /> Add Tag
              </button>
            </form>

            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {filteredTags.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {searchQuery ? 'No tags matching search' : 'No tags created yet'}
                </div>
              ) : (
                filteredTags.map(t => {
                  const isEditing = editingTagId === t.id;
                  if (isEditing) {
                    return (
                      <div
                        key={t.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.55rem 0.75rem',
                          backgroundColor: 'rgba(79, 70, 229, 0.08)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--brand-primary)',
                        }}
                      >
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 1, fontSize: '0.825rem', padding: '0.3rem 0.5rem' }}
                          value={editTagName}
                          onChange={e => setEditTagName(e.target.value)}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '3px' }}>
                          {tagColors.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditTagColor(c)}
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                backgroundColor: c,
                                border: editTagColor === c ? '2px solid var(--text-primary)' : 'none',
                                cursor: 'pointer',
                              }}
                            />
                          ))}
                        </div>
                        <button
                          className="btn-icon"
                          style={{ width: '28px', height: '28px', color: 'var(--color-income)' }}
                          onClick={() => handleUpdateTag(t.id, t.name)}
                          disabled={loading}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ width: '28px', height: '28px', color: 'var(--text-muted)' }}
                          onClick={() => setEditingTagId(null)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={t.id}
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
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          ({t.transaction_count || 0} txs)
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn-icon"
                          style={{ width: '28px', height: '28px', color: 'var(--text-secondary)' }}
                          onClick={() => handleStartEditTag(t)}
                          title="Edit tag (color & rename)"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ width: '28px', height: '28px', color: 'var(--color-expense)' }}
                          onClick={() => handleDeleteTag(t.id, t.name)}
                          title="Delete tag"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
