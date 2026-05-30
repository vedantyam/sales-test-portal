'use client'
import { useState } from 'react'
import { DEFAULT_PLANS, Plan } from '@/lib/planData'

export default function PlanComparison({ onClose }: { onClose: () => void }) {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS)
  const [editing, setEditing] = useState(false)
  const [downloading, setDownloading] = useState(false)

  function updatePrice(planId: string, price: number) {
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, price } : p))
  }

  function updateFeatureText(planId: string, featureId: string, text: string) {
    setPlans(prev => prev.map(p =>
      p.id === planId
        ? { ...p, features: p.features.map(f => f.id === featureId ? { ...f, text } : f) }
        : p
    ))
  }

  function toggleFeature(planId: string, featureId: string) {
    setPlans(prev => prev.map(p =>
      p.id === planId
        ? { ...p, features: p.features.map(f => f.id === featureId ? { ...f, included: !f.included } : f) }
        : p
    ))
  }

  function addFeature(planId: string) {
    const newId = `custom_${Date.now()}`
    setPlans(prev => prev.map(p =>
      p.id === planId
        ? { ...p, features: [...p.features, { id: newId, text: 'New feature', included: true }] }
        : p
    ))
  }

  function removeFeature(planId: string, featureId: string) {
    setPlans(prev => prev.map(p =>
      p.id === planId
        ? { ...p, features: p.features.filter(f => f.id !== featureId) }
        : p
    ))
  }

  function handleDownload() {
    setDownloading(true)
    setEditing(false)
    setTimeout(() => {
      window.print()
      setDownloading(false)
    }, 300)
  }

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #plan-print-area, #plan-print-area * { visibility: visible !important; }
          #plan-print-area {
            position: fixed !important;
            inset: 0 !important;
            background: white !important;
            z-index: 99999 !important;
            padding: 20px !important;
          }
          .no-print { display: none !important; }
          @page { margin: 12mm; size: A4 landscape; }
        }
        .pc-overlay {
          position: fixed;
          inset: 0;
          background: #f3f4f6;
          z-index: 1000;
          overflow-y: auto;
        }
        .pc-toolbar {
          position: sticky;
          top: 0;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10;
        }
        .pc-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding: 24px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .pc-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }
        .pc-card.recommended {
          border: 2px solid #3b5bdb;
        }
        .pc-card-header {
          padding: 20px;
          position: relative;
          background: #1a1f2e;
          color: white;
        }
        .pc-card-header.recommended-header {
          background: #3b5bdb;
        }
        .pc-rec-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(255,255,255,0.2);
          color: white;
          font-size: 9px;
          padding: 3px 8px;
          border-radius: 20px;
          letter-spacing: 0.07em;
          font-weight: 500;
        }
        .pc-plan-name { font-size: 20px; font-weight: 500; color: white; margin-bottom: 3px; }
        .pc-plan-tagline { font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 14px; }
        .pc-price-row { display: flex; align-items: baseline; gap: 4px; }
        .pc-price { font-size: 28px; font-weight: 500; color: white; }
        .pc-price-label { font-size: 12px; color: rgba(255,255,255,0.5); }
        .pc-bills {
          margin-top: 8px;
          font-size: 11px;
          color: rgba(255,255,255,0.7);
          background: rgba(255,255,255,0.1);
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
        }
        .pc-features { padding: 14px 18px; }
        .pc-feat-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
          border-bottom: 1px solid #f3f4f6;
          font-size: 13px;
        }
        .pc-feat-row:last-child { border-bottom: none; }
        .pc-check-yes {
          width: 17px; height: 17px; border-radius: 50%;
          background: #e8f5e9; color: #2e7d32;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; flex-shrink: 0;
        }
        .pc-check-no {
          width: 17px; height: 17px; border-radius: 50%;
          background: #f3f4f6; color: #9ca3af;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; flex-shrink: 0;
        }
        .pc-price-input {
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          font-size: 24px;
          font-weight: 500;
          width: 110px;
          padding: 2px 6px;
          border-radius: 6px;
          outline: none;
        }
        .pc-feat-input {
          border: 1px solid #d1d5db;
          background: #f9fafb;
          color: #111;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 4px;
          flex: 1;
          outline: none;
        }

        /* Print-only */
        .print-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 14px;
          border-bottom: 2px solid #1a1f2e;
          margin-bottom: 20px;
        }
        .print-logo-text { font-size: 18px; font-weight: 700; color: #1a1f2e; }
        .print-title { font-size: 16px; font-weight: 700; color: #1a1f2e; }
        .print-subtitle { font-size: 11px; color: #666; }
        .print-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .print-card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; break-inside: avoid; }
        .print-card-hdr { padding: 14px 16px; color: white; }
        .print-hdr-starter { background: #1a1f2e; }
        .print-hdr-growth  { background: #3b5bdb; }
        .print-hdr-leader  { background: #1971c2; }
        .print-pname { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
        .print-ptagline { font-size: 10px; opacity: 0.7; margin-bottom: 8px; }
        .print-pprice { font-size: 20px; font-weight: 700; }
        .print-pprice-lbl { font-size: 10px; opacity: 0.6; }
        .print-pbills {
          display: inline-block;
          background: rgba(255,255,255,0.15);
          font-size: 10px; padding: 2px 8px;
          border-radius: 10px; margin-top: 5px;
        }
        .print-rec-badge {
          display: inline-block;
          background: rgba(255,255,255,0.25);
          font-size: 9px; padding: 2px 7px;
          border-radius: 10px; margin-left: 6px;
          vertical-align: middle; letter-spacing: 0.06em;
        }
        .print-features-list { padding: 10px 14px; }
        .print-feat {
          display: flex; align-items: center; gap: 7px;
          font-size: 11px; padding: 4px 0;
          border-bottom: 1px solid #f0f0f0; color: #333;
        }
        .print-feat:last-child { border-bottom: none; }
        .print-check-yes { color: #2e7d32; font-weight: 700; }
        .print-check-no { color: #ccc; }
        .print-note {
          margin-top: 18px;
          background: #f0f4ff;
          border: 1px solid #c7d2fe;
          border-radius: 6px;
          padding: 10px 14px;
          font-size: 11px;
          color: #3730a3;
        }
        .print-footer {
          margin-top: 16px;
          padding-top: 10px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #9ca3af;
        }
      `}</style>

      <div className="pc-overlay">
        {/* Toolbar */}
        <div className="pc-toolbar no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280', padding: 0 }}
            >←</button>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>Plan Comparison</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Share with clients to help them choose the right plan</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setEditing(e => !e)}
              style={{
                padding: '7px 16px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                color: '#374151',
              }}
            >
              {editing ? 'Done editing' : 'Edit prices & features'}
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                padding: '7px 16px',
                background: '#1a1f2e',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                opacity: downloading ? 0.7 : 1,
              }}
            >
              {downloading ? 'Preparing...' : 'Download PDF'}
            </button>
          </div>
        </div>

        {editing && (
          <div style={{ background: '#fffbeb', borderBottom: '1px solid #fcd34d', padding: '8px 24px', fontSize: 12, color: '#78350f' }} className="no-print">
            Edit mode — change prices, feature text, or toggle checkmarks. Changes only affect this download.
          </div>
        )}

        {/* Screen grid */}
        <div className="pc-grid no-print">
          {plans.map(plan => (
            <div key={plan.id} className={`pc-card ${plan.highlight ? 'recommended' : ''}`}>
              <div className={`pc-card-header ${plan.highlight ? 'recommended-header' : ''}`}>
                {plan.highlight && <span className="pc-rec-badge">RECOMMENDED</span>}
                <div className="pc-plan-name">{plan.name}</div>
                <div className="pc-plan-tagline">{plan.tagline}</div>
                <div className="pc-price-row">
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>₹</span>
                  {editing ? (
                    <input
                      type="number"
                      className="pc-price-input"
                      value={plan.price}
                      onChange={e => updatePrice(plan.id, Number(e.target.value))}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="pc-price">{plan.price.toLocaleString('en-IN')}</span>
                  )}
                  <span className="pc-price-label">/ year</span>
                </div>
                <div className="pc-bills">{plan.maxBills}</div>
              </div>
              <div className="pc-features">
                {plan.features.map(feature => (
                  <div key={feature.id} className="pc-feat-row">
                    <span
                      className={feature.included ? 'pc-check-yes' : 'pc-check-no'}
                      onClick={() => editing && toggleFeature(plan.id, feature.id)}
                      style={{ cursor: editing ? 'pointer' : 'default' }}
                      title={editing ? 'Click to toggle' : undefined}
                    >
                      {feature.included ? '✓' : '✕'}
                    </span>
                    {editing ? (
                      <input
                        type="text"
                        className="pc-feat-input"
                        value={feature.text}
                        onChange={e => updateFeatureText(plan.id, feature.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span style={{
                        color: feature.included ? '#111827' : '#9ca3af',
                        textDecoration: feature.included ? 'none' : 'line-through',
                        fontSize: 13,
                      }}>
                        {feature.text}
                      </span>
                    )}
                    {editing && (
                      <button
                        onClick={() => removeFeature(plan.id, feature.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 15, padding: 0, marginLeft: 'auto', lineHeight: 1 }}
                      >×</button>
                    )}
                  </div>
                ))}
                {editing && (
                  <button
                    onClick={() => addFeature(plan.id)}
                    style={{
                      width: '100%',
                      padding: '6px 0',
                      border: '1px dashed #d1d5db',
                      borderRadius: 6,
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: '#6b7280',
                      marginTop: 8,
                    }}
                  >+ Add feature</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Print area — hidden on screen */}
        <div id="plan-print-area" style={{ display: 'none' }}>
          <div className="print-header">
            <div>
              <div className="print-logo-text">⚡ flabs</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Diagnoshuttle Private Limited</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="print-title">Plan Comparison</div>
              <div className="print-subtitle">Choose the plan that fits your lab</div>
            </div>
          </div>

          <div className="print-grid">
            {plans.map(plan => (
              <div key={plan.id} className="print-card">
                <div className={`print-card-hdr print-hdr-${plan.id}`}>
                  <div className="print-pname">
                    {plan.name}
                    {plan.highlight && <span className="print-rec-badge">RECOMMENDED</span>}
                  </div>
                  <div className="print-ptagline">{plan.tagline}</div>
                  <div>
                    <span className="print-pprice">₹{plan.price.toLocaleString('en-IN')}</span>
                    <span className="print-pprice-lbl"> / year</span>
                  </div>
                  <div className="print-pbills">{plan.maxBills}</div>
                </div>
                <div className="print-features-list">
                  {plan.features.map(f => (
                    <div key={f.id} className="print-feat">
                      <span className={f.included ? 'print-check-yes' : 'print-check-no'}>
                        {f.included ? '✓' : '—'}
                      </span>
                      <span style={{ color: f.included ? '#333' : '#bbb', textDecoration: f.included ? 'none' : 'line-through' }}>
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="print-note">
            All plans include free onboarding, training, and data migration support. Machine interfacing is a one-time additional cost. Prices are exclusive of GST (18%).
          </div>

          <div className="print-footer">
            <span>flabs · Diagnoshuttle Private Limited · accounts@flabs.in · flabslis.com</span>
            <span>Generated for client reference · {today}</span>
          </div>
        </div>
      </div>
    </>
  )
}
