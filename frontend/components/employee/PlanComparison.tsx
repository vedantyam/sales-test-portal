'use client'
import { useState } from 'react'
import { DEFAULT_PLANS, Plan } from '@/lib/planData'

const FEATURE_LIBRARY = [
  'Patient Management',
  'Report Generation',
  'WhatsApp Report Sharing',
  'Barcode & QR Support',
  'Basic Analytics Dashboard',
  'Machine Interfacing',
  'Multi-Centre Management',
  'AI Interpretation',
  'B2B Client Portal',
  'QR Code on Bill',
  'Login Tracker',
  'Free Letterhead Design',
  'Quotation Module',
  'Activity Tracking',
  'Lab Mobile App',
  'Department Wise Signature',
  'Outsource Management',
  'Advanced Analytics',
  'Priority Support',
  'Custom Integrations',
  'RIS Module',
  'Dedicated Account Manager',
  'White-label Reports',
  'SLA Support',
  'Custom Training Sessions',
  'Data Migration Support',
  'Custom Pricing',
  'Bulk SMS/Email Reports',
  'Referral Doctor Portal',
  'Home Collection Management',
]

const PLAN_COLORS: Record<string, string> = {
  starter: '#1a1f2e',
  growth: '#3b5bdb',
  leader: '#1971c2',
  enterprise: '#0c447c',
}

function getComparisonRows(plans: Plan[]): string {
  const allTexts = new Set<string>()
  plans.forEach(plan => {
    plan.features.forEach(f => {
      if (!f.text.startsWith('All ')) allTexts.add(f.text)
    })
  })
  return Array.from(allTexts).map(text => {
    const cells = plans.map(plan => {
      const f = plan.features.find(feat => feat.text === text)
      const ok = f ? f.included : false
      return `<td style="text-align:center"><span class="${ok ? 'check-yes' : 'check-no'}">${ok ? '✓' : '✕'}</span></td>`
    }).join('')
    return `<tr><td>${text}</td>${cells}</tr>`
  }).join('')
}

