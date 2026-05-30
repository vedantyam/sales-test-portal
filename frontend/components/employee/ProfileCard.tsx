'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'

interface ProfileData {
  name: string
  email: string
  department: string
  phone: string | null
  joining_date: string | null
}

export default function ProfileCard({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user)
  const [flipped, setFlipped] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [phone, setPhone] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  const initials = (profile?.name || user?.name || '')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'ME'

  useEffect(() => {
    api.get('/employee/me').then((r) => {
      setProfile(r.data.employee)
      setPhone(r.data.employee.phone || '')
    }).catch(() => {})
  }, [])

  async function savePhone() {
    setSaving(true)
    setSaveErr('')
    try {
      await api.patch('/employee/me', { phone })
      setProfile((p) => p ? { ...p, phone } : p)
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setSaveErr(e?.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <style>{`
        .pc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(4px)}
        .pc-scene{width:320px;height:480px;perspective:1000px;cursor:pointer}
        .pc-inner{width:100%;height:100%;position:relative;transform-style:preserve-3d;transition:transform .65s cubic-bezier(.4,.2,.2,1)}
        .pc-inner.flipped{transform:rotateY(180deg)}
        .pc-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:20px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.5)}
        .pc-front{background:#1a1f2e}
        .pc-back{background:#252b3b;transform:rotateY(180deg)}
        .pc-shine{position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.04) 50%,rgba(255,255,255,0) 100%);pointer-events:none;animation:pcShimmer 3s ease-in-out infinite}
        @keyframes pcShimmer{0%,100%{opacity:0;transform:translateX(-100%)}50%{opacity:1;transform:translateX(100%)}}
        .pc-hint{position:absolute;bottom:12px;right:16px;font-size:11px;color:rgba(255,255,255,.3);letter-spacing:.05em}
        .pc-avatar{width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:500;color:white;margin:0 auto 16px;letter-spacing:1px}
        .pc-dept{display:inline-block;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.8);font-size:12px;padding:4px 14px;border-radius:20px;letter-spacing:.04em}
        .pc-accent{width:40px;height:3px;background:#3b5bdb;border-radius:2px;margin:12px auto}
        .pc-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.07)}
        .pc-icon{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .pc-lbl{font-size:11px;color:rgba(255,255,255,.38);margin-bottom:2px}
        .pc-val{font-size:14px;color:rgba(255,255,255,.85);font-weight:500}
        .pc-phone-input{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:8px;color:white;font-size:14px;padding:6px 10px;width:100%;outline:none}
        .pc-save-btn{background:#3b5bdb;border:none;border-radius:8px;color:white;font-size:13px;padding:6px 16px;cursor:pointer;margin-top:6px;width:100%;font-weight:500}
        .pc-save-btn:disabled{opacity:.6;cursor:not-allowed}
        .pc-logo{font-size:13px;font-weight:600;color:rgba(255,255,255,.9);letter-spacing:.05em}
        .pc-close{position:fixed;top:20px;right:20px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:white;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;z-index:1001;line-height:1}
        .pc-edit-btn{background:rgba(59,91,219,.25);border:1px solid rgba(59,91,219,.4);color:rgba(255,255,255,.7);font-size:11px;padding:2px 8px;border-radius:6px;cursor:pointer}
      `}</style>

      <div className="pc-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <button className="pc-close" onClick={onClose} aria-label="Close">×</button>

        <div className="pc-scene" onClick={() => setFlipped((f) => !f)}>
          <div className={`pc-inner${flipped ? ' flipped' : ''}`}>

            {/* FRONT */}
            <div className="pc-face pc-front">
              <div className="pc-shine" />
              <div style={{ padding: '28px 24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                  <span className="pc-logo">⚡ flabs</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', letterSpacing: '.1em' }}>SALES PORTAL</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="pc-avatar">{initials}</div>
                  <div className="pc-accent" />
                  <div style={{ fontSize: 21, fontWeight: 500, color: 'white', textAlign: 'center', marginBottom: 10, lineHeight: 1.2 }}>
                    {profile?.name || user?.name || '…'}
                  </div>
                  <span className="pc-dept">{profile?.department || user?.department || '—'}</span>
                </div>
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', letterSpacing: '.08em', marginBottom: 3 }}>
                    SALES TEAM MEMBER
                  </div>
                  {profile?.joining_date && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.2)' }}>
                      Since {new Date(profile.joining_date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
              <div className="pc-hint">tap to flip →</div>
            </div>

            {/* BACK */}
            <div className="pc-face pc-back">
              <div style={{ padding: '28px 24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: 20 }}>
                  <span className="pc-logo">⚡ flabs</span>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', marginTop: 4 }}>Profile details</div>
                </div>
                <div style={{ flex: 1 }}>
                  {/* Email */}
                  <div className="pc-row">
                    <div className="pc-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="pc-lbl">Email</div>
                      <div className="pc-val" style={{ fontSize: 12, wordBreak: 'break-all' }}>{profile?.email || '—'}</div>
                    </div>
                  </div>
                  {/* Phone */}
                  <div className="pc-row">
                    <div className="pc-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.64 12 19.79 19.79 0 0 1 1.59 3.18 2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 7.55 7.55l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="pc-lbl">Phone</div>
                      {editing ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <input
                            className="pc-phone-input"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 XXXXX XXXXX"
                            autoFocus
                          />
                          {saveErr && <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{saveErr}</div>}
                          <button className="pc-save-btn" onClick={savePhone} disabled={saving}>
                            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="pc-val">{profile?.phone || 'Not set'}</span>
                          <button
                            className="pc-edit-btn"
                            onClick={(e) => { e.stopPropagation(); setEditing(true) }}
                          >
                            {profile?.phone ? 'Edit' : 'Add'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Department */}
                  <div className="pc-row">
                    <div className="pc-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
                      </svg>
                    </div>
                    <div>
                      <div className="pc-lbl">Department</div>
                      <div className="pc-val">{profile?.department || '—'}</div>
                    </div>
                  </div>
                  {/* Member since */}
                  <div className="pc-row" style={{ borderBottom: 'none' }}>
                    <div className="pc-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div>
                      <div className="pc-lbl">Member since</div>
                      <div className="pc-val">
                        {profile?.joining_date
                          ? new Date(profile.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.18)', letterSpacing: '.04em' }}>
                    ⚡ flabs · diagnoshuttle private limited
                  </div>
                </div>
              </div>
              <div className="pc-hint">← tap to flip</div>
            </div>

          </div>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', color: 'rgba(255,255,255,.28)', fontSize: 12 }}>
          click card to flip
        </div>
      </div>
    </>
  )
}
