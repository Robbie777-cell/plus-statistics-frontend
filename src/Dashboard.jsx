import { useState, useEffect } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid
} from "recharts";

const API = "https://web-production-78f26.up.railway.app";

const C = {
  lime: "#ccff00",
  limeD: "#99cc00",
  limeGlow: "rgba(204,255,0,0.15)",
  black: "#0a0a0a",
  card: "#111111",
  cardB: "#1a1a1a",
  border: "#222222",
  text: "#ffffff",
  muted: "#666666",
  muted2: "#444444",
};

const mono = { fontFamily: "'JetBrains Mono', 'Courier New', monospace" };

const fmt = {
  duration: (s) => {
    if (!s) return "—";
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  },
  distance: (km) => {
    if (!km || km === 0) return "—";
    return `${(+km).toFixed(2)} km`;
  },
  pace: (ms) => {
    if (!ms || ms === 0) return "—";
    const mpk = 1000 / (ms * 60);
    const min = Math.floor(mpk), sec = Math.round((mpk - min) * 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  },
};

function Tag({ children, color = C.lime }) {
  return (
    <span style={{
      ...mono, fontSize: 9, letterSpacing: 3, textTransform: "uppercase",
      color, border: `1px solid ${color}40`, borderRadius: 4,
      padding: "2px 8px", display: "inline-block",
    }}>{children}</span>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.border }} />;
}

