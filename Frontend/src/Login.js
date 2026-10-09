import { useState } from "react";
import { useNavigate } from "react-router-dom";

const USERS = {
  admin: { password: "admin123", role: "admin" },
  user: { password: "user123", role: "user" },
};

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!username || !password) { setError("Please enter both username and password."); return; }
    setLoading(true);
    setError("");
    setTimeout(() => {
      const found = USERS[username];
      if (found && found.password === password) {
        localStorage.setItem("role", found.role);
        localStorage.setItem("username", username);
        navigate(found.role === "admin" ? "/admin" : "/user");
      } else {
        setError("Invalid credentials. Please try again.");
        setLoading(false);
      }
    }, 900);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#ffffff", fontFamily: "'Sora', 'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        * { font-family: 'Sora', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }

        .login-left {
          flex: 1;
          background: linear-gradient(160deg, #0a1628 0%, #0d2137 40%, #0a3d2e 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 56px;
          position: relative;
          overflow: hidden;
        }
        .login-left::before {
          content: '';
          position: absolute;
          top: -120px; right: -120px;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%);
        }
        .login-left::after {
          content: '';
          position: absolute;
          bottom: -100px; left: -100px;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%);
        }
        .grid-bg {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .badge-icon {
          width: 80px; height: 80px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 22px;
          display: flex; align-items: center; justify-content: center;
          font-size: 36px;
          margin: 0 auto 28px;
          box-shadow: 0 20px 60px rgba(16,185,129,0.35), 0 0 0 1px rgba(255,255,255,0.1);
          position: relative;
          z-index: 1;
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 10px;
          backdrop-filter: blur(8px);
          transition: all 0.2s;
          position: relative;
          z-index: 1;
        }
        .feature-item:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(16,185,129,0.3);
          transform: translateX(4px);
        }

        /* RIGHT PANEL — flex:1 makes it same width as left */
        .login-right {
          flex: 1;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 56px;
          box-shadow: -8px 0 40px rgba(0,0,0,0.08);
        }

        .l-input {
          width: 100%;
          padding: 13px 14px 13px 44px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          color: #1e293b;
          font-size: 14px;
          font-family: 'Sora', sans-serif;
          outline: none;
          transition: all 0.2s;
        }
        .l-input:focus {
          border-color: #10b981;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(16,185,129,0.08);
        }
        .l-input::placeholder { color: #94a3b8; }

        .l-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Sora', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.2px;
          box-shadow: 0 4px 20px rgba(16,185,129,0.3);
        }
        .l-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 8px 30px rgba(16,185,129,0.4);
          transform: translateY(-1px);
        }
        .l-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

        .status-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #10b981;
          display: inline-block;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(16,185,129,0.4)}
          50%{opacity:0.8;box-shadow:0 0 0 6px rgba(16,185,129,0)}
        }
        .eye-btn {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          color: #94a3b8;
          padding: 0;
          line-height: 1;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── LEFT PANEL ── */}
      <div className="login-left">
        <div className="grid-bg" />
        <div style={{ position: "relative", textAlign: "center", maxWidth: 420, zIndex: 1 }}>
          <div className="badge-icon">🛡️</div>
          <h1 style={{ color: "#fff", fontSize: 30, fontWeight: 800, marginBottom: 10, letterSpacing: -0.8, lineHeight: 1.2 }}>
            CCTV Guard<br />
            <span style={{ color: "#10b981" }}>Surveillance System</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginBottom: 40, lineHeight: 1.8, fontWeight: 400 }}>
            AI-powered real-time anomaly detection for intelligent security monitoring
          </p>

          {[
            { icon: "👁️", label: "Real-time pose detection", sub: "Powered by MediaPipe AI" },
            { icon: "⚡", label: "Instant threat classification", sub: "Normal · Suspicious · Dangerous" },
            { icon: "📧", label: "Automated email alerts", sub: "Instant emergency notifications" },
            { icon: "📊", label: "Live analytics dashboard", sub: "Charts, graphs & event logs" },
          ].map(f => (
            <div key={f.label} className="feature-item">
              <span style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 }}>{f.sub}</div>
              </div>
            </div>
          ))}

          
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="login-right">
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛡️</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#10b981", letterSpacing: 1, textTransform: "uppercase" }}>CCTV Guard</span>
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginBottom: 8, letterSpacing: -0.5 }}>Sign in to your account</h2>
            <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.6 }}>Access your surveillance dashboard and security monitoring tools</p>
          </div>

          {/* Username */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Username</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>👤</span>
              <input
                className="l-input"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                placeholder="Enter your username"
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 36 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Password</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔒</span>
              <input
                className="l-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter your password"
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
              <button className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#dc2626", fontSize: 13, display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
              <span style={{ fontSize: 16 }}>⚠️</span> {error}
            </div>
          )}

          {/* Submit */}
          <button className="l-btn" onClick={handleLogin} disabled={loading}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                Authenticating...
              </span>
            ) : "Sign In →"}
          </button>

        </div>
      </div>
    </div>
  );
}