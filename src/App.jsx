import { useEffect, useState, useCallback } from "react";
import React from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import logo from "./assets/logo.jpeg";

/* ===================== TRANSLATIONS ===================== */

const translations = {
  en: {
    selectLanguage: "Select Language",
    signIn: "Please sign in to continue",
    welcomeBack: "Welcome back",
    signOut: "Sign Out",
    connectGrid: "Connect to Grid",
    channelId: "Channel ID",
    readApiKey: "Read API Key",
    launchDashboard: "Launch Dashboard",
    overview: "Overview",
    realtime: "Real-time telemetry from microgrid sensors.",
    lastSynced: "Last synced",
    voltage: "Voltage",
    current: "Current",
    battery: "Battery SOC",
    temperature: "Temperature",
    power: "Power Consumption",
    systemAlert: "SYSTEM ALERT",
    systemOnline: "System Online",
    disconnect: "Disconnect",
    alerts: {
      voltage: "High Voltage",
      current: "High Current",
      battery: "Low Battery",
      temperature: "High Temperature",
    }
  },
  hi: {
    selectLanguage: "भाषा चुनें",
    signIn: "जारी रखने के लिए साइन इन करें",
    welcomeBack: "स्वागत है",
    signOut: "साइन आउट",
    connectGrid: "ग्रिड से कनेक्ट करें",
    channelId: "चैनल आईडी",
    readApiKey: "रीड एपीआई की",
    launchDashboard: "डैशबोर्ड शुरू करें",
    overview: "सारांश",
    realtime: "माइक्रोग्रिड सेंसर से रियल-टाइम डेटा।",
    lastSynced: "अंतिम अपडेट",
    voltage: "वोल्टेज",
    current: "करंट",
    battery: "बैटरी स्तर",
    temperature: "तापमान",
    power: "पावर खपत",
    systemAlert: "सिस्टम चेतावनी",
    systemOnline: "सिस्टम ऑनलाइन",
    disconnect: "डिस्कनेक्ट करें",
    alerts: {
      voltage: "उच्च वोल्टेज",
      current: "उच्च करंट",
      battery: "कम बैटरी",
      temperature: "उच्च तापमान",
    }
  }
};

/* ===================== ICONS ===================== */

const Icons = {
  Activity: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
  ),
  Battery: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="6" width="18" height="12" rx="2" ry="2"></rect><line x1="23" y1="13" x2="23" y2="11"></line></svg>
  ),
  Thermometer: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>
  ),
  LogOut: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
  ),
  Zap: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
  ),
  Alert: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
  )
};

/* ===================== THRESHOLDS ===================== */
const LIMITS = {
  voltage: 250,
  current: 15,
  temperature: 50,
  battery: 20
  // Note: Battery is a LOWER limit, others are UPPER limits
};

/* ===================== UI COMPONENTS ===================== */

