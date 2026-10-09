import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

/* ── Bar Chart ── */
function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140, padding: "0 4px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{d.value}</span>
          <div style={{ width: "100%", background: "#f1f5f9", borderRadius: "6px 6px 0 0", height: 110, display: "flex", alignItems: "flex-end" }}>
            <div style={{ width: "100%", height: `${(d.value / max) * 100}%`, background: d.color, borderRadius: "6px 6px 0 0", minHeight: d.value > 0 ? 8 : 0, transition: "height 0.8s ease" }} />
          </div>
          <span style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", fontWeight: 500 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Donut Chart ── */
function DonutChart({ dangerous, suspicious, normal, total }) {
  const size = 160, cx = 80, cy = 80, r = 60, stroke = 22;
  const circ = 2 * Math.PI * r;
  const segs = [
    { pct: total > 0 ? dangerous / total : 0, color: "#ef4444" },
    { pct: total > 0 ? suspicious / total : 0, color: "#f59e0b" },
    { pct: total > 0 ? normal / total : 0, color: "#10b981" },
  ];
  let cum = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {total === 0
          ? <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
          : segs.map((s, i) => {
              const dash = s.pct * circ;
              const offset = circ - cum * circ;
              cum += s.pct;
              return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
                strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={offset} />;
            })}
        <text x={cx} y={cy - 6} textAnchor="middle" style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px`, fill: "#1e293b", fontSize: 22, fontWeight: 700 }}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px`, fill: "#94a3b8", fontSize: 10 }}>Events</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[{ label: "Dangerous", color: "#ef4444", val: dangerous }, { label: "Suspicious", color: "#f59e0b", val: suspicious }, { label: "Normal", color: "#10b981", val: normal }].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
            <span style={{ fontSize: 12, color: "#64748b" }}>{s.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", marginLeft: "auto" }}>
              {total > 0 ? Math.round((s.val / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Line Sparkline ── */
function LineSparkline({ events }) {
  const width = 340, height = 80;
  if (!events || events.length < 2) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 12 }}>Not enough data</div>
  );
  const hourCounts = {};
  events.forEach(e => { const h = new Date(e.timestamp).getHours(); hourCounts[h] = (hourCounts[h] || 0) + 1; });
  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: hourCounts[i] || 0 }));
  const max = Math.max(...hours.map(h => h.count), 1);
  const pts = hours.map((h, i) => `${(i / 23) * (width - 20) + 10},${height - 10 - ((h.count / max) * (height - 20))}`).join(" ");
  const area = `M10,${height - 10} ` + hours.map((h, i) => `L${(i / 23) * (width - 20) + 10},${height - 10 - ((h.count / max) * (height - 20))}`).join(" ") + ` L${width - 10},${height - 10} Z`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lg)" />
      <polyline points={pts} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ══════════════════════════════
   ADMIN DASHBOARD — MAIN
══════════════════════════════ */
export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [counts, setCounts] = useState({ total: 0, dangerous: 0, suspicious: 0, normal: 0 });
  const [filterType, setFilterType] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [newAlertCount, setNewAlertCount] = useState(0);
