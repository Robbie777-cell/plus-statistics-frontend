import { useState, useEffect, useRef } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid } from "recharts";

const API = "https://web-production-78f26.up.railway.app";

const COLORS = {
  cyan: "#00f5ff",
  lime: "#b9ff57",
  magenta: "#ff2d78",
  purple: "#7c3aed",
  bg: "#020408",
  card: "#0a0f1a",
  cardBorder: "#0d2137",
  text: "#e0f0ff",
  muted: "#3a5070",
};

const glowStyle = (color) => ({
  textShadow: `0 0 20px ${color}, 0 0 40px ${color}60`,
  color,
});

const cardStyle = {
  background: `linear-gradient(135deg, ${COLORS.card} 0%, #060d1a 100%)`,
  border: `1px solid ${COLORS.cardBorder}`,
  borderRadius: 16,
  padding: 24,
  position: "relative",
  overflow: "hidden",
};

const scanlineStyle = {
  position: "absolute",
  top: 0, left: 0, right: 0, bottom: 0,
  background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,245,255,0.015) 2px, rgba(0,245,255,0.015) 4px)",
  pointerEvents: "none",
};

function GlowOrb({ color, size = 300, top, left, right, bottom, opacity = 0.12 }) {
  return (
    <div style={{
      position: "absolute", width: size, height: size, borderRadius: "50%",
      background: color, filter: `blur(${size * 0.4}px)`,
      top, left, right, bottom, opacity, pointerEvents: "none", zIndex: 0,
    }} />
  );
}

function MetricCard({ label, value, unit, color, sublabel, icon }) {
  return (
    <div style={{ ...cardStyle, flex: 1, minWidth: 140 }}>
      <div style={scanlineStyle} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: COLORS.muted, textTransform: "uppercase", marginBottom: 8 }}>
          {icon} {label}
        </div>
        <div style={{ fontSize: 38, fontWeight: 900, fontFamily: "'Orbitron', monospace", ...glowStyle(color), lineHeight: 1 }}>
          {value}
          <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 4, opacity: 0.7 }}>{unit}</span>
        </div>
        {sublabel && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>{sublabel}</div>}
        <div style={{ position: "absolute", bottom: -8, right: -8, width: 60, height: 60, borderRadius: "50%", background: color, opacity: 0.06, filter: "blur(20px)" }} />
      </div>
    </div>
  );
}

function RiskGauge({ probability, level }) {
  const color = level === "LOW" ? COLORS.lime : level === "MEDIUM" ? "#ffaa00" : COLORS.magenta;
  const pct = Math.round(probability * 100);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={140} height={140} style={{ filter: `drop-shadow(0 0 12px ${color}80)` }}>
        <circle cx={70} cy={70} r={54} fill="none" stroke={COLORS.cardBorder} strokeWidth={8} />
        <circle cx={70} cy={70} r={54} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
        <text x={70} y={65} textAnchor="middle" fill={color} fontSize={28} fontWeight={900} fontFamily="Orbitron, monospace">{pct}%</text>
        <text x={70} y={84} textAnchor="middle" fill={COLORS.muted} fontSize={10} letterSpacing={2}>{level}</text>
      </svg>
      <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 2, textTransform: "uppercase" }}>Injury Risk</div>
    </div>
  );
}