function StatPill({ label, value, unit }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", flex: 1 }}>
      <div style={{ ...mono, fontSize: 22, fontWeight: 700, color: C.lime }}>
        {value}<span style={{ fontSize: 11, color: C.muted, marginLeft: 4 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function RingGauge({ pct, label, color = C.lime }) {
  const r = 40, circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={100} height={100}>
        <circle cx={50} cy={50} r={r} fill="none" stroke={C.border} strokeWidth={6} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 1s ease" }} />
        <text x={50} y={54} textAnchor="middle" fill={color} fontSize={18} fontWeight={700} fontFamily="JetBrains Mono, monospace">{pct}%</text>
      </svg>
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function MiniBar({ label, value, max = 100 }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
        <span style={{ ...mono, fontSize: 11, color: C.lime }}>{value}</span>
      </div>
      <div style={{ height: 3, background: C.border, borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${Math.min((+value / max) * 100, 100)}%`, background: C.lime, borderRadius: 2, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0a0a0a", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
      <div style={{ color: C.muted, fontSize: 10, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ ...mono, color: p.color, fontSize: 11 }}>{p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}</div>
      ))}
    </div>
  );
};

function SessionModal({ session, index, onClose }) {
  if (!session) return null;
  const ok = session.kli_status === "OK";
  const sc = ok ? C.lime : "#ff4444";

  const fields = [
    { label: "Distancia", value: fmt.distance(session.distance_km) },
    { label: "Duración", value: fmt.duration(session.duration) },
    { label: "Pace", value: fmt.pace(session.speed) !== "—" ? `${fmt.pace(session.speed)} min/km` : "—" },
    { label: "Cadencia", value: session.cadence ? `${session.cadence.toFixed(0)} spm` : "—" },
    { label: "Velocidad", value: session.speed ? `${session.speed.toFixed(2)} m/s` : "—" },
    { label: "Frec. Cardíaca", value: session.heart_rate ? `${session.heart_rate.toFixed(0)} bpm` : "—" },
    { label: "KLI", value: session.kli ? session.kli.toFixed(2) : "—" },
    { label: "Carga acum.", value: session.cumulative_load ? `${session.cumulative_load.toFixed(1)} km` : "—" },
  ];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ padding: "24px 24px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Tag>Sesión #{index + 1}</Tag>
                <Tag color={sc}>{ok ? "Óptimo" : "Revisar"}</Tag>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>
                {session.activity_name || session.device || "Sesión de Running"}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                {session.activity_type && `${session.activity_type} · `}{session.date?.slice(0, 10)}
              </div>
            </div>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: C.cardB, border: `1px solid ${C.border}`, color: C.muted, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        </div>

        <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {fields.map(({ label, value }) => (
            <div key={label} style={{ background: C.black, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
              <div style={{ ...mono, fontSize: 18, fontWeight: 700, color: C.lime }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ margin: "0 24px 24px", padding: "14px 16px", background: "#0f0800", border: "1px solid #fc4c0230", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🏅</span>
          <div style={{ flex: 1 }}>
            <div style={{ ...mono, fontSize: 10, color: "#fc4c02", letterSpacing: 2 }}>
              {session.strava_activity_id ? "IMPORTADO DE STRAVA" : "SENSOR FÍSICO"}
            </div>
            {session.strava_activity_id && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>ID: {session.strava_activity_id}</div>}
          </div>
          {session.strava_activity_id && (
            <a href={`https://www.strava.com/activities/${session.strava_activity_id}`} target="_blank" rel="noopener noreferrer"
              style={{ ...mono, padding: "6px 14px", background: "#fc4c0215", border: "1px solid #fc4c0240", borderRadius: 8, color: "#fc4c02", fontSize: 10, textDecoration: "none" }}>
              Ver en Strava →
            </a>
          )}
        </div>

        {(!session.cadence || session.cadence === 0) && (
          <div style={{ margin: "0 24px 24px", padding: "12px 16px", background: `${C.limeGlow}`, border: `1px solid ${C.lime}25`, borderRadius: 12 }}>
            <div style={{ ...mono, fontSize: 10, color: C.lime, letterSpacing: 2, marginBottom: 4 }}>⚡ BIOMECÁNICA PENDIENTE</div>
            <div style={{ fontSize: 11, color: C.muted }}>Cadencia y KLI disponibles al conectar el sensor físico.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, loading, error, email, setEmail, password, setPassword }) {
  return (
    <div style={{ minHeight: "100vh", background: C.black, display: "flex", fontFamily: "system-ui" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <img src="/runner.jpeg" alt="Runner"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", filter: "contrast(1.1) brightness(0.7)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 50%, #0a0a0a 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0a0a0a 0%, transparent 40%)" }} />

        <div style={{ position: "absolute", top: 32, left: 32, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: C.lime, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ ...mono, fontSize: 20, fontWeight: 900, color: C.black }}>+</span>
          </div>
          <span style={{ ...mono, fontSize: 18, fontWeight: 700, color: C.text }}>Statistics</span>
        </div>

        <div style={{ position: "absolute", bottom: 40, left: 40, display: "flex", gap: 12 }}>
          {[["185", "SPM"], ["4:30", "MIN/KM"], ["92%", "EFIC"]].map(([v, l]) => (
            <div key={l} style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)", border: `1px solid ${C.lime}30`, borderRadius: 12, padding: "12px 18px", textAlign: "center" }}>
              <div style={{ ...mono, fontSize: 22, fontWeight: 700, color: C.lime }}>{v}</div>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: 420, background: C.black, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 48px" }}>
        <div style={{ marginBottom: 40 }}>
          <Tag>Running Analytics</Tag>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.text, marginTop: 12, marginBottom: 8, letterSpacing: -1 }}>Bienvenido</div>
          <div style={{ fontSize: 14, color: C.muted }}>Inicia sesión para ver tu análisis</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Email</div>
          <input value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", color: C.text, ...mono, fontSize: 13, outline: "none", boxSizing: "border-box" }}
            placeholder="usuario@email.com" />
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Contraseña</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onLogin()}
            style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", color: C.text, ...mono, fontSize: 13, outline: "none", boxSizing: "border-box" }}
            placeholder="••••••••" />
        </div>

        {error && <div style={{ color: "#ff4444", fontSize: 12, marginBottom: 16, textAlign: "center" }}>{error}</div>}

        <button onClick={onLogin} disabled={loading} style={{
          width: "100%", padding: "14px", background: loading ? C.muted2 : C.lime,
          border: "none", borderRadius: 12, color: C.black, ...mono,
          fontSize: 13, fontWeight: 700, letterSpacing: 3, cursor: loading ? "default" : "pointer",
          textTransform: "uppercase",
        }}>
          {loading ? "Conectando..." : "Acceder →"}
        </button>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.muted2 }}>Running Biomechanics Analyzer · v2.0</div>
        </div>
      </div>
    </div>
  );
}

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
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const login = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.access_token) {
        setToken(data.access_token); setIsLoggedIn(true); loadData(data.access_token);
      } else { setError("Credenciales incorrectas"); }
    } catch { setError("Error conectando al servidor"); }
    setLoading(false);
  };

  const loadData = async (tk) => {
    setLoading(true);
    try {
      const h = { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" };
      const [sR, stR] = await Promise.all([
        fetch(`${API}/sessions/history?limit=50`, { headers: h }),
        fetch(`${API}/sessions/stats`, { headers: h }),
      ]);
      const sd = await sR.json();
      const std = await stR.json();
      setSessions(sd.sessions || []);
      setStats(std);

      // Llamar ML analyze-history para obtener predicciones actualizadas
      const mlR = await fetch(`${API}/sessions/ml/analyze-history`, {
        method: "POST", headers: h,
      });
      const mld = await mlR.json();
      if (mld.latest) setMlData(mld.latest);

    } catch { setError("Error cargando datos"); }
    setLoading(false);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={login} loading={loading} error={error} email={email} setEmail={setEmail} password={password} setPassword={setPassword} />;
  }

  const chartData = sessions.slice(0, 20).reverse().map((s, i) => ({
    name: `S${i + 1}`, cadencia: s.cadence || 0,
    kli: s.kli || 0, distancia: s.distance_km ? +(+s.distance_km).toFixed(2) : 0,
  }));

  const radarData = stats ? [
    { metric: "Cadencia", value: Math.min((stats.avg_cadence / 200) * 100, 100) },
    { metric: "Economía", value: Math.min(((stats.avg_rei || 5) / 10) * 100, 100) },
    { metric: "Velocidad", value: 72 },
    { metric: "Simetría", value: 85 },
    { metric: "Resistencia", value: Math.min((stats.total_sessions / 50) * 100, 100) },
  ] : [];

  const tabs = ["dashboard", "historial", "strava"];

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.text, fontFamily: "system-ui" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {selectedSession && (
        <SessionModal session={selectedSession} index={selectedIndex}
          onClose={() => { setSelectedSession(null); setSelectedIndex(null); }} />
      )}

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky", top: 0, background: `${C.black}f0`, backdropFilter: "blur(20px)", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, background: C.lime, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ ...mono, fontSize: 18, fontWeight: 900, color: C.black }}>+</span>
          </div>
          <span style={{ ...mono, fontSize: 15, fontWeight: 700, color: C.text }}>Statistics</span>
          <div style={{ width: 1, height: 20, background: C.border, margin: "0 4px" }} />
          <span style={{ fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: "uppercase" }}>Running Analytics</span>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "6px 18px", background: activeTab === tab ? C.lime : "transparent",
              border: `1px solid ${activeTab === tab ? C.lime : "transparent"}`,
              borderRadius: 8, color: activeTab === tab ? C.black : C.muted,
              ...mono, fontSize: 10, letterSpacing: 2, cursor: "pointer", textTransform: "uppercase",
              fontWeight: activeTab === tab ? 700 : 400, transition: "all 0.2s",
            }}>{tab}</button>
          ))}
        </div>
        <div style={{ ...mono, fontSize: 11, color: C.muted }}>
          {new Date().toLocaleString("es", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).toUpperCase()}
        </div>
      </div>

      <div style={{ padding: "32px", maxWidth: 1400, margin: "0 auto" }}>

        {activeTab === "dashboard" && (
          <>
            {/* Hero */}
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, marginBottom: 20 }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", position: "relative", minHeight: 260 }}>
                <img src="/runner.jpeg" alt="Runner"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", filter: "contrast(1.05) brightness(0.8)" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #111 0%, transparent 55%)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20 }}>
                  <Tag>En forma</Tag>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginTop: 8 }}>Roberto</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{stats?.total_sessions || 0} sesiones registradas</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <StatPill label="Sesiones" value={stats?.total_sessions || 0} unit="total" />
                  <StatPill label="Cadencia avg" value={stats?.avg_cadence?.toFixed(0) || "—"} unit="spm" />
                  <StatPill label="KLI promedio" value={stats?.avg_kli?.toFixed(1) || "—"} unit="" />
                  <StatPill label="Pasos totales" value={stats?.total_steps ? `${(stats.total_steps / 1000).toFixed(0)}k` : "—"} unit="" />
                </div>

                {mlData && (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, flex: 1, display: "flex", gap: 24, alignItems: "center" }}>
                    <RingGauge pct={Math.round(mlData.injury_risk?.probability || 0)} label="Riesgo" color={mlData.injury_risk?.level === "LOW" ? C.lime : "#ff4444"} />
                    <RingGauge pct={mlData.recovery?.recovery_score || 0} label="Recovery" />
                    <div style={{ flex: 1 }}>
                      <MiniBar label="Confianza ML" value={Math.round((mlData.injury_risk?.confidence || 0) * 100)} max={100} />
                      <MiniBar label="Carga Semanal" value={mlData.recovery?.weekly_load?.toFixed(0) || 0} max={50} />
                      <div style={{ background: C.black, border: `1px solid ${C.lime}25`, borderRadius: 10, padding: "12px 16px" }}>
                        <div style={{ ...mono, fontSize: 10, color: C.lime, letterSpacing: 2, marginBottom: 4 }}>PACE HOY</div>
                        <div style={{ ...mono, fontSize: 24, fontWeight: 700, color: C.lime }}>
                          {mlData.pace_recommendation?.pace_min_km?.toFixed(2)}
                          <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>min/km · {mlData.pace_recommendation?.intensity}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Tag color={mlData.injury_risk?.level === "LOW" ? C.lime : "#ff4444"}>{mlData.injury_risk?.level || "LOW"}</Tag>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 8, maxWidth: 140 }}>{mlData.injury_risk?.recommendation}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              {[
                { title: "Cadencia por sesión", key: "cadencia" },
                { title: "Distancia por sesión (km)", key: "distancia" },
              ].map(({ title, key }, idx) => (
                <div key={key} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                  <div style={{ ...mono, fontSize: 10, color: C.muted, letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>{title}</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id={`g${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.lime} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={C.lime} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} />
                      <YAxis tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} domain={["auto", "auto"]} />
                      <Tooltip content={<ChartTip />} />
                      <Area type="monotone" dataKey={key} stroke={C.lime} strokeWidth={2} fill={`url(#g${idx})`} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ ...mono, fontSize: 10, color: C.muted, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Radar de rendimiento</div>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={C.border} />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: C.muted, fontSize: 10 }} />
                    <Radar dataKey="value" stroke={C.lime} fill={C.lime} fillOpacity={0.1} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ ...mono, fontSize: 10, color: C.muted, letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>KLI — Carga de rodilla</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} />
                    <YAxis tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Line type="monotone" dataKey="kli" stroke={C.lime} strokeWidth={2} dot={{ fill: C.lime, r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {activeTab === "historial" && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden" }}>
            <div style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ ...mono, fontSize: 10, color: C.muted, letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>Historial de sesiones</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{sessions.length} actividades</div>
              </div>
              <Tag>{sessions.length} sesiones</Tag>
            </div>
            <Divider />
            <div style={{ padding: "8px 24px 4px", display: "grid", gridTemplateColumns: "40px 1fr 110px 110px 110px 80px 32px", gap: 0, marginBottom: 4 }}>
              {["#", "Actividad", "Distancia", "Duración", "Pace", "KLI", ""].map((h, i) => (
                <div key={i} style={{ ...mono, fontSize: 9, color: C.muted2, letterSpacing: 2, textTransform: "uppercase", padding: "8px 0" }}>{h}</div>
              ))}
            </div>
            <Divider />
            {sessions.map((s, i) => (
              <div key={s.id} onClick={() => { setSelectedSession(s); setSelectedIndex(i); }}
                style={{ display: "grid", gridTemplateColumns: "40px 1fr 110px 110px 110px 80px 32px", gap: 0, padding: "14px 24px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = C.cardB}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ ...mono, fontSize: 11, color: C.muted, paddingTop: 2 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{s.activity_name || s.device || "Sesión"}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s.date?.slice(0, 10)} · {s.activity_type || "Run"}</div>
                </div>
                <div style={{ ...mono, fontSize: 13, color: C.lime, paddingTop: 2 }}>{fmt.distance(s.distance_km)}</div>
                <div style={{ ...mono, fontSize: 13, color: C.text, paddingTop: 2 }}>{fmt.duration(s.duration)}</div>
                <div style={{ ...mono, fontSize: 13, color: C.text, paddingTop: 2 }}>{fmt.pace(s.speed) !== "—" ? `${fmt.pace(s.speed)}` : "—"}</div>
                <div style={{ ...mono, fontSize: 13, color: s.kli_status === "OK" ? C.lime : "#ff4444", paddingTop: 2 }}>{s.kli?.toFixed(1) || "—"}</div>
                <div style={{ color: C.muted, fontSize: 18, paddingTop: 0 }}>›</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "strava" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "#0f0600", border: "1px solid #fc4c0230", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🏅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Strava Conectado</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{sessions.length} actividades importadas</div>
              </div>
              <Tag color={C.lime}>Activo</Tag>
            </div>
            {mlData && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {[
                  { label: "Riesgo de Lesión", value: mlData.injury_risk?.level, sub: mlData.injury_risk?.recommendation, color: mlData.injury_risk?.level === "LOW" ? C.lime : "#ff4444" },
                  { label: "Pace Recomendado", value: `${mlData.pace_recommendation?.pace_min_km?.toFixed(2)} min/km`, sub: mlData.pace_recommendation?.intensity, color: C.lime },
                  { label: "Recuperación", value: `${mlData.recovery?.recovery_score}%`, sub: mlData.recovery?.suggestion, color: C.lime },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                    <div style={{ ...mono, fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>{label}</div>
                    <div style={{ ...mono, fontSize: 26, fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>{sub}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