const [lastSeenAlertId, setLastSeenAlertId] = useState(0);
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  const logout = () => { localStorage.clear(); navigate("/"); };

  // ── Fetch all events, keep ONLY last 20 days, sort newest first ──
  const fetchEvents = useCallback(async () => {
  try {
    const res = await axios.get("http://localhost:8080/api/events");

    const cutoffMs = Date.now() - 20 * 24 * 60 * 60 * 1000;
    const data = [...res.data]
      .filter(e => {
        const ts = new Date(e.timestamp).getTime();
        return !isNaN(ts) && ts >= cutoffMs;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setEvents(data);
    setLastUpdate(new Date());

    setCounts({
      total: data.length,
      dangerous: data.filter(e => e.eventType === "DANGEROUS").length,
      suspicious: data.filter(e => e.eventType === "SUSPICIOUS").length,
      normal: data.filter(e => e.eventType === "NORMAL").length,
    });

    const latestAlerts = data.filter(e => e.eventType !== "NORMAL");

    // ✅ FIXED LOGIC (no stale state issue)
    setLastSeenAlertId(prevId => {
      if (latestAlerts.length > 0 && latestAlerts[0].id > prevId) {
        setNewAlertCount(prev => prev + 1);
        return latestAlerts[0].id;
      }
      return prevId;
    });

  } catch (err) {
    console.error("Failed to fetch events:", err);
  }
}, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setTimeout(() => setRefreshing(false), 600);
  };

  useEffect(() => {
    fetchEvents();
    // Poll every 5 seconds — always gets fresh data
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // ── FIX: filter runs whenever events OR filter settings change ──
  useEffect(() => {
    let result = [...events];
    if (filterType !== "ALL") result = result.filter(e => e.eventType === filterType);
    if (filterDate) result = result.filter(e => new Date(e.timestamp).toLocaleDateString("en-CA") === filterDate);
    // Already sorted newest first from fetch, maintain that order
    setFiltered(result);
  }, [events, filterType, filterDate]);

  const getBadge = (type) => ({
    DANGEROUS: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
    SUSPICIOUS: { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" },
    NORMAL: { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" },
  }[type] || {});

  const navItems = [
    { id: "overview", icon: "⊞", label: "Overview" },
    { id: "analytics", icon: "◎", label: "Analytics" },
    { id: "events", icon: "≡", label: "Event Log" },
    { id: "cameras", icon: "◉", label: "Cameras" },
    { id: "alerts", icon: "⊕", label: "Alert History" },
    { id: "settings", icon: "◈", label: "Settings" },
  ];

  const dangerPct = counts.total > 0 ? Math.round((counts.dangerous / counts.total) * 100) : 0;
  const suspPct   = counts.total > 0 ? Math.round((counts.suspicious / counts.total) * 100) : 0;
  const normPct   = counts.total > 0 ? Math.round((counts.normal / counts.total) * 100) : 0;
  const barData   = [
    { label: "Total",   value: counts.total,     color: "#6366f1" },
    { label: "Danger",  value: counts.dangerous,  color: "#ef4444" },
    { label: "Suspect", value: counts.suspicious, color: "#f59e0b" },
    { label: "Normal",  value: counts.normal,     color: "#10b981" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f0f4f8", fontFamily: "'Sora','Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        * { font-family:'Sora',sans-serif; box-sizing:border-box; }
        .admin-sidebar { width:260px; min-height:100vh; background:linear-gradient(180deg,#0a1628 0%,#0d1f3c 100%); display:flex; flex-direction:column; position:sticky; top:0; height:100vh; overflow:hidden; transition:width 0.3s ease; flex-shrink:0; }
        .admin-sidebar.collapsed { width:0; }
        .nav-item { display:flex; align-items:center; gap:12px; padding:11px 16px; border-radius:10px; cursor:pointer; font-size:13px; font-weight:500; color:rgba(255,255,255,0.5); transition:all 0.2s; margin-bottom:2px; white-space:nowrap; }
        .nav-item:hover { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.9); }
        .nav-item.active { background:linear-gradient(90deg,rgba(16,185,129,0.2),rgba(16,185,129,0.05)); color:#10b981; font-weight:600; border-left:3px solid #10b981; }
        .stat-card { background:#fff; border-radius:14px; padding:22px 24px; flex:1; min-width:0; border:1px solid #e2e8f0; transition:transform 0.2s,box-shadow 0.2s; cursor:pointer; position:relative; overflow:hidden; }
        .stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:4px; background:var(--accent,#10b981); }
        .stat-card:hover { transform:translateY(-2px); box-shadow:0 8px 30px rgba(0,0,0,0.08); }
        .card-panel { background:#fff; border-radius:14px; border:1px solid #e2e8f0; overflow:hidden; }
        .panel-header { padding:18px 24px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
        .table-row:hover { background:#f8fafc !important; }
        .filter-btn { padding:8px 18px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; border:1.5px solid; transition:all 0.15s; font-family:'Sora',sans-serif; }
        .filter-btn.active-all { background:#f0f9ff; border-color:#38bdf8; color:#0284c7; }
        .filter-btn.active-danger { background:#fef2f2; border-color:#fca5a5; color:#dc2626; }
        .filter-btn.active-suspicious { background:#fffbeb; border-color:#fde68a; color:#d97706; }
        .filter-btn.active-normal { background:#f0fdf4; border-color:#bbf7d0; color:#16a34a; }
        .filter-btn.inactive { background:#f8fafc; border-color:#e2e8f0; color:#94a3b8; }
        .refresh-btn { display:flex; align-items:center; gap:6px; padding:8px 16px; background:linear-gradient(135deg,#10b981,#059669); color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600; font-family:'Sora',sans-serif; box-shadow:0 2px 10px rgba(16,185,129,0.25); transition:all 0.2s; }
        .refresh-btn:hover { box-shadow:0 4px 18px rgba(16,185,129,0.4); transform:translateY(-1px); }
        .spin { animation:spin 0.6s linear infinite; display:inline-block; }
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        .pulse-dot { animation:pdot 2s ease-in-out infinite; }
        @keyframes pdot { 0%,100%{opacity:1}50%{opacity:0.3} }
        .ham-btn { display:flex; flex-direction:column; gap:5px; cursor:pointer; padding:9px; border-radius:8px; border:none; background:transparent; transition:all 0.2s; }
        .ham-btn:hover { background:#f1f5f9; }
        .ham-line { width:20px; height:2px; background:#475569; border-radius:2px; }
        .filter-date-input { padding:9px 12px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:12px; font-family:'Sora',sans-serif; background:#fff; color:#374151; outline:none; cursor:pointer; }
        .filter-date-input:focus { border-color:#10b981; }
        .cam-card { background:#fff; border-radius:14px; border:1px solid #e2e8f0; padding:24px; transition:all 0.2s; }
        .cam-card:hover { transform:translateY(-2px); box-shadow:0 8px 30px rgba(0,0,0,0.07); }
        .settings-row { display:flex; justify-content:space-between; align-items:center; padding:16px 0; border-bottom:1px solid #f8fafc; }
        .badge { padding:3px 11px; border-radius:20px; font-size:11px; font-weight:700; letter-spacing:0.3px; }
        .progress-bar-wrap { height:8px; background:#f1f5f9; border-radius:4px; overflow:hidden; margin-top:6px; }
        .progress-bar-fill { height:100%; border-radius:4px; transition:width 1s ease; }
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div className={`admin-sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div style={{ padding:"22px 18px", borderBottom:"1px solid rgba(255,255,255,0.07)", minWidth:260 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, background:"linear-gradient(135deg,#10b981,#059669)", borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🛡️</div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:"#fff" }}>CCTV Guard</div>
              <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.4)" }}>Admin Panel</div>
            </div>
          </div>
        </div>
        <div style={{ padding:"16px 12px", flex:1, overflowY:"auto", minWidth:260 }}>
          <p style={{ color:"rgba(255,255,255,0.25)", fontSize:9.5, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", padding:"6px 8px", margin:"0 0 8px" }}>Main Menu</p>
        {navItems.map(item => (
  <div key={item.id} className={`nav-item ${activePage === item.id ? "active" : ""}`}
    onClick={() => {
      setActivePage(item.id);
      if (item.id === "alerts") {
        setNewAlertCount(0);
        const latest = events.filter(e => e.eventType !== "NORMAL");
        if (latest.length > 0) setLastSeenAlertId(latest[0].id);
      }
    }}>
    <div className="nav-icon">{item.icon}</div>
    <span>{item.label}</span>
    {item.id === "alerts" && newAlertCount > 0 && (
      <span style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", fontSize: "10px", padding: "2px 8px", borderRadius: "20px", fontWeight: "700" }}>{newAlertCount}</span>
    )}
  </div>
))} 
        </div>
        <div style={{ padding:16, borderTop:"1px solid rgba(255,255,255,0.07)", minWidth:260 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:36, height:36, background:"rgba(255,255,255,0.08)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, border:"1px solid rgba(255,255,255,0.12)" }}>👤</div>
            <div>
              <div style={{ color:"#fff", fontSize:12.5, fontWeight:600 }}>{username}</div>
              <div style={{ color:"rgba(255,255,255,0.35)", fontSize:10.5 }}>Administrator</div>
            </div>
          </div>
          <button onClick={logout} style={{ width:"100%", padding:"9px", background:"rgba(220,38,38,0.12)", border:"1px solid rgba(220,38,38,0.25)", color:"#f87171", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'Sora',sans-serif" }}>
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* Topbar */}
        <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 28px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button className="ham-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <div className="ham-line"/><div className="ham-line"/><div className="ham-line"/>
            </button>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:"#0f172a" }}>{navItems.find(n => n.id === activePage)?.label}</div>
              <div style={{ fontSize:11, color:"#94a3b8" }}>Anomaly Detection System</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, background:"#f0fdf4", border:"1px solid #bbf7d0", padding:"6px 14px", borderRadius:20 }}>
              <div className="pulse-dot" style={{ width:7, height:7, borderRadius:"50%", background:"#16a34a" }}/>
              <span style={{ fontSize:12, color:"#16a34a", fontWeight:600 }}>Live · {lastUpdate.toLocaleTimeString()}</span>
            </div>
            <button className="refresh-btn" onClick={handleRefresh}>
              <span className={refreshing ? "spin" : ""} style={{ fontSize:15 }}>↻</span>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Pages */}
        <div style={{ padding:"28px 32px", flex:1, overflowY:"auto" }}>

          {/* ── OVERVIEW ── */}
          {activePage === "overview" && (
            <>
              <div style={{ background:"linear-gradient(135deg,#0d2137,#0a3d2e)", borderRadius:16, padding:"28px 32px", marginBottom:24, color:"#fff", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", right:-30, top:-30, width:200, height:200, borderRadius:"50%", background:"rgba(16,185,129,0.15)" }}/>
                <h2 style={{ margin:"0 0 8px", fontSize:22, fontWeight:800 }}>Welcome back, {username}! 👋</h2>
                <p style={{ margin:0, opacity:0.7, fontSize:13.5 }}>Here's your CCTV surveillance overview — auto-refreshing every 5 seconds</p>
                <div style={{ display:"flex", gap:16, marginTop:20 }}>
                  <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, padding:"10px 18px", fontSize:12, color:"rgba(255,255,255,0.8)", fontWeight:500 }}>📷 3 Cameras Configured</div>
                  <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, padding:"10px 18px", fontSize:12, color:"rgba(255,255,255,0.8)", fontWeight:500 }}>🔄 {lastUpdate.toLocaleTimeString()} last sync</div>
                  <div style={{ background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:10, padding:"10px 18px", fontSize:12, color:"#6ee7b7", fontWeight:600 }}>📅 Showing last 20 days</div>
                </div>
              </div>

              {/* Stat cards */}
              <div style={{ display:"flex", gap:16, marginBottom:24 }}>
                {[
                  { label:"Total Events",  value:counts.total,     color:"#6366f1", light:"#eef2ff", icon:"📊", pct:100 },
                  { label:"Dangerous",     value:counts.dangerous,  color:"#ef4444", light:"#fef2f2", icon:"🚨", pct:dangerPct },
                  { label:"Suspicious",    value:counts.suspicious, color:"#f59e0b", light:"#fffbeb", icon:"⚠️", pct:suspPct },
                  { label:"Normal",        value:counts.normal,     color:"#10b981", light:"#f0fdf4", icon:"✅", pct:normPct },
                ].map(c => (
                  <div key={c.label} className="stat-card" style={{ "--accent":c.color }}
                    onClick={() => { setFilterType(c.label === "Total Events" ? "ALL" : c.label.toUpperCase()); setActivePage("events"); }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                      <div style={{ width:44, height:44, background:c.light, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{c.icon}</div>
                      <span style={{ fontSize:11, color:c.color, fontWeight:700, background:c.light, padding:"3px 9px", borderRadius:20 }}>{c.pct}%</span>
                    </div>
                    <div style={{ fontSize:32, fontWeight:800, color:"#0f172a", lineHeight:1, marginBottom:4 }}>{c.value}</div>
                    <div style={{ fontSize:12.5, color:"#64748b", fontWeight:500 }}>{c.label}</div>
                    <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>Last 20 days</div>
                    <div className="progress-bar-wrap" style={{ marginTop:8 }}>
                      <div className="progress-bar-fill" style={{ width:`${c.pct}%`, background:c.color }}/>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── FIX: Recent Activity — events already sorted newest first ── */}
              <div className="card-panel">
                <div className="panel-header">
                  <span style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>🕐 Recent Activity</span>
                  <span style={{ fontSize:12, color:"#94a3b8" }}>Showing latest {Math.min(events.length, 10)} events</span>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr style={{ background:"#f8fafc" }}>
                    {["#ID","Camera","Type","Reason","People","Timestamp"].map(h => (
                      <th key={h} style={{ padding:"12px 20px", textAlign:"left", fontSize:10.5, color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:0.6, borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {events.slice(0, 10).map(e => (
                      <tr key={e.id} className="table-row" style={{ borderBottom:"1px solid #f8fafc" }}>
                        <td style={{ padding:"13px 20px", fontSize:12, color:"#94a3b8", fontWeight:600 }}>#{e.id}</td>
                        <td style={{ padding:"13px 20px" }}><span style={{ fontSize:12, color:"#6366f1", fontWeight:700, background:"#eef2ff", padding:"3px 10px", borderRadius:6 }}>{e.cameraId}</span></td>
                        <td style={{ padding:"13px 20px" }}><span className="badge" style={getBadge(e.eventType)}>{e.eventType}</span></td>
                        <td style={{ padding:"13px 20px", fontSize:13, color:"#374151" }}>{e.reason}</td>
                        <td style={{ padding:"13px 20px", fontSize:13, color:"#64748b", fontWeight:600 }}>{e.numPeople}</td>
                        <td style={{ padding:"13px 20px", fontSize:12, color:"#94a3b8" }}>{new Date(e.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {events.length === 0 && <div style={{ padding:48, textAlign:"center", color:"#94a3b8", fontSize:13 }}>No events yet</div>}
              </div>
            </>
          )}

          {/* ── ANALYTICS ── */}
          {activePage === "analytics" && (
            <>
              <div style={{ display:"flex", gap:16, marginBottom:24 }}>
                {[
                  { label:"Total Events", value:counts.total,     color:"#6366f1", icon:"📊" },
                  { label:"Dangerous",    value:counts.dangerous,  color:"#ef4444", icon:"🚨" },
                  { label:"Suspicious",   value:counts.suspicious, color:"#f59e0b", icon:"⚠️" },
                  { label:"Normal",       value:counts.normal,     color:"#10b981", icon:"✅" },
                ].map(c => (
                  <div key={c.label} className="stat-card" style={{ cursor:"default" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      <span style={{ fontSize:22 }}>{c.icon}</span>
                      <span style={{ fontSize:11.5, color:"#64748b", fontWeight:500 }}>{c.label}</span>
                    </div>
                    <div style={{ fontSize:34, fontWeight:800, color:c.color }}>{c.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
                <div className="card-panel" style={{ padding:24 }}>
                  <h3 style={{ margin:"0 0 20px", fontSize:13, fontWeight:700, color:"#1e293b" }}>📊 Event Count — Bar Chart</h3>
                  <BarChart data={barData}/>
                  <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:14 }}>
                    {barData.map(d => (
                      <div key={d.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:10, height:10, borderRadius:3, background:d.color }}/>
                        <span style={{ fontSize:11, color:"#64748b" }}>{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card-panel" style={{ padding:24 }}>
                  <h3 style={{ margin:"0 0 20px", fontSize:13, fontWeight:700, color:"#1e293b" }}>🥧 Threat Distribution</h3>
                  <DonutChart dangerous={counts.dangerous} suspicious={counts.suspicious} normal={counts.normal} total={counts.total}/>
                  <div style={{ marginTop:20, display:"flex", flexDirection:"column", gap:10 }}>
                    {[
                      { label:"Dangerous", value:counts.dangerous, pct:dangerPct, color:"#ef4444", bg:"#fef2f2" },
                      { label:"Suspicious", value:counts.suspicious, pct:suspPct, color:"#f59e0b", bg:"#fffbeb" },
                      { label:"Normal", value:counts.normal, pct:normPct, color:"#10b981", bg:"#f0fdf4" },
                    ].map(item => (
                      <div key={item.label} style={{ padding:"10px 14px", background:item.bg, borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:12.5, color:"#374151", fontWeight:500 }}>{item.label}</span>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div className="progress-bar-wrap" style={{ width:80, marginTop:0 }}>
                            <div className="progress-bar-fill" style={{ width:`${item.pct}%`, background:item.color }}/>
                          </div>
                          <span style={{ fontSize:12, color:item.color, fontWeight:700, minWidth:56 }}>{item.value} ({item.pct}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20 }}>
                <div className="card-panel" style={{ padding:24 }}>
                  <h3 style={{ margin:"0 0 6px", fontSize:13, fontWeight:700, color:"#1e293b" }}>📈 Events by Hour — Trend</h3>
                  <p style={{ margin:"0 0 16px", fontSize:11.5, color:"#94a3b8" }}>Distribution across hours of the day</p>
                  <LineSparkline events={events}/>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, paddingTop:6, borderTop:"1px solid #f1f5f9" }}>
                    <span style={{ fontSize:10.5, color:"#94a3b8" }}>12 AM</span>
                    <span style={{ fontSize:10.5, color:"#94a3b8" }}>12 PM</span>
                    <span style={{ fontSize:10.5, color:"#94a3b8" }}>11 PM</span>
                  </div>
                </div>
                {/* ── FIX: Live Feed uses same sorted events ── */}
                <div className="card-panel" style={{ padding:24 }}>
                  <h3 style={{ margin:"0 0 16px", fontSize:13, fontWeight:700, color:"#1e293b" }}>⚡ Live Feed</h3>
                  {events.slice(0, 8).map(e => (
                    <div key={e.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:"1px solid #f8fafc" }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:e.eventType === "DANGEROUS" ? "#ef4444" : e.eventType === "SUSPICIOUS" ? "#f59e0b" : "#10b981", flexShrink:0 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:500, color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.reason}</div>
                        <div style={{ fontSize:10.5, color:"#94a3b8" }}>{e.cameraId} · {new Date(e.timestamp).toLocaleTimeString()}</div>
                      </div>
                      <span className="badge" style={getBadge(e.eventType)}>{e.eventType.slice(0,3)}</span>
                    </div>
                  ))}
                  {events.length === 0 && <div style={{ padding:20, textAlign:"center", color:"#94a3b8", fontSize:12 }}>No events yet</div>}
                </div>
              </div>
            </>
          )}

          {/* ── EVENT LOG ── */}
          {activePage === "events" && (
            <div className="card-panel">
              <div className="panel-header">
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>All Events</span>
                  <span style={{ background:"#eef2ff", color:"#6366f1", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>{filtered.length}</span>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  {[
                    { label:"All",           value:"ALL",        cls:"active-all" },
                    { label:"🚨 Dangerous",  value:"DANGEROUS",  cls:"active-danger" },
                    { label:"⚠️ Suspicious", value:"SUSPICIOUS", cls:"active-suspicious" },
                    { label:"✅ Normal",     value:"NORMAL",     cls:"active-normal" },
                  ].map(f => (
                    <button key={f.value} className={`filter-btn ${filterType === f.value ? f.cls : "inactive"}`} onClick={() => setFilterType(f.value)}>{f.label}</button>
                  ))}
                  <input className="filter-date-input" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}/>
                  {(filterType !== "ALL" || filterDate) && (
                    <button onClick={() => { setFilterType("ALL"); setFilterDate(""); }}
                      style={{ padding:"8px 14px", background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'Sora',sans-serif" }}>
                      ✕ Clear
                    </button>
                  )}
                </div>
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr style={{ background:"#f8fafc" }}>
                  {["#ID","Camera","Type","Reason","People","Timestamp"].map(h => (
                    <th key={h} style={{ padding:"12px 20px", textAlign:"left", fontSize:10.5, color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:0.6, borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.slice(0, 100).map(e => (
                    <tr key={e.id} className="table-row" style={{ borderBottom:"1px solid #f8fafc" }}>
                      <td style={{ padding:"12px 20px", fontSize:12, color:"#94a3b8", fontWeight:600 }}>#{e.id}</td>
                      <td style={{ padding:"12px 20px" }}><span style={{ fontSize:12, color:"#6366f1", fontWeight:700, background:"#eef2ff", padding:"3px 10px", borderRadius:6 }}>{e.cameraId}</span></td>
                      <td style={{ padding:"12px 20px" }}><span className="badge" style={getBadge(e.eventType)}>{e.eventType}</span></td>
                      <td style={{ padding:"12px 20px", fontSize:13, color:"#374151" }}>{e.reason}</td>
                      <td style={{ padding:"12px 20px", fontSize:13, color:"#64748b", fontWeight:600 }}>{e.numPeople}</td>
                      <td style={{ padding:"12px 20px", fontSize:12, color:"#94a3b8" }}>{new Date(e.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div style={{ padding:60, textAlign:"center" }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>🔍</div>
                  <div style={{ color:"#94a3b8", fontSize:14 }}>No events match your filters</div>
                </div>
              )}
            </div>
          )}

          {/* ── CAMERAS ── */}
          {activePage === "cameras" && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20, marginBottom:24 }}>
                {["CAM_01","CAM_02","CAM_03"].map((cam, idx) => {
                  const ce = events.filter(e => e.cameraId === cam);
                  const hasDanger = ce.some(e => e.eventType === "DANGEROUS");
                  const hasSusp   = ce.some(e => e.eventType === "SUSPICIOUS");
                  const isOnline  = idx === 0;
                  const sc = hasDanger ? "#ef4444" : hasSusp ? "#f59e0b" : "#10b981";
                  return (
                    <div key={cam} className="cam-card" style={{ borderTop:`4px solid ${isOnline ? sc : "#e2e8f0"}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
                        <div style={{ width:54, height:54, background:isOnline ? "#f0fdf4" : "#f8fafc", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, border:`1px solid ${isOnline ? "#bbf7d0" : "#e2e8f0"}` }}>📷</div>
                        <div>
                          <div style={{ fontSize:16, fontWeight:800, color:"#0f172a" }}>{cam}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4 }}>
                            <div className={isOnline ? "pulse-dot" : ""} style={{ width:7, height:7, borderRadius:"50%", background:isOnline ? sc : "#94a3b8" }}/>
                            <span style={{ fontSize:11.5, color:isOnline ? sc : "#94a3b8", fontWeight:700 }}>{hasDanger ? "ALERT" : isOnline ? "Active" : "Offline"}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                        {[
                          { label:"Danger", count:ce.filter(e=>e.eventType==="DANGEROUS").length, color:"#ef4444", bg:"#fef2f2" },
                          { label:"Susp",   count:ce.filter(e=>e.eventType==="SUSPICIOUS").length, color:"#f59e0b", bg:"#fffbeb" },
                          { label:"Normal", count:ce.filter(e=>e.eventType==="NORMAL").length,     color:"#10b981", bg:"#f0fdf4" },
                        ].map(s => (
                          <div key={s.label} style={{ flex:1, background:s.bg, borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                            <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.count}</div>
                            <div style={{ fontSize:9.5, color:s.color, fontWeight:600, textTransform:"uppercase" }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize:12.5, color:"#64748b", display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                        <span>Total Events</span><span style={{ fontWeight:700, color:"#1e293b" }}>{ce.length}</span>
                      </div>
                      {hasDanger
                        ? <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#dc2626", fontWeight:600 }}>🚨 Active danger detected</div>
                        : isOnline && <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#16a34a", fontWeight:600 }}>✅ Monitoring active</div>
                      }
                    </div>
                  );
                })}
              </div>
              <div className="card-panel" style={{ padding:24 }}>
                <h3 style={{ margin:"0 0 16px", fontSize:13, fontWeight:700, color:"#1e293b" }}>📹 Camera Performance</h3>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
                  {["CAM_01","CAM_02","CAM_03"].map((cam, i) => {
                    const ce = events.filter(e => e.cameraId === cam);
                    const pct = counts.total > 0 ? Math.round((ce.length / counts.total) * 100) : 0;
                    return (
                      <div key={cam}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <span style={{ fontSize:12.5, color:"#374151", fontWeight:600 }}>{cam}</span>
                          <span style={{ fontSize:12, color:"#64748b" }}>{ce.length} events ({pct}%)</span>
                        </div>
                        <div className="progress-bar-wrap">
                          <div className="progress-bar-fill" style={{ width:`${pct}%`, background:i===0?"#6366f1":i===1?"#f59e0b":"#94a3b8" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── ALERT HISTORY — FIX: fetch ALL non-normal events from backend ── */}
          {activePage === "alerts" && (
            <div className="card-panel">
              <div className="panel-header">
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>🔔 Alert History</span>
                  <span style={{ background:"#fef2f2", color:"#dc2626", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>
                    {events.filter(e => e.eventType !== "NORMAL").length}
                  </span>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {[
                    { label:"All Alerts",    value:"ALL",        cls:"active-all" },
                    { label:"🚨 Dangerous",  value:"DANGEROUS",  cls:"active-danger" },
                    { label:"⚠️ Suspicious", value:"SUSPICIOUS", cls:"active-suspicious" },
                  ].map(f => (
                    <button key={f.value}
                      className={`filter-btn ${filterType === f.value || (f.value === "ALL" && filterType === "ALL") ? f.cls : "inactive"}`}
                      onClick={() => setFilterType(f.value)}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr style={{ background:"#f8fafc" }}>
                  {["#ID","Camera","Type","Reason","People","Timestamp"].map(h => (
                    <th key={h} style={{ padding:"12px 20px", textAlign:"left", fontSize:10.5, color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:0.6, borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {events
                    .filter(e => e.eventType !== "NORMAL")
                    .filter(e => filterType === "ALL" ? true : e.eventType === filterType)
                    .map(e => (
                      <tr key={e.id} className="table-row" style={{ borderBottom:"1px solid #f8fafc" }}>
                        <td style={{ padding:"12px 20px", fontSize:12, color:"#94a3b8", fontWeight:600 }}>#{e.id}</td>
                        <td style={{ padding:"12px 20px" }}><span style={{ fontSize:12, color:"#6366f1", fontWeight:700, background:"#eef2ff", padding:"3px 10px", borderRadius:6 }}>{e.cameraId}</span></td>
                        <td style={{ padding:"12px 20px" }}><span className="badge" style={getBadge(e.eventType)}>{e.eventType}</span></td>
                        <td style={{ padding:"12px 20px", fontSize:13, color:"#374151" }}>{e.reason}</td>
                        <td style={{ padding:"12px 20px", fontSize:13, color:"#64748b", fontWeight:600 }}>{e.numPeople}</td>
                        <td style={{ padding:"12px 20px", fontSize:12, color:"#94a3b8" }}>{new Date(e.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {events.filter(e => e.eventType !== "NORMAL").length === 0 && (
                <div style={{ padding:60, textAlign:"center" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
                  <div style={{ color:"#16a34a", fontSize:14, fontWeight:600 }}>No alerts — all clear!</div>
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activePage === "settings" && (
            <div style={{ maxWidth:680 }}>
              <div className="card-panel" style={{ padding:28, marginBottom:20 }}>
                <h3 style={{ margin:"0 0 4px", fontSize:16, fontWeight:700, color:"#1e293b" }}>⚙️ System Configuration</h3>
                <p style={{ margin:"0 0 24px", fontSize:13, color:"#94a3b8" }}>Current system settings</p>
                {[
                  { label:"Camera ID",               value:"CAM_01",                        icon:"📷", desc:"Primary camera identifier" },
                  { label:"Detection Confidence",    value:"0.3",                           icon:"🎯", desc:"Minimum confidence threshold" },
                  { label:"Max Persons Tracked",     value:"5",                             icon:"👥", desc:"Simultaneous person tracking limit" },
                  { label:"DB Save Interval",        value:"5 seconds",                     icon:"💾", desc:"Database write frequency" },
                  { label:"Alert Email",             value:"achuashwini363@gmail.com",      icon:"📧", desc:"Emergency notification recipient" },
                  { label:"Model File",              value:"pose_landmarker_full.task",     icon:"🧠", desc:"MediaPipe pose model" },
                ].map(s => (
                  <div key={s.label} className="settings-row">
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:38, height:38, background:"#f8fafc", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, border:"1px solid #e2e8f0" }}>{s.icon}</div>
                      <div>
                        <div style={{ fontSize:13.5, fontWeight:600, color:"#374151" }}>{s.label}</div>
                        <div style={{ fontSize:11.5, color:"#94a3b8", marginTop:2 }}>{s.desc}</div>
                      </div>
                    </div>
                    <span style={{ background:"#f8fafc", color:"#475569", padding:"6px 16px", borderRadius:8, fontSize:12.5, fontWeight:600, border:"1px solid #e2e8f0" }}>{s.value}</span>
                  </div>
                ))}
              </div>
              <div className="card-panel" style={{ padding:28 }}>
                <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:"#1e293b" }}>🔐 System Status</h3>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {[
                    { label:"API Connection", status:"Connected", ok:true },
                    { label:"Camera Feed",    status:"Active",    ok:true },
                    { label:"Email Service",  status:"Ready",     ok:true },
                    { label:"ML Model",       status:"Loaded",    ok:true },
                  ].map(s => (
                    <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", background:s.ok?"#f0fdf4":"#fef2f2", borderRadius:10, border:`1px solid ${s.ok?"#bbf7d0":"#fecaca"}` }}>
                      <span style={{ fontSize:12.5, color:"#374151", fontWeight:500 }}>{s.label}</span>
                      <span style={{ fontSize:12, color:s.ok?"#16a34a":"#dc2626", fontWeight:700 }}>● {s.status}</span>
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