function generatePrintHTML(plans: Plan[]): string {
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  const planCardsHTML = plans.map(plan => {
    const color = PLAN_COLORS[plan.id] || '#1a1f2e'
    const includedFeats = plan.features.filter(f => f.included)
    const excludedFeats = plan.features.filter(f => !f.included)
    const includedHTML = includedFeats.map(f => `
      <div class="feature-item">
        <span class="feature-check">&#10003;</span>
        <div class="feature-text">
          <div class="feature-name">${f.text}</div>
          ${f.explanation ? `<div class="feature-explain">${f.explanation}</div>` : ''}
        </div>
      </div>`).join('')
    const excludedHTML = excludedFeats.length > 0 ? `
      <div class="not-included-header">Not included:</div>
      ${excludedFeats.map(f => `
        <div class="feature-item not-included">
          <span class="feature-cross">&mdash;</span>
          <div class="feature-name muted">${f.text}</div>
        </div>`).join('')}` : ''
    const recBadge = plan.highlight ? '<div class="recommended-badge">&#9733; RECOMMENDED</div>' : ''
    return `
      <div class="plan-card">
        <div class="plan-header" style="background:${color}">
          ${recBadge}
          <div class="plan-name">${plan.name}</div>
          <div class="plan-tagline">${plan.tagline}</div>
          <div class="plan-price">&#8377;${plan.price.toLocaleString('en-IN')}<span class="plan-price-sub"> / year</span></div>
          <div class="plan-bills">${plan.maxBills}</div>
        </div>
        <div class="plan-body">
          ${includedHTML}
          ${excludedHTML}
        </div>
      </div>`
  }).join('')

  const thHeaders = plans.map(p => `<th class="${p.id}">${p.name}</th>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Flabs Plan Guide</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#1a1f2e;background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{margin:12mm 10mm;size:A4 portrait}

.cover{padding:20px 0 16px;border-bottom:3px solid #1a1f2e;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-end}
.logo-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.logo-box{width:30px;height:30px;background:#1a1f2e;border-radius:6px;display:flex;align-items:center;justify-content:center;color:white;font-size:15px;font-weight:700}
.logo-name{font-size:19px;font-weight:700;color:#1a1f2e}
.cover-title{font-size:24px;font-weight:700;color:#1a1f2e;margin-bottom:3px}
.cover-subtitle{font-size:12px;color:#666}
.cover-date{font-size:10px;color:#999;margin-bottom:6px;text-align:right}
.cover-tagline{font-size:10px;color:#3b5bdb;background:#e8f0fe;padding:3px 9px;border-radius:4px;display:inline-block}

.intro-box{background:#f0f4ff;border-left:4px solid #3b5bdb;border-radius:0 6px 6px 0;padding:12px 14px;margin-bottom:18px;font-size:11px;color:#333;line-height:1.6}
.intro-box strong{color:#1a1f2e}

.plans-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:18px}
.plan-card{border:1px solid #e0e0e0;border-radius:7px;overflow:hidden;break-inside:avoid}
.plan-header{padding:12px 11px;color:white;position:relative}
.recommended-badge{font-size:8px;background:rgba(255,255,255,0.25);color:white;padding:2px 7px;border-radius:8px;display:inline-block;margin-bottom:5px;letter-spacing:.05em}
.plan-name{font-size:13px;font-weight:700;margin-bottom:2px}
.plan-tagline{font-size:9px;opacity:.7;margin-bottom:7px;line-height:1.4}
.plan-price{font-size:17px;font-weight:700}
.plan-price-sub{font-size:9px;opacity:.65;font-weight:400}
.plan-bills{font-size:8px;background:rgba(255,255,255,0.15);padding:2px 6px;border-radius:7px;display:inline-block;margin-top:4px}
.plan-body{padding:8px 10px}
.feature-item{display:flex;align-items:flex-start;gap:6px;padding:4px 0;border-bottom:1px solid #f5f5f5}
.feature-item:last-child{border-bottom:none}
.feature-item.not-included{opacity:.4}
.feature-check{color:#2e7d32;font-weight:700;font-size:10px;flex-shrink:0;margin-top:1px}
.feature-cross{color:#bbb;font-size:10px;flex-shrink:0;margin-top:1px}
.feature-text{flex:1}
.feature-name{font-size:9px;font-weight:600;color:#1a1f2e;line-height:1.3}
.feature-name.muted{color:#999}
.feature-explain{font-size:8px;color:#666;margin-top:1px;line-height:1.3}
.not-included-header{font-size:8px;color:#bbb;padding:5px 0 2px;text-transform:uppercase;letter-spacing:.07em}

.section-title{font-size:15px;font-weight:700;color:#1a1f2e;margin:20px 0 10px;padding-bottom:5px;border-bottom:2px solid #e0e0e0}
.compare-table{width:100%;border-collapse:collapse;font-size:10px}
.compare-table th{padding:7px 8px;text-align:left;font-weight:700;color:white;font-size:9px}
.compare-table th:first-child{background:#555}
.compare-table th.starter{background:#1a1f2e}
.compare-table th.growth{background:#3b5bdb}
.compare-table th.leader{background:#1971c2}
.compare-table th.enterprise{background:#0c447c}
.compare-table td{padding:6px 8px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
.compare-table tr:last-child td{border-bottom:none}
.compare-table tr:nth-child(even) td{background:#fafafa}
.compare-table td:first-child{font-weight:500;color:#1a1f2e;font-size:9px}
.check-yes{color:#2e7d32;font-weight:700;font-size:12px}
.check-no{color:#ddd;font-size:12px}

.notes-box{background:#f8f9ff;border:1px solid #dde3ff;border-radius:6px;padding:11px 13px;margin:14px 0;font-size:9.5px;color:#444;line-height:1.65}
.notes-box strong{color:#1a1f2e}
.notes-title{font-size:10px;font-weight:700;color:#3b5bdb;margin-bottom:5px}
.cta-box{background:#1a1f2e;color:white;border-radius:7px;padding:12px 16px;text-align:center;margin:14px 0}
.cta-title{font-size:13px;font-weight:700;margin-bottom:3px}
.cta-sub{font-size:10px;opacity:.65}
.footer{margin-top:14px;padding-top:9px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:8.5px;color:#bbb}
.page-break{page-break-before:always;padding-top:18px}
</style>
</head>
<body>

<div class="cover">
  <div>
    <div class="logo-row">
      <div class="logo-box">&#9889;</div>
      <div class="logo-name">flabs</div>
    </div>
    <div class="cover-title">Your Lab, Upgraded.</div>
    <div class="cover-subtitle">Flabs Plan Guide &mdash; Choose what&apos;s right for your lab</div>
  </div>
  <div>
    <div class="cover-date">Prepared on ${date}</div>
    <div class="cover-tagline">All prices exclusive of 18% GST</div>
  </div>
</div>

<div class="intro-box">
  <strong>What is Flabs?</strong> Flabs is a cloud-based lab management software that helps diagnostic labs manage patients, generate reports, share results on WhatsApp, track staff activity, and grow their business &mdash; all from one place. Below are our plans. Pick the one that fits where your lab is today &mdash; you can always upgrade later.
</div>

<div class="plans-grid">
  ${planCardsHTML}
</div>

<div class="page-break">
  <div class="section-title">Feature Comparison at a Glance</div>
  <table class="compare-table">
    <thead>
      <tr>
        <th>Feature</th>
        ${thHeaders}
      </tr>
    </thead>
    <tbody>
      ${getComparisonRows(plans)}
    </tbody>
  </table>

  <div class="notes-box">
    <div class="notes-title">Important Notes</div>
    &bull; All plans include <strong>free onboarding</strong>, initial training, and setup support.<br/>
    &bull; <strong>Machine interfacing</strong> (connecting lab machines to software) is a one-time additional cost &mdash; not part of the annual plan price.<br/>
    &bull; Prices shown are <strong>per year, exclusive of 18% GST</strong>.<br/>
    &bull; You can upgrade your plan at any time &mdash; the difference is adjusted proportionally.<br/>
    &bull; <strong>All your existing patient data is safe</strong> and migrated when you switch to Flabs.
  </div>

  <div class="cta-box">
    <div class="cta-title">Ready to get started?</div>
    <div class="cta-sub">Contact your Flabs sales representative or email us at accounts@flabs.in</div>
  </div>

  <div class="footer">
    <span>flabs &middot; Diagnoshuttle Private Limited &middot; flabslis.com &middot; accounts@flabs.in</span>
    <span>This document is for reference only. Prices subject to change.</span>
  </div>
</div>

</body>
</html>`
}

export default function PlanComparison({ onClose }: { onClose: () => void }) {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS)
  const [editing, setEditing] = useState(false)
  const [addingFeature, setAddingFeature] = useState<Record<string, string>>({})
  const [customFeatureText, setCustomFeatureText] = useState<Record<string, string>>({})

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

  function removeFeature(planId: string, featureId: string) {
    setPlans(prev => prev.map(p =>
      p.id === planId
        ? { ...p, features: p.features.filter(f => f.id !== featureId) }
        : p
    ))
  }

  function addFeatureFromLibrary(planId: string, featureText: string) {
    const newId = `lib_${Date.now()}`
    let explanation = ''
    DEFAULT_PLANS.forEach(p => {
      const found = p.features.find(f => f.text === featureText)
      if (found?.explanation) explanation = found.explanation
    })
    setPlans(prev => prev.map(p =>
      p.id === planId
        ? { ...p, features: [...p.features, { id: newId, text: featureText, included: true, explanation }] }
        : p
    ))
  }

  function addCustomFeature(planId: string) {
    const text = customFeatureText[planId]?.trim()
    if (!text) return
    const newId = `custom_${Date.now()}`
    setPlans(prev => prev.map(p =>
      p.id === planId
        ? { ...p, features: [...p.features, { id: newId, text, included: true, explanation: '' }] }
        : p
    ))
    setCustomFeatureText(prev => ({ ...prev, [planId]: '' }))
    setAddingFeature(prev => ({ ...prev, [planId]: '' }))
  }

  function handleDownload() {
    const html = generatePrintHTML(plans)
    const win = window.open('', '_blank')
    if (!win) {
      alert('Please allow popups to download the PDF')
      return
    }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 500)
  }

  return (
    <>
      <style>{`
        .pc-overlay {
          position: fixed; inset: 0;
          background: #f3f4f6;
          z-index: 1000; overflow-y: auto;
        }
        .pc-toolbar {
          position: sticky; top: 0;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 24px;
          display: flex; align-items: center; justify-content: space-between;
          z-index: 10;
        }
        .pc-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px; padding: 24px;
          max-width: 1280px; margin: 0 auto;
        }
        @media (max-width: 900px) {
          .pc-grid { grid-template-columns: repeat(2, 1fr); }
        }
        .pc-card {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 12px; overflow: hidden;
        }
        .pc-card.recommended { border: 2px solid #3b5bdb; }
        .pc-card-header {
          padding: 18px; position: relative;
          background: #1a1f2e; color: white;
        }
        .pc-card-header.recommended-header { background: #3b5bdb; }
        .pc-rec-badge {
          position: absolute; top: 10px; right: 10px;
          background: rgba(255,255,255,0.2); color: white;
          font-size: 9px; padding: 3px 8px; border-radius: 20px;
          letter-spacing: .07em; font-weight: 500;
        }
        .pc-plan-name { font-size: 18px; font-weight: 500; color: white; margin-bottom: 3px; }
        .pc-plan-tagline { font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 12px; line-height: 1.4; }
        .pc-price-row { display: flex; align-items: baseline; gap: 4px; }
        .pc-price { font-size: 26px; font-weight: 500; color: white; }
        .pc-price-label { font-size: 12px; color: rgba(255,255,255,0.5); }
        .pc-bills {
          margin-top: 8px; font-size: 10px;
          color: rgba(255,255,255,0.7);
          background: rgba(255,255,255,0.1);
          display: inline-block; padding: 3px 10px; border-radius: 20px;
        }
        .pc-features { padding: 12px 16px; }
        .pc-feat-row {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px;
        }
        .pc-feat-row:last-child { border-bottom: none; }
        .pc-check-yes {
          width: 16px; height: 16px; border-radius: 50%;
          background: #e8f5e9; color: #2e7d32;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; flex-shrink: 0;
        }
        .pc-check-no {
          width: 16px; height: 16px; border-radius: 50%;
          background: #f3f4f6; color: #9ca3af;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; flex-shrink: 0;
        }
        .pc-price-input {
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          color: white; font-size: 22px; font-weight: 500;
          width: 100px; padding: 2px 6px; border-radius: 6px; outline: none;
        }
        .pc-feat-input {
          border: 1px solid #d1d5db; background: #f9fafb;
          color: #111; font-size: 11px; padding: 2px 6px;
          border-radius: 4px; flex: 1; outline: none;
        }
        .pc-add-select {
          flex: 1; border: 1px solid #d1d5db; border-radius: 6px;
          padding: 5px 8px; font-size: 12px;
          background: #f9fafb; color: #374151; cursor: pointer; outline: none;
        }
        .pc-custom-input {
          flex: 1; border: 1px solid #d1d5db; border-radius: 6px;
          padding: 5px 8px; font-size: 12px; outline: none;
        }
        .pc-add-btn {
          padding: 5px 12px; background: #1a1f2e; color: white;
          border: none; border-radius: 6px; cursor: pointer; font-size: 12px;
        }
      `}</style>

      <div className="pc-overlay">
        {/* Toolbar */}
        <div className="pc-toolbar">
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
              style={{ padding: '7px 16px', border: '1px solid #d1d5db', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#374151' }}
            >
              {editing ? 'Done editing' : 'Edit prices & features'}
            </button>
            <button
              onClick={handleDownload}
              style={{ padding: '7px 16px', background: '#1a1f2e', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
            >
              Download PDF
            </button>
          </div>
        </div>

        {editing && (
          <div style={{ background: '#fffbeb', borderBottom: '1px solid #fcd34d', padding: '8px 24px', fontSize: 12, color: '#78350f' }}>
            Edit mode — change prices, toggle features, or add from the library. Changes only affect this download.
          </div>
        )}

        <div className="pc-grid">
          {plans.map(plan => (
            <div key={plan.id} className={`pc-card${plan.highlight ? ' recommended' : ''}`}>
              <div className={`pc-card-header${plan.highlight ? ' recommended-header' : ''}`} style={!plan.highlight ? { background: PLAN_COLORS[plan.id] || '#1a1f2e' } : undefined}>
                {plan.highlight && <span className="pc-rec-badge">RECOMMENDED</span>}
                <div className="pc-plan-name">{plan.name}</div>
                <div className="pc-plan-tagline">{plan.tagline}</div>
                <div className="pc-price-row">
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>₹</span>
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
                      <span style={{ color: feature.included ? '#111827' : '#9ca3af', textDecoration: feature.included ? 'none' : 'line-through', fontSize: 12 }}>
                        {feature.text}
                      </span>
                    )}
                    {editing && (
                      <button
                        onClick={() => removeFeature(plan.id, feature.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 15, padding: 0, marginLeft: 'auto', lineHeight: 1, flexShrink: 0 }}
                      >×</button>
                    )}
                  </div>
                ))}

                {/* Add feature dropdown */}
                {editing && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                    <select
                      className="pc-add-select"
                      value={addingFeature[plan.id] || ''}
                      onChange={e => {
                        const val = e.target.value
                        if (val === '__custom__') {
                          setAddingFeature(prev => ({ ...prev, [plan.id]: '__custom__' }))
                        } else if (val) {
                          addFeatureFromLibrary(plan.id, val)
                          e.target.value = ''
                        }
                      }}
                    >
                      <option value="">+ Add feature...</option>
                      {FEATURE_LIBRARY.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                      <option value="__custom__">✏ Write custom feature</option>
                    </select>
                  </div>
                )}

                {/* Custom feature input */}
                {editing && addingFeature[plan.id] === '__custom__' && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      className="pc-custom-input"
                      placeholder="Feature name..."
                      value={customFeatureText[plan.id] || ''}
                      onChange={e => setCustomFeatureText(prev => ({ ...prev, [plan.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') addCustomFeature(plan.id) }}
                      autoFocus
                    />
                    <button className="pc-add-btn" onClick={() => addCustomFeature(plan.id)}>Add</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
