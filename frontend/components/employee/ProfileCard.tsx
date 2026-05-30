'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

interface ProfileData {
  name: string
  email: string
  department: string
  phone: string | null
  joining_date: string | null
}

export default function ProfileCard({ onClose }: { onClose: () => void }) {
  const { user, accessToken } = useAuthStore()
  const [flipped, setFlipped] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [phone, setPhone] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const firstName = (profile?.name || user?.name || '').split(' ')[0]
  const department = (profile?.department || user?.department || '').toUpperCase()

  const memberYear = profile?.joining_date
    ? new Date(profile.joining_date).getFullYear()
    : null

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/employee/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.employee) {
          setProfile(d.employee)
          setPhone(d.employee.phone || '')
        }
      })
      .catch(() => {})
  }, [accessToken])

  async function savePhone() {
    setSaving(true)
    try {
      const res = await fetch('/api/employee/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ phone }),
      })
      if (res.ok) {
        setProfile(p => p ? { ...p, phone } : p)
        setSaved(true)
        setEditing(false)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <style>{`
        .id-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 15, 40, 0.88);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(8px);
        }
        .id-close {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1001;
          line-height: 1;
        }
        .id-scene {
          width: 340px;
          height: 520px;
          perspective: 1200px;
          cursor: pointer;
          user-select: none;
        }
        .id-inner {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1);
          border-radius: 20px;
          box-shadow: 0 30px 60px rgba(0, 0, 20, 0.55);
        }
        .id-inner.flipped { transform: rotateY(180deg); }
        .id-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          border-radius: 20px;
          overflow: hidden;
        }
        .id-back-face { transform: rotateY(180deg); }

        .card-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(145deg, #1a2a6c 0%, #2545b8 45%, #3b5bdb 100%);
        }
        .deco-circle-1 {
          position: absolute;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          top: -70px; right: -70px;
          pointer-events: none;
        }
        .deco-circle-2 {
          position: absolute;
          width: 160px; height: 160px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
          bottom: 30px; left: -55px;
          pointer-events: none;
        }

        /* Front */
        .front-top-bar {
          position: relative; z-index: 2;
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 22px 12px;
        }
        .top-label {
          font-size: 10px; letter-spacing: 0.17em;
          color: rgba(255,255,255,0.45); font-weight: 600;
        }
        .front-hero {
          position: relative; z-index: 2;
          height: 185px; overflow: hidden;
        }
        .hero-art {
          width: 100%; height: 100%;
          background: linear-gradient(135deg, #1a2a6c 0%, #2040a0 50%, #4060d0 100%);
          display: flex; align-items: center; justify-content: center;
          position: relative;
        }
        .hero-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .hero-glow {
          position: absolute;
          width: 220px; height: 220px; border-radius: 50%;
          background: radial-gradient(circle, rgba(100,140,255,0.28) 0%, transparent 70%);
          top: 50%; left: 50%; transform: translate(-50%, -50%);
        }
        .hero-icon-box {
          position: relative; z-index: 1;
          width: 58px; height: 58px;
          border: 2px solid rgba(255,255,255,0.18);
          border-radius: 14px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
        }
        .front-divider {
          position: relative; z-index: 2;
          height: 1px; background: rgba(255,255,255,0.14);
          margin: 0 22px;
        }
        .front-content {
          position: relative; z-index: 2;
          padding: 18px 22px 10px;
          text-align: center; flex: 1;
        }
        .front-name {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 36px; font-weight: normal;
          color: white; letter-spacing: -0.5px;
          margin-bottom: 10px; line-height: 1.1;
        }
        .front-tagline {
          font-size: 11px; color: rgba(255,255,255,0.5);
          line-height: 1.55; margin-bottom: 12px;
          padding: 0 8px;
        }
        .front-dept {
          font-size: 11px; letter-spacing: 0.22em;
          color: rgba(255,255,255,0.4); font-weight: 600;
        }
        .front-bottom {
          position: relative; z-index: 2;
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 22px 18px;
          border-top: 1px solid rgba(255,255,255,0.09);
        }
        .flabs-logo-row {
          display: flex; align-items: center; gap: 7px;
        }
        .flabs-icon-box {
          width: 26px; height: 26px;
          background: white; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #1a2a6c;
        }
        .flabs-name { font-size: 14px; font-weight: 600; color: white; }
        .front-br { text-align: right; }
        .portal-label {
          font-size: 9px; letter-spacing: 0.17em;
          color: rgba(255,255,255,0.3); line-height: 1.4;
        }
        .tap-hint { font-size: 10px; color: rgba(255,255,255,0.25); margin-top: 3px; }

        /* Back */
        .back-content {
          position: relative; z-index: 2;
          padding: 22px; display: flex;
          flex-direction: column; height: 100%; box-sizing: border-box;
        }
        .back-hdr { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .back-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 26px; color: white; font-weight: normal;
          margin-bottom: 8px;
        }
        .back-divider { height: 1px; background: rgba(255,255,255,0.13); margin-bottom: 18px; }
        .back-fields { flex: 1; display: flex; flex-direction: column; }
        .back-field {
          padding: 11px 0;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .back-field:last-child { border-bottom: none; }
        .back-lbl {
          font-size: 10px; letter-spacing: 0.16em;
          color: rgba(255,255,255,0.33); margin-bottom: 4px; font-weight: 600;
        }
        .back-val { font-size: 15px; color: white; }
        .back-val.muted { color: rgba(255,255,255,0.4); }
        .ph-row { display: flex; align-items: center; gap: 8px; }
        .ph-edit-btn {
          font-size: 11px; background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.65); padding: 3px 9px;
          border-radius: 6px; cursor: pointer;
        }
        .ph-input {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.22);
          color: white; font-size: 13px;
          padding: 5px 9px; border-radius: 6px;
          outline: none; width: 145px;
        }
        .ph-save-btn {
          background: rgba(59,91,219,0.5);
          border: 1px solid rgba(59,91,219,0.8);
          color: white; font-size: 12px;
          padding: 5px 12px; border-radius: 6px; cursor: pointer;
        }
        .back-bottom {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.08);
          margin-top: 6px;
        }
        .back-company { font-size: 10px; color: rgba(255,255,255,0.22); }
        .back-tap { font-size: 10px; color: rgba(255,255,255,0.22); }
      `}</style>

      <div className="id-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <button className="id-close" onClick={onClose} aria-label="Close">×</button>

        <div className="id-scene" onClick={() => setFlipped(f => !f)}>
          <div className={`id-inner${flipped ? ' flipped' : ''}`}>

            {/* FRONT */}
            <div className="id-face">
              <div className="card-bg" />
              <div className="deco-circle-1" />
              <div className="deco-circle-2" />
              <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="front-top-bar">
                  <span className="top-label">SALES TEAM</span>
                  <span className="top-label">#001</span>
                </div>

                <div className="front-hero">
                  <div className="hero-art">
                    <div className="hero-grid" />
                    <div className="hero-glow" />
                    <div className="hero-icon-box">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9,22 9,12 15,12 15,22"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="front-divider" />

                <div className="front-content">
                  <div className="front-name">{firstName || '…'}</div>
                  <div className="front-tagline">
                    You're officially part of the team making diagnostic labs future-ready.
                  </div>
                  <div className="front-dept">{department || 'TEAM MEMBER'}</div>
                </div>

                <div className="front-bottom">
                  <div className="flabs-logo-row">
                    <div className="flabs-icon-box">⚡</div>
                    <span className="flabs-name">flabs</span>
                  </div>
                  <div className="front-br">
                    <div className="portal-label">SALES<br />PORTAL</div>
                    <div className="tap-hint">tap to flip →</div>
                  </div>
                </div>
              </div>
            </div>

            {/* BACK */}
            <div className="id-face id-back-face">
              <div className="card-bg" />
              <div className="deco-circle-1" />
              <div className="deco-circle-2" />
              <div className="back-content">
                <div className="back-hdr">
                  <div className="flabs-icon-box">⚡</div>
                  <span className="flabs-name">flabs</span>
                </div>
                <div className="back-title">Profile details</div>
                <div className="back-divider" />

                <div className="back-fields">
                  <div className="back-field">
                    <div className="back-lbl">EMAIL</div>
                    <div className="back-val">{profile?.email || user?.email || '—'}</div>
                  </div>

                  <div className="back-field">
                    <div className="back-lbl">PHONE</div>
                    {editing ? (
                      <div className="ph-row" onClick={e => e.stopPropagation()}>
                        <input
                          className="ph-input"
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="+91 XXXXX XXXXX"
                          autoFocus
                        />
                        <button className="ph-save-btn" onClick={savePhone} disabled={saving}>
                          {saving ? '…' : saved ? '✓' : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <div className="ph-row">
                        <span className={`back-val${!profile?.phone ? ' muted' : ''}`}>
                          {profile?.phone || 'Not set'}
                        </span>
                        <button
                          className="ph-edit-btn"
                          onClick={e => { e.stopPropagation(); setEditing(true) }}
                        >
                          {profile?.phone ? 'Edit' : 'Add'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="back-field">
                    <div className="back-lbl">DEPARTMENT</div>
                    <div className="back-val">{profile?.department || user?.department || '—'}</div>
                  </div>

                  <div className="back-field">
                    <div className="back-lbl">MEMBER SINCE</div>
                    <div className="back-val">{memberYear ?? '—'}</div>
                  </div>
                </div>

                <div className="back-bottom">
                  <div className="back-company">flabs · diagnoShuttle private limited</div>
                  <div className="back-tap">← tap to flip</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div style={{ marginTop: 14, textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: 11, letterSpacing: '0.06em' }}>
          CLICK CARD TO FLIP
        </div>
      </div>
    </>
  )
}
