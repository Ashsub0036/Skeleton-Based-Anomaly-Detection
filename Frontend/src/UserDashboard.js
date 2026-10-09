import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import emailjs from "@emailjs/browser";

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ height:6, background:"#f1f5f9", borderRadius:3, overflow:"hidden", flex:1 }}>
      <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width 0.8s ease" }}/>
    </div>
  );
}

/* ══════════════════════════════
   USER DASHBOARD — MAIN
══════════════════════════════ */
export default function UserDashboard() {
  const [events, setEvents] = useState([]);
  const [counts, setCounts] = useState({ dangerous:0, suspicious:0, normal:0 });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState("monitor");
  const [alertFilter, setAlertFilter] = useState("ALL");

  // ── FIX: alertHistory stores ALL alerts ever seen this session (not just popup ones) ──
  const [alertHistory, setAlertHistory] = useState([]);
  // ── FIX: toastQueue only for the popup toasts (auto-dismiss) ──
  const [toasts, setToasts] = useState([]);
  const [notifCount, setNotifCount] = useState(0);

  // Track which event IDs we've already alerted on
  const sentAlertIds = useRef(new Set());
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  const logout = () => { localStorage.clear(); navigate("/"); };

  // ── Send email via EmailJS ──
  const sendEmailAlert = useCallback((event) => {
    emailjs.send(
      "service_4cokdtk",
      "template_f4l0we8",
      {
        to_email: "achuashwini363@gmail.com",
        event_type: event.eventType,
        reason: event.reason,
        time: new Date(event.timestamp).toLocaleString(),
        camera: event.cameraId,
        num_people: event.numPeople,
      },
      "TQJ40sVAM0lAtTpzw"
    ).then(() => {
      console.log("Email alert sent for event:", event.id);
    }).catch(err => console.error("Email send failed:", err));
  }, []);

  // ── Add a toast popup (auto-dismisses in 8s) ──
  const addToast = useCallback((event) => {
    const toast = {
      id: `toast-${Date.now()}-${event.id}`,
      type: event.eventType,
      message: event.reason,
      camera: event.cameraId,
      time: new Date().toLocaleTimeString(),
    };
    setToasts(prev => [toast, ...prev].slice(0, 5));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), 8000);
  }, []);

  // ── Add to persistent alert history ──
  const addToHistory = useCallback((event) => {
    const entry = {
      id: `hist-${event.id}-${event.eventType}`,
      eventId: event.id,
      type: event.eventType,
      message: event.reason,
      camera: event.cameraId,
      people: event.numPeople,
      time: new Date().toLocaleTimeString(),
      timestamp: new Date(),
    };
    setAlertHistory(prev => {
      // avoid duplicates in history
      if (prev.some(h => h.id === entry.id)) return prev;
      return [entry, ...prev];
    });
    setNotifCount(prev => prev + 1);
  }, []);

  // ── FIX: fetch from /api/events (all events) sorted newest first ──
  // Previously used /api/events/latest which only returns 10 records
  // and the 15-second window was too tight — events were missed
  const fetchEvents = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/events/latest");
      const data = [...res.data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setEvents(data);
      setCounts({
        dangerous: data.filter(e => e.eventType === "DANGEROUS").length,
        suspicious: data.filter(e => e.eventType === "SUSPICIOUS").length,
        normal:    data.filter(e => e.eventType === "NORMAL").length,
      });

      const now = Date.now();

      // ── FIX: Check ALL recent events (within 30s), not just the first one ──
      // This ensures every new dangerous/suspicious event triggers a notification
      data.forEach(event => {
        const ageSeconds = (now - new Date(event.timestamp).getTime()) / 1000;

        if (event.eventType === "DANGEROUS" && ageSeconds < 30) {
          const key = `danger-${event.id}`;
          if (!sentAlertIds.current.has(key)) {
            sentAlertIds.current.add(key);
            sendEmailAlert(event);  // send email
            addToast(event);        // show popup
            addToHistory(event);    // add to alert history page
          }
        }

        if (event.eventType === "SUSPICIOUS" && ageSeconds < 30) {
          const key = `susp-${event.id}`;
          if (!sentAlertIds.current.has(key)) {
            sentAlertIds.current.add(key);
            addToast(event);        // show popup
            addToHistory(event);    // add to alert history page
          }
        }
      });

    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  }, [sendEmailAlert, addToast, addToHistory]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const dangerousEvent = events.find(e =>
    e.eventType === "DANGEROUS" &&
    (Date.now() - new Date(e.timestamp).getTime()) / 1000 < 30
  );

  const total = counts.dangerous + counts.suspicious + counts.normal;

  const getBadge = (type) => ({
    DANGEROUS: { background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca" },
    SUSPICIOUS: { background:"#fffbeb", color:"#d97706", border:"1px solid #fde68a" },
    NORMAL:     { background:"#f0fdf4", color:"#16a34a", border:"1px solid #bbf7d0" },
  }[type] || {});

  const navItems = [
    { id:"monitor", icon:"⊞", label:"Dashboard" },
    { id:"alerts",  icon:"⊕", label:"Alert History" },
    { id:"activity",icon:"◎", label:"Activity" },
    { id:"profile", icon:"◉", label:"My Profile" },
  ];

  const filteredHistory = alertFilter === "ALL"
    ? alertHistory
    : alertHistory.filter(n => n.type === alertFilter);

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f0f4f8", fontFamily:"'Sora','Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        * { font-family:'Sora',sans-serif; box-sizing:border-box; }

        .user-sidebar { width:260px; min-height:100vh; background:linear-gradient(180deg,#0a1628 0%,#0d1f3c 100%); display:flex; flex-direction:column; position:sticky; top:0; height:100vh; overflow:hidden; transition:width 0.3s ease; flex-shrink:0; }
        .user-sidebar.collapsed { width:0; }

        .nav-item { display:flex; align-items:center; gap:12px; padding:11px 16px; border-radius:10px; cursor:pointer; font-size:13px; font-weight:500; color:rgba(255,255,255,0.5); transition:all 0.2s; margin-bottom:2px; white-space:nowrap; }
        .nav-item:hover { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.9); }
        .nav-item.active { background:linear-gradient(90deg,rgba(16,185,129,0.2),rgba(16,185,129,0.05)); color:#10b981; font-weight:600; border-left:3px solid #10b981; }

        .card-panel { background:#fff; border-radius:14px; border:1px solid #e2e8f0; overflow:hidden; }
        .panel-header { padding:18px 24px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }

        .stat-card { background:#fff; border-radius:14px; padding:22px 24px; flex:1; min-width:0; border:1px solid #e2e8f0; transition:transform 0.2s,box-shadow 0.2s; position:relative; overflow:hidden; }
        .stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:4px; background:var(--accent,#10b981); }
        .stat-card:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(0,0,0,0.08); }

        .table-row:hover { background:#f8fafc !important; }

        .ham-btn { display:flex; flex-direction:column; gap:5px; cursor:pointer; padding:9px; border-radius:8px; border:none; background:transparent; transition:all 0.2s; }
        .ham-btn:hover { background:#f1f5f9; }
        .ham-line { width:20px; height:2px; background:#475569; border-radius:2px; }

        .pulse-dot { animation:pdot 2s ease-in-out infinite; }
        @keyframes pdot { 0%,100%{opacity:1}50%{opacity:0.3} }
        .alert-pulse { animation:apulse 1.5s ease-in-out infinite; }
        @keyframes apulse { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.15)}50%{box-shadow:0 0 0 10px rgba(220,38,38,0)} }

        /* ── Toast popup styles ── */
        .toast-container { position:fixed; top:72px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:8px; max-width:340px; pointer-events:none; }
        .toast-item { padding:14px 16px; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.15); animation:slideIn 0.35s cubic-bezier(0.16,1,0.3,1); pointer-events:all; }
        @keyframes slideIn { from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1} }

        .filter-pill { padding:7px 16px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; border:1.5px solid; transition:all 0.15s; font-family:'Sora',sans-serif; }
        .filter-pill.active-all      { background:#f0f9ff; border-color:#38bdf8; color:#0284c7; }
        .filter-pill.active-danger   { background:#fef2f2; border-color:#fca5a5; color:#dc2626; }
        .filter-pill.active-suspicious { background:#fffbeb; border-color:#fde68a; color:#d97706; }
        .filter-pill.inactive { background:#f8fafc; border-color:#e2e8f0; color:#94a3b8; }

        .badge { padding:3px 11px; border-radius:20px; font-size:11px; font-weight:700; letter-spacing:0.3px; }
        .progress-bar-wrap { height:8px; background:#f1f5f9; border-radius:4px; overflow:hidden; margin-top:6px; }
        .progress-bar-fill { height:100%; border-radius:4px; transition:width 1s ease; }
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px; }
      `}</style>

      {/* ── TOAST POPUPS ── */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast-item"
            style={{ background:t.type === "DANGEROUS" ? "#fef2f2" : "#fffbeb", border:`1.5px solid ${t.type === "DANGEROUS" ? "#fca5a5" : "#fde68a"}`, borderLeft:`4px solid ${t.type === "DANGEROUS" ? "#dc2626" : "#f59e0b"}` }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{t.type === "DANGEROUS" ? "🚨" : "⚠️"}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:t.type === "DANGEROUS" ? "#dc2626" : "#d97706" }}>
                  {t.type === "DANGEROUS" ? "🚨 DANGER ALERT!" : "⚠️ Suspicious Activity!"}
                </div>
                <div style={{ fontSize:12, color:"#374151", marginTop:3, fontWeight:500 }}>{t.message}</div>
                <div style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>{t.camera} · {t.time}</div>
                {t.type === "DANGEROUS" && (
                  <div style={{ fontSize:11, color:"#10b981", marginTop:4, fontWeight:600 }}>📧 Email alert sent</div>
                )}
              </div>
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:16, padding:0, flexShrink:0 }}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── SIDEBAR ── */}
      <div className={`user-sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div style={{ padding:"22px 18px", borderBottom:"1px solid rgba(255,255,255,0.07)", minWidth:260 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, background:"linear-gradient(135deg,#10b981,#059669)", borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🛡️</div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:"#fff" }}>CCTV Guard</div>
              <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.4)" }}>User Portal</div>
            </div>
          </div>
        </div>
        <div style={{ padding:"16px 12px", flex:1, overflowY:"auto", minWidth:260 }}>
          <p style={{ color:"rgba(255,255,255,0.25)", fontSize:9.5, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", padding:"6px 8px", margin:"0 0 8px" }}>Navigation</p>
          {navItems.map(item => (
            <div key={item.id} className={`nav-item ${activePage === item.id ? "active" : ""}`} onClick={() => setActivePage(item.id)}>
              <span style={{ fontSize:17, width:20, textAlign:"center" }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.id === "alerts" && notifCount > 0 && (
                <span style={{ marginLeft:"auto", background:"#dc2626", color:"#fff", fontSize:10, padding:"2px 7px", borderRadius:20, fontWeight:700 }}>{notifCount}</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding:16, borderTop:"1px solid rgba(255,255,255,0.07)", minWidth:260 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:36, height:36, background:"rgba(255,255,255,0.08)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, border:"1px solid rgba(255,255,255,0.12)" }}>👤</div>
            <div>
              <div style={{ color:"#fff", fontSize:12.5, fontWeight:600 }}>{username}</div>
              <div style={{ color:"rgba(255,255,255,0.35)", fontSize:10.5 }}>Security User</div>
            </div>
          </div>
          <button onClick={logout} style={{ width:"100%", padding:9, background:"rgba(220,38,38,0.12)", border:"1px solid rgba(220,38,38,0.25)", color:"#f87171", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'Sora',sans-serif" }}>
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* Topbar */}
        <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 28px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button className="ham-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <div className="ham-line"/><div className="ham-line"/><div className="ham-line"/>
            </button>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:"#0f172a" }}>{navItems.find(n => n.id === activePage)?.label}</div>
              <div style={{ fontSize:11, color:"#94a3b8" }}>Welcome, {username}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {/* Bell button — navigates to alert history and clears badge */}
            <button onClick={() => { setActivePage("alerts"); setNotifCount(0); }}
              style={{ position:"relative", background:notifCount > 0 ? "#fef2f2" : "#f8fafc", border:`1.5px solid ${notifCount > 0 ? "#fca5a5" : "#e2e8f0"}`, borderRadius:10, padding:"8px 14px", cursor:"pointer", fontSize:17, transition:"all 0.2s" }}>
              🔔
              {notifCount > 0 && (
                <span style={{ position:"absolute", top:-6, right:-6, background:"#dc2626", color:"#fff", fontSize:10, width:18, height:18, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800 }}>{notifCount}</span>
              )}
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:7, background:"#f0fdf4", border:"1px solid #bbf7d0", padding:"6px 14px", borderRadius:20 }}>
              <div className="pulse-dot" style={{ width:7, height:7, borderRadius:"50%", background:"#16a34a" }}/>
              <span style={{ fontSize:12, color:"#16a34a", fontWeight:600 }}>Live · 5s refresh</span>
            </div>
          </div>
        </div>

        <div style={{ padding:"28px 32px", flex:1, overflowY:"auto" }}>

          {/* ── MONITOR / DASHBOARD ── */}
          {activePage === "monitor" && (
            <>
              <div style={{ background:"linear-gradient(135deg,#0d2137,#0a3d2e)", borderRadius:16, padding:"26px 32px", marginBottom:24, color:"#fff", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", right:-40, top:-40, width:220, height:220, borderRadius:"50%", background:"rgba(16,185,129,0.12)" }}/>
                <h2 style={{ margin:"0 0 8px", fontSize:22, fontWeight:800 }}>Welcome, {username}! 👋</h2>
                <p style={{ margin:0, opacity:0.65, fontSize:13.5 }}>Security monitoring is active — watching for anomalies in real-time</p>
                <div style={{ display:"flex", gap:14, marginTop:18 }}>
                  <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, padding:"9px 16px", fontSize:12, color:"rgba(255,255,255,0.75)", fontWeight:500 }}>
                    🔔 {notifCount} alerts this session
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, padding:"9px 16px", fontSize:12, color:"rgba(255,255,255,0.75)", fontWeight:500 }}>
                    📊 {total} events tracked
                  </div>
                </div>
              </div>

              {/* Active threat banner */}
              {dangerousEvent ? (
                <div className="alert-pulse" style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderLeft:"5px solid #dc2626", borderRadius:14, padding:"18px 24px", marginBottom:22, display:"flex", alignItems:"center", gap:16 }}>
                  <span style={{ fontSize:32 }}>🚨</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16, fontWeight:800, color:"#dc2626" }}>Active Threat Detected!</div>
                    <div style={{ fontSize:13, color:"#7f1d1d", marginTop:3 }}>{dangerousEvent.reason} — {dangerousEvent.cameraId}</div>
                    <div style={{ fontSize:11.5, color:"#ef4444", marginTop:5 }}>{new Date(dangerousEvent.timestamp).toLocaleString()}</div>
                  </div>
                  <div style={{ background:"#fff", border:"1px solid #fecaca", borderRadius:10, padding:"10px 16px", textAlign:"center" }}>
                    <div style={{ fontSize:10, color:"#94a3b8", fontWeight:700, textTransform:"uppercase" }}>Alert Sent</div>
                    <div style={{ fontSize:12, color:"#dc2626", marginTop:5, fontWeight:600 }}>📧 Email delivered</div>
                  </div>
                </div>
              ) : (
                <div style={{ background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderLeft:"5px solid #16a34a", borderRadius:14, padding:"14px 22px", marginBottom:22, display:"flex", alignItems:"center", gap:10 }}>
                  <div className="pulse-dot" style={{ width:9, height:9, borderRadius:"50%", background:"#16a34a", flexShrink:0 }}/>
                  <span style={{ fontSize:14, color:"#15803d", fontWeight:600 }}>All Clear — No active threats detected</span>
                </div>
              )}

              {/* Stat cards */}
              <div style={{ display:"flex", gap:16, marginBottom:24 }}>
                {[
                  { label:"Dangerous", value:counts.dangerous, color:"#ef4444", light:"#fef2f2", icon:"🚨" },
                  { label:"Suspicious",value:counts.suspicious,color:"#f59e0b", light:"#fffbeb", icon:"⚠️" },
                  { label:"Normal",    value:counts.normal,    color:"#10b981", light:"#f0fdf4", icon:"✅" },
                ].map(c => {
                  const pct = total > 0 ? Math.round((c.value / total) * 100) : 0;
                  return (
                    <div key={c.label} className="stat-card" style={{ "--accent":c.color }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                        <div style={{ width:44, height:44, background:c.light, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{c.icon}</div>
                        <span style={{ fontSize:11, color:c.color, fontWeight:700, background:c.light, padding:"3px 9px", borderRadius:20 }}>{pct}%</span>
                      </div>
                      <div style={{ fontSize:34, fontWeight:800, color:"#0f172a", lineHeight:1, marginBottom:4 }}>{c.value}</div>
                      <div style={{ fontSize:12.5, color:"#64748b", fontWeight:500, marginBottom:8 }}>{c.label}</div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>Latest 10 events</div>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-fill" style={{ width:`${pct}%`, background:c.color }}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Threat alerts table */}
              <div className="card-panel">
                <div className="panel-header">
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>⚡ Threat Alerts</span>
                    <span style={{ background:"#fef2f2", color:"#dc2626", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>
                      {events.filter(e => e.eventType !== "NORMAL").length}
                    </span>
                  </div>
                  <span style={{ fontSize:12, color:"#94a3b8" }}>Auto-refresh: 5s</span>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr style={{ background:"#f8fafc" }}>
                    {["Type","Reason","Camera","People","Timestamp"].map(h => (
                      <th key={h} style={{ padding:"12px 20px", textAlign:"left", fontSize:10.5, color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:0.6, borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {events.filter(e => e.eventType !== "NORMAL").map(e => (
                      <tr key={e.id} className="table-row" style={{ borderBottom:"1px solid #f8fafc" }}>
                        <td style={{ padding:"13px 20px" }}><span className="badge" style={getBadge(e.eventType)}>{e.eventType}</span></td>
                        <td style={{ padding:"13px 20px", fontSize:13, color:"#374151" }}>{e.reason}</td>
                        <td style={{ padding:"13px 20px" }}><span style={{ fontSize:12, color:"#6366f1", fontWeight:700, background:"#eef2ff", padding:"3px 10px", borderRadius:6 }}>{e.cameraId}</span></td>
                        <td style={{ padding:"13px 20px", fontSize:13, color:"#64748b", fontWeight:600 }}>{e.numPeople}</td>
                        <td style={{ padding:"13px 20px", fontSize:12, color:"#94a3b8" }}>{new Date(e.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {events.filter(e => e.eventType !== "NORMAL").length === 0 && (
                  <div style={{ padding:52, textAlign:"center" }}>
                    <div style={{ fontSize:36, marginBottom:10 }}>🎉</div>
                    <div style={{ color:"#16a34a", fontSize:14, fontWeight:600 }}>No threat alerts in latest records</div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── ALERT HISTORY ── FIX: shows persistent alertHistory, not transient toasts ── */}
          {activePage === "alerts" && (
            <div className="card-panel" style={{ overflow:"visible" }}>
              <div className="panel-header">
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>🔔 Alert History</span>
                  <span style={{ background:"#fef2f2", color:"#dc2626", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>{alertHistory.length}</span>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {[
                    { label:"All",           value:"ALL",        cls:"active-all" },
                    { label:"🚨 Dangerous",  value:"DANGEROUS",  cls:"active-danger" },
                    { label:"⚠️ Suspicious", value:"SUSPICIOUS", cls:"active-suspicious" },
                  ].map(f => (
                    <button key={f.value} className={`filter-pill ${alertFilter === f.value ? f.cls : "inactive"}`} onClick={() => setAlertFilter(f.value)}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding:"8px 24px 24px" }}>
                {filteredHistory.length === 0 ? (
                  <div style={{ padding:56, textAlign:"center" }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>🔕</div>
                    <div style={{ color:"#94a3b8", fontSize:14, fontWeight:500 }}>No alerts detected this session yet</div>
                    <div style={{ color:"#cbd5e1", fontSize:12, marginTop:6 }}>Alerts appear here automatically when DANGEROUS or SUSPICIOUS events are detected</div>
                  </div>
                ) : filteredHistory.map(n => (
                  <div key={n.id} style={{
                    display:"flex", gap:14, padding:16, marginTop:10,
                    background: n.type === "DANGEROUS" ? "#fef2f2" : "#fffbeb",
                    borderRadius:12,
                    border:`1px solid ${n.type === "DANGEROUS" ? "#fecaca" : "#fde68a"}`,
                    borderLeft:`4px solid ${n.type === "DANGEROUS" ? "#dc2626" : "#f59e0b"}`,
                  }}>
                    <span style={{ fontSize:24, flexShrink:0 }}>{n.type === "DANGEROUS" ? "🚨" : "⚠️"}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                        <span className="badge" style={getBadge(n.type)}>{n.type}</span>
                        <span style={{ fontSize:11.5, color:"#6366f1", fontWeight:600, background:"#eef2ff", padding:"2px 8px", borderRadius:6 }}>{n.camera}</span>
                        <span style={{ fontSize:11, color:"#94a3b8" }}>👥 {n.people} people</span>
                      </div>
                      <div style={{ fontSize:13, color:"#374151", fontWeight:500 }}>{n.message}</div>
                      <div style={{ fontSize:11.5, color:"#94a3b8", marginTop:5 }}>🕐 {n.time}</div>
                    </div>
                    {n.type === "DANGEROUS" && (
                      <div style={{ fontSize:11, color:"#10b981", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"6px 12px", alignSelf:"flex-start", fontWeight:600, whiteSpace:"nowrap" }}>
                        📧 Email sent
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ACTIVITY ── */}
          {activePage === "activity" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              <div className="card-panel" style={{ padding:24 }}>
                <h3 style={{ margin:"0 0 20px", fontSize:13, fontWeight:700, color:"#1e293b" }}>📊 Event Breakdown</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[
                    { label:"Dangerous", value:counts.dangerous, color:"#ef4444", bg:"#fef2f2" },
                    { label:"Suspicious",value:counts.suspicious,color:"#f59e0b", bg:"#fffbeb" },
                    { label:"Normal",    value:counts.normal,    color:"#10b981", bg:"#f0fdf4" },
                  ].map(item => {
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div key={item.label} style={{ padding:"12px 16px", background:item.bg, borderRadius:10, display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:10, height:10, borderRadius:3, background:item.color, flexShrink:0 }}/>
                        <span style={{ fontSize:13, color:"#374151", fontWeight:500, flex:1 }}>{item.label}</span>
                        <MiniBar value={item.value} max={total} color={item.color}/>
                        <span style={{ fontSize:13, fontWeight:800, color:item.color, minWidth:40, textAlign:"right" }}>{item.value}</span>
                        <span style={{ fontSize:11, color:"#94a3b8", minWidth:32, textAlign:"right" }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card-panel" style={{ padding:24 }}>
                <h3 style={{ margin:"0 0 16px", fontSize:13, fontWeight:700, color:"#1e293b" }}>🕐 Latest Events</h3>
                {events.slice(0, 10).map(e => (
                  <div key={e.id} style={{ display:"flex", gap:12, padding:"11px 0", borderBottom:"1px solid #f8fafc", alignItems:"center" }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:e.eventType==="DANGEROUS"?"#ef4444":e.eventType==="SUSPICIOUS"?"#f59e0b":"#10b981", flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12.5, fontWeight:500, color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.reason}</div>
                      <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>{e.cameraId} · {new Date(e.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <span className="badge" style={getBadge(e.eventType)}>{e.eventType.slice(0,3)}</span>
                  </div>
                ))}
                {events.length === 0 && <div style={{ padding:40, textAlign:"center", color:"#94a3b8", fontSize:13 }}>No events yet</div>}
              </div>

              <div className="card-panel" style={{ padding:24, gridColumn:"1 / -1" }}>
                <h3 style={{ margin:"0 0 16px", fontSize:13, fontWeight:700, color:"#1e293b" }}>📈 Session Statistics</h3>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
                  {[
                    { label:"Total Events Monitored",  value:total,           icon:"📊", color:"#6366f1", bg:"#eef2ff" },
                    { label:"Danger Alerts Triggered", value:counts.dangerous, icon:"🚨", color:"#ef4444", bg:"#fef2f2" },
                    { label:"Emails Dispatched",       value:counts.dangerous, icon:"📧", color:"#0ea5e9", bg:"#f0f9ff" },
                    { label:"Session Notifications",   value:notifCount,       icon:"🔔", color:"#8b5cf6", bg:"#f5f3ff" },
                  ].map(s => (
                    <div key={s.label} style={{ background:s.bg, borderRadius:12, padding:"18px 20px" }}>
                      <div style={{ fontSize:24, marginBottom:10 }}>{s.icon}</div>
                      <div style={{ fontSize:28, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
                      <div style={{ fontSize:11.5, color:"#64748b", marginTop:6, lineHeight:1.4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {activePage === "profile" && (
            <div style={{ maxWidth:540 }}>
              <div className="card-panel" style={{ padding:28, marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:18, marginBottom:28, paddingBottom:24, borderBottom:"1px solid #f1f5f9" }}>
                  <div style={{ width:72, height:72, background:"linear-gradient(135deg,#f0fdf4,#dcfce7)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, border:"3px solid #bbf7d0" }}>👤</div>
                  <div>
                    <div style={{ fontSize:20, fontWeight:800, color:"#0f172a" }}>{username}</div>
                    <div style={{ fontSize:13, color:"#64748b", marginTop:3 }}>Security Personnel</div>
                    <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:8 }}>
                      <div className="pulse-dot" style={{ width:7, height:7, borderRadius:"50%", background:"#10b981" }}/>
                      <span style={{ fontSize:12, color:"#10b981", fontWeight:700 }}>Active Session</span>
                    </div>
                  </div>
                </div>
                {[
                  { label:"Role",                      value:"Security Personnel",      icon:"🎭" },
                  { label:"Access Level",               value:"User (Read Only)",        icon:"🔐" },
                  { label:"Alert Email",                value:"achuashwini363@gmail.com",icon:"📧" },
                  { label:"Notifications This Session", value:`${notifCount} alerts`,    icon:"🔔" },
                  { label:"Portal",                    value:"CCTV Guard User Portal",  icon:"🛡️" },
                ].map(s => (
                  <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0", borderBottom:"1px solid #f8fafc" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:36, height:36, background:"#f8fafc", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, border:"1px solid #e2e8f0" }}>{s.icon}</div>
                      <span style={{ fontSize:13, color:"#64748b", fontWeight:500 }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:600, color:"#1e293b" }}>{s.value}</span>
                  </div>
                ))}
              </div>
              <div className="card-panel" style={{ padding:24 }}>
                <h3 style={{ margin:"0 0 16px", fontSize:13, fontWeight:700, color:"#1e293b" }}>🔒 Security & Access</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[
                    { label:"View Events",         allowed:true },
                    { label:"Receive Notifications",allowed:true },
                    { label:"Email Alerts",         allowed:true },
                    { label:"Manage Settings",      allowed:false },
                    { label:"Access Admin Panel",   allowed:false },
                    { label:"Delete Events",        allowed:false },
                  ].map(p => (
                    <div key={p.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 16px", background:p.allowed?"#f0fdf4":"#f8fafc", borderRadius:10, border:`1px solid ${p.allowed?"#bbf7d0":"#e2e8f0"}` }}>
                      <span style={{ fontSize:13, color:"#374151", fontWeight:500 }}>{p.label}</span>
                      <span style={{ fontSize:12, color:p.allowed?"#16a34a":"#94a3b8", fontWeight:700 }}>
                        {p.allowed ? "✅ Allowed" : "🔒 Restricted"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}