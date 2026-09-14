'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Upload, Check, AlertCircle, FileText } from 'lucide-react';

export const ImportModal = () => {
  const { isImportModalOpen, closeImportModal, showToast, triggerRefresh } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Map Columns, 3: Preview & Confirm
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState({
    dateColumn: '',
    descriptionColumn: '',
    amountColumn: '',
    debitColumn: '',
    creditColumn: '',
    categoryColumn: '',
  });

  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [importDuplicates, setImportDuplicates] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isImportModalOpen) {
      setStep(1);
      setCsvText('');
      setHeaders([]);
      setSampleRows([]);

      fetch('/api/accounts')
        .then(r => r.json())
        .then(d => {
          if (d.accounts?.length > 0) {
            setAccounts(d.accounts);
            setSelectedAccountId(d.accounts[0].id);
          }
        });
    }
  }, [isImportModalOpen]);

  if (!isImportModalOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setCsvText(content);
      handleParsePreview(content);
    };
    reader.readAsText(file);
  };

  const handleParsePreview = async (text: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', csvText: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setHeaders(data.headers);
      setSampleRows(data.sampleRows);
      setMapping({
        dateColumn: data.suggestedMapping?.dateColumn || data.headers[0] || '',
        descriptionColumn: data.suggestedMapping?.descriptionColumn || data.headers[1] || '',
        amountColumn: data.suggestedMapping?.amountColumn || '',
        debitColumn: data.suggestedMapping?.debitColumn || '',
        creditColumn: data.suggestedMapping?.creditColumn || '',
        categoryColumn: data.suggestedMapping?.categoryColumn || '',
      });
      setStep(2);
    } catch (err: any) {
      showToast(err.message || 'Failed to parse CSV file', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!selectedAccountId) {
      showToast('Please select a target account', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          csvText,
          mapping,
          accountId: selectedAccountId,
          importDuplicates,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Imported ${data.importedCount} transactions! (${data.duplicateCount} duplicates skipped)`);
      triggerRefresh();
      closeImportModal();
    } catch (err: any) {
      showToast(err.message || 'Import failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={closeImportModal}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '640px', padding: '1.75rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>CSV Bank Statement Import Wizard</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Step {step} of 2: {step === 1 ? 'Upload File' : 'Map Columns & Confirm'}
            </div>
          </div>
          <button className="btn-icon" onClick={closeImportModal}>
            <X size={18} />
          </button>
        </div>

        {step === 1 && (
          <div>
            <div
              style={{
                border: '2px dashed var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-subtle)',
                marginBottom: '1.25rem',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('csv-file-input')?.click()}
            >
              <Upload size={32} color="var(--brand-primary)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Click to browse or drop CSV file here</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supports HDFC, SBI, ICICI, Axis, and standard bank statement exports</div>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                OR PASTE CSV RAW TEXT
              </label>
              <textarea
                className="input-field"
                rows={4}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder="Date,Description,Amount&#10;2026-03-01,Swiggy,850&#10;2026-03-02,Salary,120000"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={closeImportModal}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={!csvText.trim() || loading}
                onClick={() => handleParsePreview(csvText)}
              >
                {loading ? 'Analyzing...' : 'Continue to Column Mapping'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                SELECT TARGET ACCOUNT
              </label>
              <select
                className="input-field"
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                  DATE COLUMN *
                </label>
                <select
                  className="input-field"
                  value={mapping.dateColumn}
                  onChange={e => setMapping({ ...mapping, dateColumn: e.target.value })}
                >
                  {headers.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                  DESCRIPTION / MERCHANT *
                </label>
                <select
                  className="input-field"
                  value={mapping.descriptionColumn}
                  onChange={e => setMapping({ ...mapping, descriptionColumn: e.target.value })}
                >
                  {headers.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                  AMOUNT COLUMN
                </label>
                <select
                  className="input-field"
                  value={mapping.amountColumn}
                  onChange={e => setMapping({ ...mapping, amountColumn: e.target.value })}
                >
                  <option value="">None (Use Debit/Credit)</option>
                  {headers.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                  DEBIT / WITHDRAWAL
                </label>
                <select
                  className="input-field"
                  value={mapping.debitColumn}
                  onChange={e => setMapping({ ...mapping, debitColumn: e.target.value })}
                >
                  <option value="">None</option>
                  {headers.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                  CREDIT / DEPOSIT
                </label>
                <select
                  className="input-field"
                  value={mapping.creditColumn}
                  onChange={e => setMapping({ ...mapping, creditColumn: e.target.value })}
                >
                  <option value="">None</option>
                  {headers.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview Box */}
            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                DETECTED PREVIEW ({sampleRows.length} sample rows)
              </div>
              <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '0.75rem' }}>
                {sampleRows.map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.25rem 0',
                      borderBottom: '1px solid var(--border-default)',
                    }}
                  >
                    <span>{row[mapping.dateColumn] || 'No Date'}</span>
                    <span style={{ fontWeight: 500 }}>{row[mapping.descriptionColumn] || 'No Description'}</span>
                    <span>
                      {mapping.amountColumn
                        ? row[mapping.amountColumn]
                        : `Dr: ${row[mapping.debitColumn] || '-'} | Cr: ${row[mapping.creditColumn] || '-'}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Duplicate Handling Checkbox */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
              <input
                type="checkbox"
                checked={importDuplicates}
                onChange={e => setImportDuplicates(e.target.checked)}
              />
              <span>Import even if similar transactions exist (Skip duplicate check)</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="btn-primary" onClick={handleExecuteImport} disabled={loading}>
                {loading ? 'Importing Transactions...' : 'Confirm & Execute Import'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