function StatBar({ label, value, max = 100, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 2, textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 12, color, fontFamily: "Orbitron, monospace" }}>{value}</span>
      </div>
      <div style={{ height: 4, background: COLORS.cardBorder, borderRadius: 2 }}>
        <div style={{
          height: "100%", width: `${Math.min((value / max) * 100, 100)}%`,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          borderRadius: 2, boxShadow: `0 0 8px ${color}`,
          transition: "width 1s ease",
        }} />
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cyan}30`, borderRadius: 8, padding: "8px 12px" }}>
      <div style={{ color: COLORS.muted, fontSize: 10, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: 12, fontFamily: "Orbitron, monospace" }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
};

// ─── SESSION DETAIL MODAL ────────────────────────────────────────────────────
function SessionModal({ session, index, onClose }) {
  if (!session) return null;

  const statusColor = session.kli_status === "OK" ? COLORS.lime : COLORS.magenta;
  const statusLabel = session.kli_status === "OK" ? "ÓPTIMO" : "REVISAR";

  const formatDuration = (secs) => {
    if (!secs) return "—";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  };

  const formatDistance = (meters) => {
    if (!meters) return "—";
    return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters} m`;
  };

  const formatPace = (metersPerSec) => {
    if (!metersPerSec || metersPerSec === 0) return "—";
    const minPerKm = 1000 / (metersPerSec * 60);
    const min = Math.floor(minPerKm);
    const sec = Math.round((minPerKm - min) * 60);
    return `${min}:${sec.toString().padStart(2, "0")} min/km`;
  };

  const metrics = [
    { label: "Distancia", value: formatDistance(session.distance), color: COLORS.cyan, icon: "📍" },
    { label: "Duración", value: formatDuration(session.duration), color: COLORS.lime, icon: "⏱" },
    { label: "Pace", value: formatPace(session.speed), color: "#ffaa00", icon: "⚡" },
    { label: "Cadencia", value: session.cadence ? `${session.cadence.toFixed(0)} spm` : "—", color: COLORS.cyan, icon: "🦶" },
    { label: "KLI", value: session.kli ? session.kli.toFixed(2) : "—", color: statusColor, icon: "🦵" },
    { label: "Velocidad", value: session.speed ? `${session.speed.toFixed(2)} m/s` : "—", color: COLORS.magenta, icon: "🏃" },
    { label: "Pasos totales", value: session.total_steps ? session.total_steps.toLocaleString() : "—", color: COLORS.lime, icon: "👟" },
    { label: "Carga acum.", value: session.cumulative_load ? session.cumulative_load.toFixed(1) : "—", color: "#ffaa00", icon: "📊" },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(2,4,8,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          ...cardStyle,
          width: "100%", maxWidth: 600,
          border: `1px solid ${COLORS.cyan}40`,
          boxShadow: `0 0 60px ${COLORS.cyan}15, 0 0 120px ${COLORS.purple}10`,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={scanlineStyle} />
        <div style={{ position: "relative", zIndex: 1 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 4, color: COLORS.muted, marginBottom: 6, textTransform: "uppercase" }}>
                Sesión #{index + 1}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "Orbitron, monospace", ...glowStyle(COLORS.cyan) }}>
                {session.activity_name || session.device || "Sesión de Running"}
              </div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>
                {session.activity_type && `${session.activity_type} · `}
                {session.date?.slice(0, 10)}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                padding: "4px 12px",
                background: `${statusColor}15`,
                border: `1px solid ${statusColor}40`,
                borderRadius: 6,
                color: statusColor,
                fontSize: 10,
                fontFamily: "Orbitron, monospace",
                letterSpacing: 2,
              }}>
                {statusLabel}
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: `${COLORS.magenta}15`,
                  border: `1px solid ${COLORS.magenta}40`,
                  color: COLORS.magenta,
                  fontSize: 16, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "monospace",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${COLORS.cyan}40, transparent)`, marginBottom: 24 }} />

          {/* Metrics Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            {metrics.map(({ label, value, color, icon }) => (
              <div key={label} style={{
                padding: "14px 16px",
                background: "#060d1a",
                borderRadius: 10,
                border: `1px solid ${COLORS.cardBorder}`,
              }}>
                <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                  {icon} {label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "Orbitron, monospace", color, lineHeight: 1 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Source info */}
          <div style={{
            padding: "12px 16px",
            background: `#fc4c0210`,
            border: `1px solid #fc4c0230`,
            borderRadius: 10,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>🏅</span>
            <div>
              <div style={{ fontSize: 11, color: "#fc4c02", fontFamily: "Orbitron, monospace", letterSpacing: 2 }}>
                {session.strava_activity_id ? "IMPORTADO DE STRAVA" : "SENSOR FÍSICO"}
              </div>
              {session.strava_activity_id && (
                <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>
                  Activity ID: {session.strava_activity_id}
                </div>
              )}
            </div>
            {session.strava_activity_id && (
              <a
                href={`https://www.strava.com/activities/${session.strava_activity_id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginLeft: "auto",
                  padding: "6px 14px",
                  background: "#fc4c0220",
                  border: "1px solid #fc4c0260",
                  borderRadius: 6,
                  color: "#fc4c02",
                  fontSize: 10,
                  fontFamily: "Orbitron, monospace",
                  letterSpacing: 2,
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                VER EN STRAVA →
              </a>
            )}
          </div>

          {/* Biomechanics note if no sensor data */}
          {(!session.cadence || session.cadence === 0) && (
            <div style={{
              marginTop: 12,
              padding: "12px 16px",
              background: `${COLORS.purple}10`,
              border: `1px solid ${COLORS.purple}30`,
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 10, color: COLORS.purple, fontFamily: "Orbitron, monospace", letterSpacing: 2, marginBottom: 4 }}>
                ⚡ DATOS BIOMECÁNICOS PENDIENTES
              </div>
              <div style={{ fontSize: 11, color: COLORS.muted }}>
                Cadencia y KLI estarán disponibles al conectar el sensor físico +Statistics.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mlData, setMlData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [scanY, setScanY] = useState(0);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => setScanY(y => (y + 1) % 100), 30);
    return () => clearInterval(interval);
  }, []);

  const login = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.access_token) {
        setToken(data.access_token);
        setIsLoggedIn(true);
        loadData(data.access_token);
      } else {
        setError("Credenciales incorrectas");
      }
    } catch {
      setError("Error conectando al servidor");
    }
    setLoading(false);
  };

  const loadData = async (tk) => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" };

      const [sessRes, statsRes, mlRes] = await Promise.all([
        fetch(`${API}/sessions/history?limit=30`, { headers }),
        fetch(`${API}/sessions/stats`, { headers }),
        fetch(`${API}/sessions/ml/analyze`, {
          method: "POST", headers,
          body: JSON.stringify({ session_data: { kli: 3.5, cadence: 172, asymmetry: 4.2, speed: 3.8, fatigue_slope: 0.02, cumulative_load: 1200 } }),
        }),
      ]);

      const sessData = await sessRes.json();
      const statsData = await statsRes.json();
      const mlData = await mlRes.json();

      setSessions(sessData.sessions || []);
      setStats(statsData);
      setMlData(mlData);
    } catch (e) {
      setError("Error cargando datos");
    }
    setLoading(false);
  };

  const chartData = sessions.slice(0, 20).reverse().map((s, i) => ({
    name: `S${i + 1}`,
    cadencia: s.cadence || 0,
    velocidad: s.speed || 0,
    kli: s.kli || 0,
    carga: s.cumulative_load || 0,
  }));

  const radarData = stats ? [
    { metric: "Cadencia", value: Math.min((stats.avg_cadence / 200) * 100, 100) },
    { metric: "Economía", value: Math.min(((stats.avg_rei || 5) / 10) * 100, 100) },
    { metric: "Velocidad", value: 72 },
    { metric: "Simetría", value: 85 },
    { metric: "Resistencia", value: Math.min((stats.total_sessions / 50) * 100, 100) },
  ] : [];

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", position: "relative", overflow: "hidden" }}>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap" rel="stylesheet" />
        <GlowOrb color={COLORS.cyan} top={-100} left={-100} opacity={0.15} />
        <GlowOrb color={COLORS.magenta} bottom={-100} right={-100} opacity={0.1} />
        <div style={{ ...cardStyle, width: 380, zIndex: 1 }}>
          <div style={scanlineStyle} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 11, letterSpacing: 6, color: COLORS.muted, textTransform: "uppercase", marginBottom: 8 }}>Running Analytics</div>
              <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "Orbitron, monospace", ...glowStyle(COLORS.cyan) }}>+Statistics</div>
              <div style={{ width: 60, height: 2, background: `linear-gradient(90deg, transparent, ${COLORS.lime}, transparent)`, margin: "12px auto 0" }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: COLORS.muted, marginBottom: 6, textTransform: "uppercase" }}>Email</div>
              <input value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: "100%", background: "#060d1a", border: `1px solid ${COLORS.cardBorder}`, borderRadius: 8, padding: "10px 14px", color: COLORS.text, fontFamily: "Share Tech Mono, monospace", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                placeholder="usuario@email.com" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: COLORS.muted, marginBottom: 6, textTransform: "uppercase" }}>Password</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && login()}
                style={{ width: "100%", background: "#060d1a", border: `1px solid ${COLORS.cardBorder}`, borderRadius: 8, padding: "10px 14px", color: COLORS.text, fontFamily: "Share Tech Mono, monospace", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                placeholder="••••••••" />
            </div>
            {error && <div style={{ color: COLORS.magenta, fontSize: 12, marginBottom: 16, textAlign: "center" }}>{error}</div>}
            <button onClick={login} disabled={loading}
              style={{ width: "100%", padding: "12px", background: `linear-gradient(135deg, ${COLORS.cyan}20, ${COLORS.cyan}10)`, border: `1px solid ${COLORS.cyan}`, borderRadius: 8, color: COLORS.cyan, fontFamily: "Orbitron, monospace", fontSize: 13, fontWeight: 700, letterSpacing: 3, cursor: "pointer", textTransform: "uppercase", boxShadow: `0 0 20px ${COLORS.cyan}20` }}>
              {loading ? "CONECTANDO..." : "ACCEDER"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "system-ui", position: "relative", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      <GlowOrb color={COLORS.cyan} top={-150} left={-100} size={500} opacity={0.07} />
      <GlowOrb color={COLORS.purple} top={300} right={-200} size={600} opacity={0.06} />
      <GlowOrb color={COLORS.magenta} bottom={-100} left={200} size={400} opacity={0.05} />

      {/* Modal */}
      {selectedSession && (
        <SessionModal
          session={selectedSession}
          index={selectedIndex}
          onClose={() => { setSelectedSession(null); setSelectedIndex(null); }}
        />
      )}

      {/* Scan line */}
      <div style={{ position: "fixed", top: `${scanY}%`, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${COLORS.cyan}30, transparent)`, pointerEvents: "none", zIndex: 999 }} />

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${COLORS.cardBorder}`, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, position: "sticky", top: 0, background: `${COLORS.bg}ee`, backdropFilter: "blur(20px)", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.lime, boxShadow: `0 0 10px ${COLORS.lime}` }} />
          <span style={{ fontSize: 18, fontWeight: 900, fontFamily: "Orbitron, monospace", ...glowStyle(COLORS.cyan) }}>+Statistics</span>
          <span style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 3 }}>RUNNING ANALYTICS</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["dashboard", "historial", "strava"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: "6px 16px", background: activeTab === tab ? `${COLORS.cyan}15` : "transparent", border: `1px solid ${activeTab === tab ? COLORS.cyan : "transparent"}`, borderRadius: 6, color: activeTab === tab ? COLORS.cyan : COLORS.muted, fontFamily: "Orbitron, monospace", fontSize: 10, letterSpacing: 2, cursor: "pointer", textTransform: "uppercase" }}>
              {tab}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: COLORS.muted, fontFamily: "Share Tech Mono, monospace" }}>
          {new Date().toLocaleString("es", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).toUpperCase()}
        </div>
      </div>

      <div style={{ padding: "32px", maxWidth: 1400, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <>
            {mlData && (
              <div style={{ ...cardStyle, marginBottom: 24, borderColor: mlData.top_alert === "LOW" ? `${COLORS.lime}40` : `${COLORS.magenta}40`, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={scanlineStyle} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: mlData.top_alert === "LOW" ? COLORS.lime : COLORS.magenta, boxShadow: `0 0 15px ${mlData.top_alert === "LOW" ? COLORS.lime : COLORS.magenta}`, flexShrink: 0 }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <span style={{ fontSize: 10, letterSpacing: 3, color: COLORS.muted }}>SISTEMA ML · ANÁLISIS EN TIEMPO REAL · </span>
                  <span style={{ fontSize: 12, color: mlData.top_alert === "LOW" ? COLORS.lime : COLORS.magenta, fontFamily: "Orbitron, monospace" }}>
                    {mlData.pace_recommendation?.reason} · Recovery {mlData.recovery?.recovery_score}%
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <MetricCard label="Sesiones" value={stats?.total_sessions || 0} unit="total" color={COLORS.cyan} icon="⚡" sublabel="Historial completo" />
              <MetricCard label="Cadencia avg" value={stats?.avg_cadence?.toFixed(0) || "—"} unit="spm" color={COLORS.lime} icon="🦶" sublabel="Pasos por minuto" />
              <MetricCard label="Pasos totales" value={stats?.total_steps ? (stats.total_steps / 1000).toFixed(0) + "k" : "—"} unit="" color={COLORS.magenta} icon="👟" sublabel="Acumulado" />
              <MetricCard label="KLI promedio" value={stats?.avg_kli?.toFixed(1) || "—"} unit="" color="#ffaa00" icon="🦵" sublabel="Carga rodilla" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 340px", gap: 20, marginBottom: 20 }}>
              <div style={cardStyle}>
                <div style={scanlineStyle} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 10, letterSpacing: 3, color: COLORS.muted, marginBottom: 16, textTransform: "uppercase" }}>⚡ Cadencia por sesión</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.cardBorder} />
                      <XAxis dataKey="name" tick={{ fill: COLORS.muted, fontSize: 9 }} axisLine={false} />
                      <YAxis tick={{ fill: COLORS.muted, fontSize: 9 }} axisLine={false} domain={["auto", "auto"]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="cadencia" stroke={COLORS.cyan} strokeWidth={2} fill="url(#cyanGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={cardStyle}>
                <div style={scanlineStyle} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 10, letterSpacing: 3, color: COLORS.muted, marginBottom: 16, textTransform: "uppercase" }}>🦵 Carga de rodilla (KLI)</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.cardBorder} />
                      <XAxis dataKey="name" tick={{ fill: COLORS.muted, fontSize: 9 }} axisLine={false} />
                      <YAxis tick={{ fill: COLORS.muted, fontSize: 9 }} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="kli" stroke="#ffaa00" strokeWidth={2} dot={{ fill: "#ffaa00", r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {mlData && (
                <div style={cardStyle}>
                  <div style={scanlineStyle} />
                  <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
                    <RiskGauge probability={mlData.injury_risk?.probability || 0} level={mlData.injury_risk?.level || "LOW"} />
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: 3, color: COLORS.muted, marginBottom: 12, textTransform: "uppercase" }}>Performance</div>
                      <StatBar label="Recovery" value={mlData.recovery?.recovery_score || 0} max={100} color={COLORS.lime} />
                      <StatBar label="Confianza ML" value={Math.round((mlData.injury_risk?.confidence || 0) * 100)} max={100} color={COLORS.cyan} />
                      <StatBar label="Carga Semanal" value={mlData.recovery?.weekly_load?.toFixed(0) || 0} max={50} color="#ffaa00" />
                    </div>
                    <div style={{ padding: "10px 14px", background: `${COLORS.lime}10`, border: `1px solid ${COLORS.lime}30`, borderRadius: 8 }}>
                      <div style={{ fontSize: 10, color: COLORS.lime, fontFamily: "Orbitron, monospace", marginBottom: 4 }}>PACE HOY</div>
                      <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "Orbitron, monospace", color: COLORS.lime }}>
                        {mlData.pace_recommendation?.pace_min_km?.toFixed(2)}
                        <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.7 }}>min/km</span>
                      </div>
                      <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{mlData.pace_recommendation?.intensity}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={cardStyle}>
                <div style={scanlineStyle} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 10, letterSpacing: 3, color: COLORS.muted, marginBottom: 8, textTransform: "uppercase" }}>🦶 Radar de rendimiento</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke={COLORS.cardBorder} />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: COLORS.muted, fontSize: 10 }} />
                      <Radar dataKey="value" stroke={COLORS.cyan} fill={COLORS.cyan} fillOpacity={0.15} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={cardStyle}>
                <div style={scanlineStyle} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 10, letterSpacing: 3, color: COLORS.muted, marginBottom: 16, textTransform: "uppercase" }}>👟 Carga acumulada</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="magGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.magenta} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS.magenta} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.cardBorder} />
                      <XAxis dataKey="name" tick={{ fill: COLORS.muted, fontSize: 9 }} axisLine={false} />
                      <YAxis tick={{ fill: COLORS.muted, fontSize: 9 }} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="carga" stroke={COLORS.magenta} strokeWidth={2} fill="url(#magGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Historial Tab */}
        {activeTab === "historial" && (
          <div style={cardStyle}>
            <div style={scanlineStyle} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: COLORS.muted, marginBottom: 4, textTransform: "uppercase" }}>⚡ Historial de sesiones</div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 20 }}>Haz clic en una sesión para ver los detalles completos</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sessions.map((s, i) => (
                  <div
                    key={s.id}
                    onClick={() => { setSelectedSession(s); setSelectedIndex(i); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "12px 16px",
                      background: "#060d1a",
                      borderRadius: 8,
                      border: `1px solid ${COLORS.cardBorder}`,
                      cursor: "pointer",
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = `${COLORS.cyan}60`;
                      e.currentTarget.style.background = `${COLORS.cyan}08`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = COLORS.cardBorder;
                      e.currentTarget.style.background = "#060d1a";
                    }}
                  >
                    <div style={{ fontSize: 10, color: COLORS.muted, fontFamily: "Orbitron, monospace", width: 24 }}>#{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: COLORS.text }}>{s.activity_name || s.device || "Sesión"}</div>
                      <div style={{ fontSize: 10, color: COLORS.muted }}>{s.date?.slice(0, 10)}</div>
                    </div>
                    {s.distance && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, color: COLORS.lime, fontFamily: "Orbitron, monospace" }}>
                          {s.distance >= 1000 ? `${(s.distance / 1000).toFixed(2)} km` : `${s.distance} m`}
                        </div>
                        <div style={{ fontSize: 10, color: COLORS.muted }}>distancia</div>
                      </div>
                    )}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: COLORS.cyan, fontFamily: "Orbitron, monospace" }}>{s.cadence?.toFixed(0) || "—"} spm</div>
                      <div style={{ fontSize: 10, color: COLORS.muted }}>cadencia</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: s.kli_status === "OK" ? COLORS.lime : COLORS.magenta, fontFamily: "Orbitron, monospace" }}>{s.kli?.toFixed(1) || "—"}</div>
                      <div style={{ fontSize: 10, color: COLORS.muted }}>KLI</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.kli_status === "OK" ? COLORS.lime : COLORS.magenta, boxShadow: `0 0 8px ${s.kli_status === "OK" ? COLORS.lime : COLORS.magenta}` }} />
                    <div style={{ fontSize: 14, color: COLORS.muted }}>›</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Strava Tab */}
        {activeTab === "strava" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={cardStyle}>
              <div style={scanlineStyle} />
              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "#fc4c0220", border: "1px solid #fc4c0240", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏅</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Orbitron, monospace", color: COLORS.text }}>Strava Conectado</div>
                  <div style={{ fontSize: 11, color: COLORS.muted }}>{sessions.length} actividades importadas</div>
                </div>
                <div style={{ marginLeft: "auto", padding: "6px 16px", background: `${COLORS.lime}15`, border: `1px solid ${COLORS.lime}40`, borderRadius: 6, color: COLORS.lime, fontSize: 10, fontFamily: "Orbitron, monospace", letterSpacing: 2 }}>ACTIVO</div>
              </div>
            </div>
            {mlData && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                <div style={cardStyle}>
                  <div style={scanlineStyle} />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ fontSize: 10, letterSpacing: 3, color: COLORS.muted, marginBottom: 12 }}>RIESGO DE LESIÓN</div>
                    <div style={{ fontSize: 28, fontFamily: "Orbitron, monospace", ...glowStyle(mlData.injury_risk?.level === "LOW" ? COLORS.lime : COLORS.magenta) }}>{mlData.injury_risk?.level}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 8 }}>{mlData.injury_risk?.recommendation}</div>
                  </div>
                </div>
                <div style={cardStyle}>
                  <div style={scanlineStyle} />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ fontSize: 10, letterSpacing: 3, color: COLORS.muted, marginBottom: 12 }}>PACE RECOMENDADO</div>
                    <div style={{ fontSize: 28, fontFamily: "Orbitron, monospace", ...glowStyle(COLORS.cyan) }}>{mlData.pace_recommendation?.pace_min_km?.toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 8 }}>min/km · {mlData.pace_recommendation?.intensity}</div>
                  </div>
                </div>
                <div style={cardStyle}>
                  <div style={scanlineStyle} />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ fontSize: 10, letterSpacing: 3, color: COLORS.muted, marginBottom: 12 }}>RECUPERACIÓN</div>
                    <div style={{ fontSize: 28, fontFamily: "Orbitron, monospace", ...glowStyle(COLORS.lime) }}>{mlData.recovery?.recovery_score}%</div>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 8 }}>{mlData.recovery?.suggestion}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