// eslint-disable-next-line no-unused-vars
const StatCard = ({ title, value, unit, icon: Icon, color, subtext }) => (
  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-opacity-10 ${color.bg} ${color.text}`}>
        <Icon />
      </div>
      <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-500 tracking-wide">
        LIVE
      </span>
    </div>
    <div className="space-y-1">
      <h3 className="text-slate-500 text-sm font-semibold tracking-wide uppercase">{title}</h3>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-800 group-hover:scale-105 transition-transform duration-300">
          {value !== undefined ? value : "--"}
        </span>
        <span className="text-slate-400 font-semibold">{unit}</span>
      </div>
      {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
    </div>
  </div>
);

const ChartBox = ({ title, data, dataKey, color }) => {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all h-full min-h-[320px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${color.bg.replace('/10', '')}`}></span>
          {title}
        </h3>
      </div>

      <div className="w-full h-[240px]"> 
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color.hex} stopOpacity={0.15} />
                <stop offset="95%" stopColor={color.hex} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis 
              tick={{ fontSize: 12, fill: "#94a3b8" }} 
              axisLine={false}
              tickLine={false}
              width={35}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                borderColor: "#e2e8f0",
                color: "#1e293b",
                borderRadius: "12px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              itemStyle={{ color: color.hex, fontWeight: 600 }}
              labelStyle={{ color: "#64748b", marginBottom: "5px" }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color.hex}
              strokeWidth={3}
              fill={`url(#gradient-${dataKey})`}
              fillOpacity={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* ===================== MAIN DASHBOARD ===================== */

function MicrogridDashboard() {

  /* ---------- LANGUAGE ---------- */
  const [language, setLanguage] = useState(localStorage.getItem("language"));
  const t = language ? translations[language] : null;

  /* ---------- AUTH ---------- */
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("googleUser");
    return saved ? JSON.parse(saved) : null;
  });

  /* ---------- DATA ---------- */
  const [data, setData] = useState([]);
  const [channelId, setChannelId] = useState(localStorage.getItem("channelId") || "");
  const [apiKey, setApiKey] = useState(localStorage.getItem("apiKey") || "");
  const [isConnected, setIsConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  /* ---------- NOTIFICATIONS ---------- */
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  const notify = useCallback((title, body) => {
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: logo });
    }
  }, []);

  const checkEmergencies = useCallback((latest) => {
    if (!latest) return;
    const newAlerts = [];

    // Checked using your first block's logic (More comprehensive)
    if (latest.voltage > LIMITS.voltage) {
      newAlerts.push(`${t.alerts.voltage}: ${latest.voltage}V`);
      notify(t.alerts.voltage, `${latest.voltage}V`);
    }
    if (latest.current > LIMITS.current) {
      newAlerts.push(`${t.alerts.current}: ${latest.current}A`);
      notify(t.alerts.current, `${latest.current}A`);
    }
    if (latest.temperature > LIMITS.temperature) {
      newAlerts.push(`${t.alerts.temperature}: ${latest.temperature}°C`);
      notify(t.alerts.temperature, `${latest.temperature}°C`);
    }
    if (latest.soc < LIMITS.battery && latest.soc > 0) {
      newAlerts.push(`${t.alerts.battery}: ${latest.soc}%`);
      notify(t.alerts.battery, `${latest.soc}%`);
    }

    setAlerts(newAlerts);
  }, [t, notify]);

  /* ---------- HANDLERS ---------- */
  const handleGoogleSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      setUser(decoded);
      localStorage.setItem("googleUser", JSON.stringify(decoded));
    } catch (error) {
      console.error("Login Failed", error);
    }
  };

  const handleSignOut = () => {
    setUser(null);
    setIsConnected(false);
    localStorage.removeItem("googleUser");
    localStorage.removeItem("channelId");
    localStorage.removeItem("apiKey");
    // Do not clear language preference
  };

  const handleConnect = (e) => {
    e.preventDefault();
    if (channelId && apiKey) {
      localStorage.setItem("channelId", channelId);
      localStorage.setItem("apiKey", apiKey);
      setIsConnected(true);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setData([]);
    setAlerts([]);
  };

  /* ---------- FETCH DATA ---------- */
  const fetchData = useCallback(async () => {
    if (!channelId || !apiKey) return;
    try {
      const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${apiKey}&results=15`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.feeds) {
        const formatted = json.feeds.map(f => ({
          time: new Date(f.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          voltage: Number(f.field1) || 0,
          current: Number(f.field2) || 0,
          soc: Number(f.field3) || 0,
          loadPower: Number(f.field4) || 0,
          temperature: Number(f.field5) || 0,
        }));

        setData(formatted);
        setLastUpdate(new Date().toLocaleTimeString());
        checkEmergencies(formatted.at(-1));
      }
    } catch (err) {
      console.error("Error fetching data", err);
    }
  }, [channelId, apiKey, checkEmergencies]);

  useEffect(() => {
    if (isConnected) {
      // eslint-disable-next-line
      fetchData();
      const i = setInterval(fetchData, 10000);
      return () => clearInterval(i);
    }
  }, [isConnected, fetchData]);

  const latest = data.length > 0 ? data[data.length - 1] : {};

  /* ---------- VIEW 0: LANGUAGE SELECTION ---------- */
  if (!language) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center space-y-6">
          <h1 className="text-2xl font-bold">Select Language / भाषा चुनें</h1>
          <div className="flex gap-6 justify-center">
            <button onClick={() => { localStorage.setItem("language", "en"); setLanguage("en"); }} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">English</button>
            <button onClick={() => { localStorage.setItem("language", "hi"); setLanguage("hi"); }} className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold">हिंदी</button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- VIEW 1: LOGIN ---------- */
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100 rounded-full blur-[100px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-100 rounded-full blur-[100px] opacity-60" />

        <div className="z-10 w-full max-w-sm bg-white/80 backdrop-blur-xl border border-white/50 p-10 rounded-3xl shadow-xl text-center">
          <img src={logo} alt="SunKalp" className="w-28 h-28 object-contain mb-4 mx-auto drop-shadow-md rounded-full" />
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">Sunkalp</h1>
          <p className="text-slate-500 mb-8 font-medium">{t.signIn}</p>
          
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => console.log('Login Failed')}
              shape="pill"
              size="large"
              width="250"
            />
          </div>
        </div>
      </div>
    );
  }

  /* ---------- VIEW 2: CONFIG ---------- */
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative">
        <div className="z-10 w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-xl">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
            <img src={user.picture} alt={user.name} className="w-12 h-12 rounded-full border-2 border-blue-100" />
            <div>
              <p className="text-sm text-slate-500 font-semibold">{t.welcomeBack},</p>
              <p className="text-lg font-bold text-slate-800">{user.name}</p>
            </div>
            <button onClick={handleSignOut} className="ml-auto text-xs text-red-500 font-bold hover:underline">{t.signOut}</button>
          </div>
          
          <h2 className="text-xl font-bold text-slate-700 mb-6">{t.connectGrid}</h2>
          <form onSubmit={handleConnect} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t.channelId}</label>
              <input
                type="text"
                placeholder="e.g. 123456"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t.readApiKey}</label>
              <input
                type="password"
                placeholder="••••••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all">
              {t.launchDashboard}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ---------- VIEW 3: DASHBOARD ---------- */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100">
      
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SunKalp" className="w-10 h-10 object-contain rounded-full border border-slate-200" />
            <span className="text-lg font-bold text-slate-800 tracking-tight hidden sm:block">Sunकल्प <span className="text-slate-400 font-medium">Dashboard</span></span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* System Status Indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-bold text-green-600 uppercase tracking-wide">{t.systemOnline}</span>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            {/* --- NEW LANGUAGE TOGGLE BUTTON --- */}
            <button 
              onClick={() => {
                const newLang = language === 'en' ? 'hi' : 'en';
                setLanguage(newLang);
                localStorage.setItem("language", newLang);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200"
            >
              {language === 'en' ? 'HI' : 'EN'}
            </button>
            {/* ---------------------------------- */}

            {/* User Profile */}
            <div className="flex items-center gap-3">
              <img src={user.picture} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" />
              <div className="hidden sm:block text-right">
                 <p className="text-xs font-bold text-slate-700">{user.name}</p>
                 <button onClick={handleSignOut} className="text-[10px] text-slate-400 hover:text-red-500 transition font-semibold uppercase tracking-wider">{t.signOut}</button>
              </div>
            </div>
            
            <button 
              onClick={handleDisconnect}
              className="ml-2 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-red-600 transition-colors px-3 py-2 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100"
              title={t.disconnect}
            >
              <Icons.LogOut />
            </button>
          </div>
        </div>
      </nav>

      {/* Emergency Alert Banner */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border-b border-red-100">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center gap-3 text-red-700 animate-pulse">
              <Icons.Alert />
              <span className="font-bold">{t.systemAlert}:</span>
              <span className="font-medium">{alerts.join(" | ")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats & Charts */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{t.overview}</h2>
            <p className="text-slate-500 mt-1 font-medium">{t.realtime}</p>
          </div>
          {lastUpdate && <p className="text-xs text-slate-400 font-medium bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">{t.lastSynced}: <span className="text-slate-600 font-mono ml-1">{lastUpdate}</span></p>}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title={t.voltage} value={latest.voltage} unit="V" icon={Icons.Zap} color={{ bg: "bg-red-50", text: "text-red-500" }} />
          <StatCard title={t.current} value={latest.current} unit="A" icon={Icons.Activity} color={{ bg: "bg-blue-50", text: "text-blue-500" }} />
          <StatCard title={t.battery} value={latest.soc} unit="%" icon={Icons.Battery} color={{ bg: "bg-emerald-50", text: "text-emerald-500" }} />
          <StatCard title={t.temperature} value={latest.temperature} unit="°C" icon={Icons.Thermometer} color={{ bg: "bg-orange-50", text: "text-orange-500" }} subtext="Internal Sensor" />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartBox title={t.voltage} data={data} dataKey="voltage" color={{ hex: "#ef4444", bg: "bg-red-50" }} unit="V" />
          <ChartBox title={t.current} data={data} dataKey="current" color={{ hex: "#3b82f6", bg: "bg-blue-50" }} unit="A" />
          <ChartBox title={t.battery} data={data} dataKey="soc" color={{ hex: "#10b981", bg: "bg-emerald-50" }} unit="%" />
          <ChartBox title={t.power} data={data} dataKey="loadPower" color={{ hex: "#a855f7", bg: "bg-purple-50" }} unit="W" />
        </div>
      </main>
    </div>
  );
}

/* ===================== WRAPPER ===================== */

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <MicrogridDashboard />
    </GoogleOAuthProvider>
  );
}