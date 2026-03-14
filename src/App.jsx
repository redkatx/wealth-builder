import { useState, useMemo, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

const fmt = (n) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n).toLocaleString()}`;
const fmtPrice = (n) =>
  n >= 1000 ? `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : `$${Number(n).toFixed(2)}`;

async function fetchLiveMarketData() {
  const prompt = `Search for today's current market data and return ONLY a valid JSON object with no markdown, no code fences, no explanation. Use these exact fields:
{
  "goldSpot": <gold spot price per troy oz in USD, number>,
  "silverSpot": <silver spot price per troy oz in USD, number>,
  "bitcoinPrice": <current bitcoin price in USD, number>,
  "goldChange": <gold 1-day % change, number>,
  "silverChange": <silver 1-day % change, number>,
  "bitcoinChange": <bitcoin 1-day % change, number>,
  "sp500": <current S&P 500 index value, number>,
  "sp500YTD": <S&P 500 year-to-date % return, number>,
  "fetchedAt": "<today date YYYY-MM-DD>",
  "marketSummary": "<one sentence about today's market, max 100 chars>"
}
Return ONLY the raw JSON object. Nothing else.`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {"Content-Type": "application/json",
  "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
 },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch { return null; }
}

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_AGE = 38;

const PASSIVE_IDEAS = [
  { icon: "🏠", title: "Short-Term Rental Property", tier: "High Impact", tierColor: "#C9A84C", desc: "You already know this industry inside and out. A Park City or 30A unit managed through your own network could generate strong gross income with minimal learning curve.", action: "Use equity or save 20-25% down. Your industry contacts give you a major edge sourcing undervalued listings before they hit the market.", est: "$2,000–$6,000/mo gross" },
  { icon: "⚖️", title: "Mediation Practice", tier: "Career Leverage", tierColor: "#8A9DC9", desc: "Your 40-hour cert plus 10+ years of high-stakes dispute resolution with high-net-worth clients is a rare combination. Real estate/STR niche mediation is underserved.", action: "Start weekends in the next 12-18 months while at LVR. Target replacing one day of W2 income by year two. Credential through TMCA or TMA.", est: "$20k–$60k/yr part-time" },
  { icon: "₿", title: "Bitcoin / Crypto", tier: "High Growth / High Risk", tierColor: "#F7931A", desc: "Bitcoin has historically been the highest-returning major asset class over 4+ year holding periods. Your $5k is a solid starting position.", action: "Hold in Robinhood or consider a Ledger hardware wallet for larger amounts. Dollar-cost averaging small monthly amounts reduces timing risk.", est: "Highly variable — 10-yr CAGR ~60%+" },
  { icon: "🥇", title: "Gold & Silver", tier: "Inflation Hedge", tierColor: "#D4AF37", desc: "Precious metals hold value during inflation and market downturns. A 5-10% allocation adds resilience and reduces correlation to your equity portfolio.", action: "GLD/IAU for Robinhood, GLDM for your IRA. SLV/PSLV for silver. Physical coins from APMEX for outside-account holds.", est: "Inflation hedge + 5-15% upside" },
  { icon: "📈", title: "Dividend Growth Portfolio", tier: "Steady Builder", tierColor: "#6BAF92", desc: "Shifting part of your Robinhood toward dividend ETFs (SCHD, VYM) creates compounding income that grows even after you stop contributing — key for bridging the pre-59½ gap.", action: "Allocate $75-100/mo of your Robinhood contribution to a dividend ETF. Set to auto-reinvest.", est: "$300–$1,200/yr growing yearly" },
  { icon: "🏢", title: "REITs in Your IRA", tier: "Steady Builder", tierColor: "#6BAF92", desc: "REITs must distribute 90% of taxable income. Holding them inside your Vanguard IRA shields dividends from taxes entirely.", action: "Allocate a slice of your Vanguard IRA to VNQ or FREL. Set dividends to auto-reinvest.", est: "4–6% annual yield" },
  { icon: "🔗", title: "High-Yield Savings / T-Bills", tier: "Low-Risk Baseline", tierColor: "#A0A0A0", desc: "Your emergency fund should be earning something. A HYSA or 4-week T-bills via TreasuryDirect earns meaningful interest with zero lock-up.", action: "Move your emergency fund immediately if not already done.", est: "$800–$1,500/yr on $20k" },
];

export default function WealthBuilder() {
  const [liveData, setLiveData] = useState(null);
  const [loadingLive, setLoadingLive] = useState(true);
  const [liveError, setLiveError] = useState(false);

  const [ira, setIra] = useState({ currentBalance: 10000, annualContrib: 7500 });
  const [k401, setK401] = useState({ currentBalance: 40000, annualContrib: 23500 });
  const [brokerage, setBrokerage] = useState({ currentBalance: 20000, monthlyContrib: 225 });
  const [goldOz, setGoldOz] = useState(1);
  const [silverOz, setSilverOz] = useState(50);
  const [bitcoinUSD, setBitcoinUSD] = useState(5000);
  const [goldGrowth, setGoldGrowth] = useState(6);
  const [silverGrowth, setSilverGrowth] = useState(8);
  const [bitcoinGrowth, setBitcoinGrowth] = useState(30);
  const [retireAge, setRetireAge] = useState(50);
  const [returnRate, setReturnRate] = useState(7);
  const [years, setYears] = useState(14);
  const [monthlyExpenses, setMonthlyExpenses] = useState(4000);
  const [activeTab, setActiveTab] = useState("fire");
  const [safeWithdrawRate, setSafeWithdrawRate] = useState(4);

  useEffect(() => {
    fetchLiveMarketData()
      .then((d) => { if (d?.goldSpot) setLiveData(d); else setLiveError(true); })
      .catch(() => setLiveError(true))
      .finally(() => setLoadingLive(false));
  }, []);

  const goldPrice = liveData?.goldSpot || 3100;
  const silverPrice = liveData?.silverSpot || 34;
  const btcPrice = liveData?.bitcoinPrice || 84000;
  const btcAmount = bitcoinUSD / btcPrice;

  const r = returnRate / 100;
  const project = (balance, annual, yrs) => {
    let b = balance; const pts = [];
    for (let i = 0; i <= yrs; i++) { pts.push(Math.round(b)); b = b * (1 + r) + annual; }
    return pts;
  };
  const projectAsset = (startUSD, growthPct, yrs) => {
    let val = startUSD; const pts = [];
    for (let i = 0; i <= yrs; i++) { pts.push(Math.round(val)); val *= (1 + growthPct / 100); }
    return pts;
  };

  const chartData = useMemo(() => {
    const iraD = project(ira.currentBalance, ira.annualContrib, years);
    const k401D = project(k401.currentBalance, k401.annualContrib, years);
    const brokD = project(brokerage.currentBalance, brokerage.monthlyContrib * 12, years);
    const goldD = projectAsset(goldOz * goldPrice, goldGrowth, years);
    const silverD = projectAsset(silverOz * silverPrice, silverGrowth, years);
    const btcD = projectAsset(bitcoinUSD, bitcoinGrowth, years);
    return Array.from({ length: years + 1 }, (_, i) => ({
      year: CURRENT_YEAR + i, age: CURRENT_AGE + i,
      IRA: iraD[i], "401k": k401D[i], Robinhood: brokD[i],
      Gold: goldD[i], Silver: silverD[i], Bitcoin: btcD[i],
      Total: iraD[i] + k401D[i] + brokD[i] + goldD[i] + silverD[i] + btcD[i],
    }));
  }, [ira, k401, brokerage, goldOz, silverOz, bitcoinUSD, goldPrice, silverPrice, btcPrice, goldGrowth, silverGrowth, bitcoinGrowth, returnRate, years]);

  // ── FIRE calculations ──
  const annualExpenses = monthlyExpenses * 12;
  const fireNumber = annualExpenses * (100 / safeWithdrawRate);
  const yrsToRetire = retireAge - CURRENT_AGE;
  // Coast FIRE = how much you need NOW so it grows to FIRE number by retireAge with no contributions
  const coastFireNumber = fireNumber / Math.pow(1 + r, yrsToRetire);
  // Total current portfolio
  const currentTotal = ira.currentBalance + k401.currentBalance + brokerage.currentBalance +
    goldOz * goldPrice + silverOz * silverPrice + bitcoinUSD;
  // Progress to FIRE
  const fireProgress = Math.min((currentTotal / fireNumber) * 100, 100);
  const coastProgress = Math.min((currentTotal / coastFireNumber) * 100, 100);
  const hitCoastFIRE = currentTotal >= coastFireNumber;
  // Annual savings
  const annualSavings = ira.annualContrib + k401.annualContrib + brokerage.monthlyContrib * 12;
  // Find year portfolio crosses FIRE number
  const fireYearRow = chartData.find((r) => r.Total >= fireNumber);
  const fireYear = fireYearRow?.year;
  const fireAgeActual = fireYearRow?.age;
  // Coast FIRE year (when portfolio without any more contributions would reach FIRE number by retireAge)
  let coastYear = null, coastAge = null;
  for (let i = 0; i < chartData.length; i++) {
    const row = chartData[i];
    const yrsLeft = retireAge - row.age;
    if (yrsLeft <= 0) break;
    const coastNeeded = fireNumber / Math.pow(1 + r, yrsLeft);
    if (row.Total >= coastNeeded) { coastYear = row.year; coastAge = row.age; break; }
  }
  // Annual withdrawal from portfolio at retirement
  const safeAnnualWithdrawal = (retireRow) => retireRow ? retireRow.Total * (safeWithdrawRate / 100) : 0;

  const retireIdx = Math.min(Math.max(0, retireAge - CURRENT_AGE), chartData.length - 1);
  const retireRow = chartData[retireIdx];
  const yr5 = chartData[Math.min(5, chartData.length - 1)];
  const monthlyTotal = (ira.annualContrib + k401.annualContrib) / 12 + brokerage.monthlyContrib;

  const COLORS = { IRA: "#C9A84C", "401k": "#8A9DC9", Robinhood: "#B07CC6", Gold: "#D4AF37", Silver: "#C0C0C0", Bitcoin: "#F7931A" };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const row = chartData.find((d) => d.year === label);
    return (
      <div style={{ background: "#0E0C09", border: "1px solid #C9A84C33", borderRadius: 10, padding: "12px 16px", fontSize: 11, fontFamily: "monospace" }}>
        <div style={{ color: "#C9A84C", marginBottom: 8 }}>{label} · Age {row?.age}</div>
        {payload.map((p) => <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 20, color: p.color, marginBottom: 2 }}><span>{p.name}</span><span>{fmt(p.value)}</span></div>)}
        <div style={{ borderTop: "1px solid #C9A84C22", marginTop: 6, paddingTop: 6, color: "#EDE0C4" }}>Total: {fmt(row?.Total)}</div>
      </div>
    );
  };

  const InputRow = ({ label, value, onChange, step = 1000, note, prefix = "$" }) => (
    <div style={{ paddingBottom: 8, marginBottom: 4, borderBottom: "1px solid rgba(201,168,76,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#A89060" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {prefix && <span style={{ color: "#C9A84C", fontSize: 12 }}>{prefix}</span>}
          <input type="number" value={value} step={step} min={0} onChange={(e) => onChange(Number(e.target.value))}
            style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 5, padding: "3px 7px", color: "#EDE0C4", fontSize: 12, width: 100, textAlign: "right", outline: "none", fontFamily: "monospace" }} />
        </div>
      </div>
      {note && <div style={{ fontSize: 9, color: "#3A3020", fontFamily: "monospace", marginTop: 2 }}>{note}</div>}
    </div>
  );

  const StatCard = ({ label, value, sub, color = "#C9A84C" }) => (
    <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color}28`, borderTop: `2px solid ${color}`, borderRadius: 12, padding: "13px 15px", flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 9, color: "#5A5040", textTransform: "uppercase", letterSpacing: 2, fontFamily: "monospace", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 17, color, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: "#5A5040", marginTop: 4, fontFamily: "monospace" }}>{sub}</div>}
    </div>
  );

  const Tab = ({ id, label, highlight }) => (
    <button onClick={() => setActiveTab(id)}
      style={{ background: activeTab === id ? (highlight ? "rgba(107,175,146,0.12)" : "rgba(201,168,76,0.1)") : "transparent", border: activeTab === id ? `1px solid ${highlight ? "rgba(107,175,146,0.3)" : "rgba(201,168,76,0.28)"}` : "1px solid transparent", borderRadius: 7, padding: "6px 14px", color: activeTab === id ? (highlight ? "#6BAF92" : "#C9A84C") : "#4A4030", fontSize: 11, fontFamily: "monospace", cursor: "pointer", textTransform: "uppercase", letterSpacing: 1 }}>
      {label}
    </button>
  );

  const Ticker = ({ label, price, change, color }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div>
        <div style={{ fontSize: 9, color: "#4A4030", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
        <div style={{ fontSize: 15, color, fontWeight: 700, fontFamily: "monospace" }}>{fmtPrice(price)}</div>
      </div>
      {change !== undefined && (
        <div style={{ fontSize: 10, color: change >= 0 ? "#6BAF92" : "#C07060", fontFamily: "monospace", background: change >= 0 ? "rgba(107,175,146,0.1)" : "rgba(192,112,96,0.1)", borderRadius: 4, padding: "2px 6px" }}>
          {change >= 0 ? "▲" : "▼"}{Math.abs(change).toFixed(2)}%
        </div>
      )}
    </div>
  );

  // Progress bar component
  const ProgressBar = ({ pct, color, label, current, target, note }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#EDE0C4", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color, fontFamily: "monospace" }}>{pct.toFixed(1)}% there</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 100, height: 10, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 100, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10, fontFamily: "monospace" }}>
        <span style={{ color: "#5A5040" }}>Now: <span style={{ color: "#EDE0C4" }}>{fmt(current)}</span></span>
        <span style={{ color: "#5A5040" }}>Target: <span style={{ color }}>{fmt(target)}</span></span>
      </div>
      {note && <div style={{ fontSize: 10, color: "#4A4030", marginTop: 3, fontStyle: "italic" }}>{note}</div>}
    </div>
  );

  const withdrawal = safeAnnualWithdrawal(retireRow);
  const monthlyWithdrawal = withdrawal / 12;
  const incomeGap = monthlyExpenses - monthlyWithdrawal;

  return (
    <div style={{ background: "linear-gradient(150deg,#0C0A07 0%,#12100A 55%,#090C0E 100%)", minHeight: "100vh", color: "#EDE0C4", padding: "30px 20px", maxWidth: 1020, margin: "0 auto" }}>
      <style>{`
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        input[type=range]{accent-color:#C9A84C;cursor:pointer;width:100%}
        *{box-sizing:border-box}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fi{animation:fadeIn 0.35s ease forwards}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        .pulsing{animation:pulse 1.4s infinite}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 22 }} className="fi">
        <div style={{ fontSize: 9, color: "#C9A84C", letterSpacing: 5, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 7 }}>
          Personal Wealth + FIRE Strategy · Live Data · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 900, margin: 0, lineHeight: 1.05, letterSpacing: -0.5 }}>
          Your Path to <span style={{ color: "#6BAF92", fontStyle: "italic" }}>FIRE</span> <span style={{ color: "#3A3020", fontSize: 20 }}>+</span> <span style={{ color: "#C9A84C", fontStyle: "italic" }}>Financial Independence</span>
        </h1>
        <p style={{ color: "#3A3020", fontSize: 13, marginTop: 7 }}>Age 38 · FIRE Target: {fmt(fireNumber)} · IRA · 401k · Robinhood · Bitcoin · Gold · Silver</p>
      </div>

      {/* Live Market Strip */}
      <div style={{ background: "rgba(107,175,146,0.03)", border: "1px solid rgba(107,175,146,0.12)", borderRadius: 12, padding: "11px 16px", marginBottom: 18, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }} className="fi">
        <div style={{ fontSize: 9, color: "#4A6040", textTransform: "uppercase", letterSpacing: 2, fontFamily: "monospace", flexShrink: 0 }}>Live</div>
        {loadingLive ? (
          <div className="pulsing" style={{ fontSize: 12, color: "#4A4030", fontFamily: "monospace" }}>Fetching live prices...</div>
        ) : liveError ? (
          <div style={{ fontSize: 11, color: "#6A4030", fontFamily: "monospace" }}>Using reference prices</div>
        ) : (
          <>
            <Ticker label="Bitcoin" price={liveData?.bitcoinPrice} change={liveData?.bitcoinChange} color="#F7931A" />
            <div style={{ width: 1, height: 30, background: "rgba(107,175,146,0.15)" }} />
            <Ticker label="Gold /oz" price={liveData?.goldSpot} change={liveData?.goldChange} color="#D4AF37" />
            <Ticker label="Silver /oz" price={liveData?.silverSpot} change={liveData?.silverChange} color="#C0C0C0" />
            <div style={{ width: 1, height: 30, background: "rgba(107,175,146,0.15)" }} />
            <Ticker label="S&P 500" price={liveData?.sp500} change={liveData?.sp500YTD} color="#8A9DC9" />
            {liveData?.marketSummary && <div style={{ fontSize: 11, color: "#4A4030", fontStyle: "italic", marginLeft: "auto", maxWidth: 240 }}>{liveData.marketSummary}</div>}
          </>
        )}
        {!loadingLive && <div style={{ fontSize: 9, color: "#2A2018", fontFamily: "monospace", marginLeft: "auto" }}>As of {liveData?.fetchedAt || "today"} · Refreshes on load</div>}
      </div>

      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }} className="fi">
        <StatCard label="FIRE Number" value={fmt(fireNumber)} sub={`$${monthlyExpenses.toLocaleString()}/mo × 25`} color="#6BAF92" />
        <StatCard label="Coast FIRE" value={fmt(coastFireNumber)} sub={`Needed today to coast to ${retireAge}`} color="#8AC9A4" />
        <StatCard label={`At Retirement (${retireAge})`} value={fmt(retireRow?.Total || 0)} sub={`In ${Math.max(0, retireAge - CURRENT_AGE)} years`} color={retireRow?.Total >= fireNumber ? "#6BAF92" : "#C9A84C"} />
        <StatCard label="Safe Monthly Income" value={fmt(monthlyWithdrawal)} sub={`${safeWithdrawRate}% SWR at retirement`} color={monthlyWithdrawal >= monthlyExpenses ? "#6BAF92" : "#C9A84C"} />
        <StatCard label="Current Portfolio" value={fmt(currentTotal)} sub={`${coastProgress.toFixed(0)}% to Coast FIRE`} color="#C9A84C" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
        {[["fire","🔥 FIRE Dashboard",true],["portfolio","Portfolio"],["alts","BTC · Gold · Silver"],["table","Year-by-Year"],["passive","Passive Income"],["strategy","Strategy"]].map(([id, label, hi]) => (
          <Tab key={id} id={id} label={label} highlight={hi} />
        ))}
      </div>

      {/* ── FIRE DASHBOARD TAB ── */}
      {activeTab === "fire" && (
        <div className="fi">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

            {/* Left: Progress + Numbers */}
            <div style={{ background: "rgba(107,175,146,0.04)", border: "1px solid rgba(107,175,146,0.15)", borderRadius: 13, padding: 22 }}>
              <div style={{ fontSize: 9, color: "#5A7060", textTransform: "uppercase", letterSpacing: 2, fontFamily: "monospace", marginBottom: 2 }}>FIRE Progress</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "#6BAF92", marginBottom: 18 }}>Where You Stand Today</div>

              <ProgressBar pct={fireProgress} color="#6BAF92" label="FIRE Number Progress" current={currentTotal} target={fireNumber} note={`$${(fireNumber - currentTotal).toLocaleString()} remaining to full FIRE`} />
              <ProgressBar pct={coastProgress} color={hitCoastFIRE ? "#6BAF92" : "#C9A84C"} label="Coast FIRE Progress" current={currentTotal} target={coastFireNumber}
                note={hitCoastFIRE ? "✓ You have hit Coast FIRE! Contributions are bonus from here." : `$${Math.round(coastFireNumber - currentTotal).toLocaleString()} more needed to coast`} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                {[
                  { label: "FIRE Number", val: fmt(fireNumber), color: "#6BAF92", sub: `${safeWithdrawRate}% SWR on $${(monthlyExpenses).toLocaleString()}/mo` },
                  { label: "Coast FIRE Today", val: fmt(coastFireNumber), color: "#8AC9A4", sub: `Grow to FIRE by age ${retireAge}` },
                  { label: "Years to FIRE", val: fireYearRow ? `${fireAgeActual - CURRENT_AGE} yrs` : "Beyond horizon", color: fireYearRow ? "#6BAF92" : "#C9A84C", sub: fireYear ? `Projected ${fireYear} (age ${fireAgeActual})` : "Extend horizon or increase savings" },
                  { label: "Coast FIRE Year", val: coastYear ? `${coastYear}` : "TBD", color: coastYear ? "#6BAF92" : "#C9A84C", sub: coastYear ? `Age ${coastAge} — then contributions optional` : "Keep contributing" },
                ].map(({ label, val, color, sub }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 9, padding: "12px 14px", border: `1px solid ${color}20` }}>
                    <div style={{ fontSize: 9, color: "#5A7060", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 16, color, fontWeight: 700, fontFamily: "monospace" }}>{val}</div>
                    <div style={{ fontSize: 9, color: "#4A4030", marginTop: 3 }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Inputs + Income check */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "rgba(107,175,146,0.04)", border: "1px solid rgba(107,175,146,0.12)", borderRadius: 13, padding: 18 }}>
                <div style={{ fontSize: 11, color: "#6BAF92", textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "monospace", marginBottom: 12 }}>⚙️ FIRE Settings</div>
                <InputRow label="Monthly Expenses at Retirement" value={monthlyExpenses} step={100} onChange={setMonthlyExpenses} />
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: "#A89060", marginBottom: 3 }}>Safe Withdrawal Rate: {safeWithdrawRate}%</div>
                  <input type="range" min={3} max={6} step={0.25} value={safeWithdrawRate} onChange={(e) => setSafeWithdrawRate(Number(e.target.value))} style={{ accentColor: "#6BAF92" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#2A2018", fontFamily: "monospace" }}>
                    <span>3% very safe</span><span>4% standard</span><span>6% aggressive</span>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: "#A89060", marginBottom: 3 }}>Return Rate: {returnRate}%</div>
                  <input type="range" min={4} max={12} step={0.5} value={returnRate} onChange={(e) => setReturnRate(Number(e.target.value))} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: "#A89060", marginBottom: 3 }}>Target Retire Age: {retireAge}</div>
                  <input type="range" min={45} max={65} step={1} value={retireAge} onChange={(e) => setRetireAge(Number(e.target.value))} />
                </div>
              </div>

              {/* Income check at retirement */}
              <div style={{ background: incomeGap <= 0 ? "rgba(107,175,146,0.05)" : "rgba(201,168,76,0.05)", border: `1px solid ${incomeGap <= 0 ? "rgba(107,175,146,0.2)" : "rgba(201,168,76,0.2)"}`, borderRadius: 13, padding: 18 }}>
                <div style={{ fontSize: 11, color: incomeGap <= 0 ? "#6BAF92" : "#C9A84C", textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "monospace", marginBottom: 14 }}>
                  {incomeGap <= 0 ? "✓ Income Check Passes" : "⚠ Income Check"}
                </div>
                {[
                  { label: "Portfolio at Retirement", val: fmt(retireRow?.Total || 0), color: "#EDE0C4" },
                  { label: `Safe Annual Withdrawal (${safeWithdrawRate}%)`, val: fmt(withdrawal), color: "#6BAF92" },
                  { label: "Monthly Income from Portfolio", val: fmt(monthlyWithdrawal), color: "#6BAF92" },
                  { label: "Your Monthly Expense Target", val: `$${monthlyExpenses.toLocaleString()}`, color: "#C9A84C" },
                  { label: incomeGap <= 0 ? "Monthly Surplus" : "Monthly Gap", val: `${incomeGap <= 0 ? "+" : "-"}$${Math.abs(Math.round(incomeGap)).toLocaleString()}`, color: incomeGap <= 0 ? "#6BAF92" : "#E07060" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12 }}>
                    <span style={{ color: "#5A5040" }}>{label}</span>
                    <span style={{ color, fontFamily: "monospace", fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
                {incomeGap > 0 && (
                  <div style={{ marginTop: 10, fontSize: 11, color: "#8A7A50", lineHeight: 1.6 }}>
                    You'll need ~{fmt(incomeGap * 12)} more per year. Consider increasing contributions, delaying retirement age, or adding passive income streams.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FIRE Chart */}
          <div style={{ background: "rgba(107,175,146,0.03)", border: "1px solid rgba(107,175,146,0.1)", borderRadius: 13, padding: "18px 16px" }}>
            <div style={{ fontSize: 9, color: "#5A7060", textTransform: "uppercase", letterSpacing: 2, fontFamily: "monospace", marginBottom: 2 }}>Portfolio vs FIRE Number</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "#EDE0C4", marginBottom: 14 }}>When Does Your Portfolio Cross the Line?</div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 6, bottom: 4 }}>
                <defs>
                  <linearGradient id="gTotalFire" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6BAF92" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6BAF92" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,175,146,0.06)" />
                <XAxis dataKey="year" stroke="#1A2018" tick={{ fill: "#3A4030", fontSize: 10, fontFamily: "monospace" }} />
                <YAxis stroke="#1A2018" tick={{ fill: "#3A4030", fontSize: 10, fontFamily: "monospace" }} tickFormatter={fmt} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={fireNumber} stroke="#6BAF92" strokeDasharray="6 3" strokeWidth={2}
                  label={{ value: `FIRE ${fmt(fireNumber)}`, position: "insideTopRight", fill: "#6BAF92", fontSize: 10, fontFamily: "monospace" }} />
                <ReferenceLine y={coastFireNumber} stroke="#C9A84C" strokeDasharray="4 4" strokeWidth={1.5}
                  label={{ value: `Coast ${fmt(coastFireNumber)}`, position: "insideBottomRight", fill: "#C9A84C", fontSize: 9, fontFamily: "monospace" }} />
                <Area type="monotone" dataKey="Total" name="Total Portfolio" stroke="#6BAF92" fill="url(#gTotalFire)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: 10, fontFamily: "monospace", color: "#4A4030" }}>
              <span><span style={{ color: "#6BAF92" }}>━━</span> Your portfolio</span>
              <span><span style={{ color: "#6BAF92" }}>╌╌</span> FIRE number ({fmt(fireNumber)})</span>
              <span><span style={{ color: "#C9A84C" }}>╌╌</span> Coast FIRE ({fmt(coastFireNumber)})</span>
            </div>
          </div>
        </div>
      )}

      {/* ── PORTFOLIO TAB ── */}
      {activeTab === "portfolio" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16 }} className="fi">
          <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(201,168,76,0.09)", borderRadius: 13, padding: "18px 16px" }}>
            <div style={{ fontSize: 9, color: "#5A5040", textTransform: "uppercase", letterSpacing: 2, fontFamily: "monospace", marginBottom: 2 }}>All Assets Combined</div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 14 }}>Portfolio Growth Over Time</div>
            <ResponsiveContainer width="100%" height={265}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 6, bottom: 4 }}>
                <defs>
                  {[...Object.entries(COLORS), ["Total","#EDE0C4"]].map(([k, c]) => (
                    <linearGradient key={k} id={`g${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={c} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.05)" />
                <XAxis dataKey="year" stroke="#1A1508" tick={{ fill: "#3A3020", fontSize: 10, fontFamily: "monospace" }} />
                <YAxis stroke="#1A1508" tick={{ fill: "#3A3020", fontSize: 10, fontFamily: "monospace" }} tickFormatter={fmt} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={fireNumber} stroke="#6BAF92" strokeDasharray="5 3" strokeWidth={1.5}
                  label={{ value: `FIRE`, position: "insideTopRight", fill: "#6BAF92", fontSize: 9 }} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace", color: "#4A4030", paddingTop: 6 }} />
                <Area type="monotone" dataKey="Total" stroke="#EDE0C4" fill="url(#gTotal)" strokeWidth={2.5} dot={false} />
                {Object.entries(COLORS).map(([k, c]) => (
                  <Area key={k} type="monotone" dataKey={k} stroke={c} fill={`url(#g${k})`} strokeWidth={1.5} dot={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
              {[
                { label: `Return: ${returnRate}%`, val: returnRate, min: 4, max: 12, step: 0.5, set: setReturnRate, t: ["4%","7%","12%"] },
                { label: `Horizon: ${years}yr`, val: years, min: 5, max: 20, step: 1, set: setYears, t: ["5","12","20"] },
                { label: `Retire: ${retireAge}`, val: retireAge, min: 45, max: 65, step: 1, set: setRetireAge, t: ["45","50","65"] },
              ].map(({ label, val, min, max, step, set, t }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: "#5A5040", fontFamily: "monospace", marginBottom: 3 }}>{label}</div>
                  <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => set(Number(e.target.value))} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#2A2018", fontFamily: "monospace" }}>
                    {t.map((x) => <span key={x}>{x}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {[
              { title: "🏦 Vanguard IRA", color: "#C9A84C", fields: [{ label: "Balance", k: "currentBalance", obj: ira, set: setIra }, { label: "Annual Contrib", k: "annualContrib", obj: ira, set: setIra, note: "2026 max: $7,500 · 50+: $8,600" }] },
              { title: "🏢 401k (4 accounts)", color: "#8A9DC9", fields: [{ label: "Total Balance", k: "currentBalance", obj: k401, set: setK401 }, { label: "Annual Contrib", k: "annualContrib", obj: k401, set: setK401, note: "2026 max: $24,500 · 50+: $32,500" }] },
              { title: "📱 Robinhood", color: "#B07CC6", fields: [{ label: "Balance", k: "currentBalance", obj: brokerage, set: setBrokerage }, { label: "Monthly Contrib", k: "monthlyContrib", obj: brokerage, set: setBrokerage, step: 25, note: "Only penalty-free source pre-59½" }] },
            ].map(({ title, color, fields }) => (
              <div key={title} style={{ background: "rgba(255,255,255,0.015)", borderLeft: `3px solid ${color}`, borderRadius: 9, padding: "11px 13px" }}>
                <div style={{ fontSize: 9, color, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "monospace", marginBottom: 9 }}>{title}</div>
                {fields.map(({ label, k, obj, set, step = 1000, note }) => (
                  <InputRow key={k} label={label} value={obj[k]} step={step} note={note} onChange={(v) => set({ ...obj, [k]: v })} />
                ))}
              </div>
            ))}
            <div style={{ background: "rgba(247,147,26,0.05)", borderLeft: "3px solid #F7931A", borderRadius: 9, padding: "11px 13px" }}>
              <div style={{ fontSize: 9, color: "#F7931A", textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "monospace", marginBottom: 9 }}>₿ Bitcoin</div>
              <InputRow label="Current Value ($USD)" value={bitcoinUSD} step={100} onChange={setBitcoinUSD} note={`≈ ${btcAmount.toFixed(6)} BTC @ ${fmtPrice(btcPrice)}`} />
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 10, color: "#A89060", marginBottom: 3 }}>Est. Annual Growth: {bitcoinGrowth}%</div>
                <input type="range" min={0} max={100} step={5} value={bitcoinGrowth} onChange={(e) => setBitcoinGrowth(Number(e.target.value))} style={{ accentColor: "#F7931A" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ALTS TAB ── */}
      {activeTab === "alts" && (
        <div className="fi">
          <div style={{ background: "rgba(247,147,26,0.04)", border: "1px solid rgba(247,147,26,0.15)", borderRadius: 13, padding: 20, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <span style={{ fontSize: 32 }}>₿</span>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: "#F7931A" }}>Bitcoin</div>
                <div style={{ fontSize: 12, fontFamily: "monospace", color: "#5A5040" }}>
                  {loadingLive ? "Loading..." : fmtPrice(btcPrice)}
                  {liveData?.bitcoinChange !== undefined && <span style={{ marginLeft: 8, color: liveData.bitcoinChange >= 0 ? "#6BAF92" : "#C07060" }}>{liveData.bitcoinChange >= 0 ? "▲" : "▼"}{Math.abs(liveData.bitcoinChange).toFixed(2)}%</span>}
                </div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 9, color: "#5A5040", fontFamily: "monospace" }}>Your Holdings</div>
                <div style={{ fontSize: 22, color: "#F7931A", fontWeight: 700, fontFamily: "monospace" }}>{fmt(bitcoinUSD)}</div>
                <div style={{ fontSize: 10, color: "#5A5040", fontFamily: "monospace" }}>{btcAmount.toFixed(6)} BTC</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
              {[
                { label: "5-Year Value", val: chartData[Math.min(5, chartData.length-1)]?.Bitcoin },
                { label: "10-Year Value", val: chartData[Math.min(10, chartData.length-1)]?.Bitcoin },
                { label: `At Retire (${retireAge})`, val: retireRow?.Bitcoin },
                { label: null },
              ].map(({ label, val }, i) => label ? (
                <div key={label} style={{ background: "rgba(247,147,26,0.07)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9, color: "#5A5040", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 16, color: "#F7931A", fontWeight: 700, fontFamily: "monospace" }}>{fmt(val)}</div>
                </div>
              ) : (
                <div key={i} style={{ background: "rgba(247,147,26,0.07)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9, color: "#5A5040", fontFamily: "monospace", marginBottom: 4 }}>Annual Growth</div>
                  <input type="range" min={0} max={100} step={5} value={bitcoinGrowth} onChange={(e) => setBitcoinGrowth(Number(e.target.value))} style={{ accentColor: "#F7931A", width: "100%" }} />
                  <div style={{ fontSize: 14, color: "#F7931A", fontWeight: 700, fontFamily: "monospace" }}>{bitcoinGrowth}%/yr</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["Why Bitcoin",["Highest CAGR of any major asset class over 4+ year periods","Fixed supply of 21M coins — designed to be deflationary","Institutional adoption accelerating (ETFs, corporate treasuries)","Can be held in Robinhood or self-custodied for full ownership"]],["Risk & Strategy",["Highly volatile — 50-80% drawdowns have occurred multiple times","Never invest more than you can afford to ignore for 4+ years","Dollar-cost averaging monthly reduces timing risk significantly","Consider a Ledger hardware wallet if position grows meaningfully"]]].map(([title, pts]) => (
                <div key={title}>
                  <div style={{ fontSize: 10, color: "#F7931A", textTransform: "uppercase", letterSpacing: 1, fontFamily: "monospace", marginBottom: 8 }}>{title}</div>
                  {pts.map((f) => <div key={f} style={{ fontSize: 11, color: "#7A6A50", marginBottom: 5, paddingLeft: 10, borderLeft: "2px solid #F7931A44", lineHeight: 1.5 }}>{f}</div>)}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { metal: "Gold", icon: "🥇", color: "#D4AF37", rgb: "212,175,55", oz: goldOz, setOz: setGoldOz, price: goldPrice, growth: goldGrowth, setGrowth: setGoldGrowth, change: liveData?.goldChange, facts: ["Historically strong during inflation and dollar weakness","Moves inverse to equities — true diversifier","GLD/IAU for Robinhood; GLDM for IRA (lower fees)","Central banks buying gold at record pace"] },
              { metal: "Silver", icon: "🥈", color: "#C0C0C0", rgb: "192,192,192", oz: silverOz, setOz: setSilverOz, price: silverPrice, growth: silverGrowth, setGrowth: setSilverGrowth, change: liveData?.silverChange, facts: ["More volatile than gold — higher upside and downside","Industrial demand (solar, EVs) adds a real growth driver","SLV/PSLV for Robinhood; physical from APMEX","Gold:silver ratio historically suggests silver is undervalued"] },
            ].map(({ metal, icon, color, rgb, oz, setOz, price, growth, setGrowth, change, facts }) => {
              const current = oz * price;
              const in5 = oz * price * Math.pow(1 + growth / 100, 5);
              const atRetire = oz * price * Math.pow(1 + growth / 100, retireAge - CURRENT_AGE);
              return (
                <div key={metal} style={{ background: `rgba(${rgb},0.03)`, border: `1px solid rgba(${rgb},0.15)`, borderRadius: 13, padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <span style={{ fontSize: 28 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color }}>{metal}</div>
                      <div style={{ fontSize: 11, fontFamily: "monospace", color: "#5A5040" }}>
                        {loadingLive ? "..." : fmtPrice(price)}
                        {change !== undefined && <span style={{ marginLeft: 8, color: change >= 0 ? "#6BAF92" : "#C07060" }}>{change >= 0 ? "▲" : "▼"}{Math.abs(change).toFixed(2)}%</span>}
                      </div>
                    </div>
                    <div style={{ marginLeft: "auto", textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: "#5A5040", fontFamily: "monospace" }}>Current Value</div>
                      <div style={{ fontSize: 18, color, fontWeight: 700, fontFamily: "monospace" }}>{fmt(current)}</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {[{ label: "5-Year", val: in5 }, { label: `Retire (${retireAge})`, val: atRetire }].map(({ label, val }) => (
                      <div key={label} style={{ background: `rgba(${rgb},0.07)`, borderRadius: 7, padding: "9px 11px" }}>
                        <div style={{ fontSize: 9, color: "#5A5040", fontFamily: "monospace", marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 15, color, fontWeight: 700, fontFamily: "monospace" }}>{fmt(val)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#5A5040", fontFamily: "monospace", marginBottom: 3 }}>Ounces</div>
                      <input type="number" value={oz} step={1} min={0} onChange={(e) => setOz(Number(e.target.value))}
                        style={{ background: `rgba(${rgb},0.06)`, border: `1px solid rgba(${rgb},0.2)`, borderRadius: 5, padding: "4px 7px", color: "#EDE0C4", fontSize: 12, width: "100%", outline: "none", fontFamily: "monospace" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#5A5040", fontFamily: "monospace", marginBottom: 3 }}>Growth: {growth}%/yr</div>
                      <input type="range" min={0} max={20} step={0.5} value={growth} onChange={(e) => setGrowth(Number(e.target.value))} style={{ accentColor: color }} />
                    </div>
                  </div>
                  {facts.map((f) => <div key={f} style={{ fontSize: 11, color: "#6A5A40", marginBottom: 4, paddingLeft: 9, borderLeft: `2px solid rgba(${rgb},0.3)`, lineHeight: 1.5 }}>{f}</div>)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TABLE TAB ── */}
      {activeTab === "table" && (
        <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(201,168,76,0.09)", borderRadius: 13, padding: "18px 18px", overflowX: "auto" }} className="fi">
          <div style={{ fontSize: 9, color: "#5A5040", textTransform: "uppercase", letterSpacing: 2, fontFamily: "monospace", marginBottom: 2 }}>Year-by-Year</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 14 }}>Every Dollar, Every Year</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
                {["Year","Age","IRA","401k","Robinhood","Bitcoin","Gold","Silver","TOTAL"].map((h, i) => (
                  <th key={h} style={{ textAlign: i < 2 ? "left" : "right", padding: "6px 9px", color: "#4A4030", fontWeight: 400, letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, i) => {
                const isRetire = i === retireIdx;
                const hitsFIRE = row.Total >= fireNumber && (i === 0 || chartData[i-1].Total < fireNumber);
                const hitsCoast = coastYear && row.year === coastYear;
                return (
                  <tr key={row.year} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)", background: hitsFIRE ? "rgba(107,175,146,0.1)" : isRetire ? "rgba(176,124,198,0.07)" : hitsCoast ? "rgba(201,168,76,0.06)" : "transparent" }}>
                    <td style={{ padding: "5px 9px", color: "#C9A84C" }}>
                      {row.year}
                      {hitsFIRE && <span style={{ marginLeft: 6, fontSize: 8, color: "#6BAF92", fontWeight: 700 }}>🔥 FIRE!</span>}
                      {isRetire && !hitsFIRE && <span style={{ marginLeft: 6, fontSize: 8, color: "#B07CC6" }}>← RETIRE</span>}
                      {hitsCoast && !hitsFIRE && <span style={{ marginLeft: 6, fontSize: 8, color: "#C9A84C" }}>◎ COAST</span>}
                    </td>
                    <td style={{ padding: "5px 9px", color: "#4A4030" }}>{row.age}</td>
                    <td style={{ padding: "5px 9px", textAlign: "right", color: "#C9A84C" }}>{fmt(row.IRA)}</td>
                    <td style={{ padding: "5px 9px", textAlign: "right", color: "#8A9DC9" }}>{fmt(row["401k"])}</td>
                    <td style={{ padding: "5px 9px", textAlign: "right", color: "#B07CC6" }}>{fmt(row.Robinhood)}</td>
                    <td style={{ padding: "5px 9px", textAlign: "right", color: "#F7931A" }}>{fmt(row.Bitcoin)}</td>
                    <td style={{ padding: "5px 9px", textAlign: "right", color: "#D4AF37" }}>{fmt(row.Gold)}</td>
                    <td style={{ padding: "5px 9px", textAlign: "right", color: "#C0C0C0" }}>{fmt(row.Silver)}</td>
                    <td style={{ padding: "5px 9px", textAlign: "right", color: row.Total >= fireNumber ? "#6BAF92" : "#EDE0C4", fontWeight: 600 }}>{fmt(row.Total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 9, fontFamily: "monospace", color: "#3A3020" }}>
            <span><span style={{ background: "rgba(107,175,146,0.2)", padding: "1px 4px", borderRadius: 3 }}>🔥 FIRE!</span> Portfolio hits FIRE number</span>
            <span><span style={{ background: "rgba(201,168,76,0.12)", padding: "1px 4px", borderRadius: 3 }}>◎ COAST</span> Hit Coast FIRE — contributions now optional</span>
          </div>
        </div>
      )}

      {/* ── PASSIVE TAB ── */}
      {activeTab === "passive" && (
        <div className="fi">
          <p style={{ color: "#4A4030", fontSize: 13, fontStyle: "italic", marginBottom: 18 }}>Ranked by fit for your specific skills, assets, and early-retirement timeline.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(265px,1fr))", gap: 13 }}>
            {PASSIVE_IDEAS.map((idea) => (
              <div key={idea.title} style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, padding: 17 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ fontSize: 26 }}>{idea.icon}</span>
                  <span style={{ fontSize: 8, fontFamily: "monospace", letterSpacing: 1.5, color: idea.tierColor, border: `1px solid ${idea.tierColor}44`, borderRadius: 20, padding: "3px 9px", textTransform: "uppercase" }}>{idea.tier}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 7 }}>{idea.title}</div>
                <div style={{ fontSize: 12, color: "#7A6A50", lineHeight: 1.65, marginBottom: 11 }}>{idea.desc}</div>
                <div style={{ borderTop: "1px solid rgba(201,168,76,0.08)", paddingTop: 9 }}>
                  <div style={{ fontSize: 8, color: "#C9A84C", textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "monospace", marginBottom: 4 }}>Next Step</div>
                  <div style={{ fontSize: 11, color: "#8A7A60", lineHeight: 1.6, marginBottom: 7 }}>{idea.action}</div>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "#6BAF92" }}>Est: {idea.est}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STRATEGY TAB ── */}
      {activeTab === "strategy" && (
        <div className="fi">
          {[
            { title: "Your FIRE Number Is $1.2M — Here's Why", color: "#6BAF92", body: `At $4,000/month in expenses ($48,000/year), your FIRE number using the standard 4% safe withdrawal rate is $1,200,000. That means once your portfolio hits $1.2M, it should theoretically sustain your lifestyle indefinitely — your investments earn more than you spend. The 4% rule is based on historical 30-year retirement periods, but since you're targeting early retirement (age 50), you may want to consider a slightly lower 3.5% rate to build in extra cushion for a potentially 40+ year retirement. Adjust the SWR slider on the FIRE tab to see how it changes your number.` },
            { title: "Coast FIRE: Your First Milestone", color: "#8AC9A4", body: `Coast FIRE means you've saved enough that — even if you stopped contributing entirely — your portfolio would grow to your full FIRE number by your target retirement age at your assumed return rate. For you at age 38 targeting retirement at 50, your Coast FIRE number is approximately ${fmt(coastFireNumber)}. You currently have ${fmt(currentTotal)}, so you're ${coastProgress.toFixed(0)}% of the way there. Hitting Coast FIRE is a massive psychological and financial milestone — it means the heavy lifting is done and everything after is acceleration.` },
            { title: "2026 Contribution Limits — Maximizing Your Position", color: "#C9A84C", body: "Your IRA limit is $7,500 in 2026. Your 401k limit is $24,500. You're currently contributing at both maximums — this is the highest-leverage behavior you can sustain. At 50, both limits increase: IRA to $8,600 and 401k to $32,500, with an even higher 401k limit of $35,750 between ages 60-63 under SECURE 2.0." },
            { title: "Robinhood Is Your Early Retirement Bridge", color: "#B07CC6", body: "Your IRA and 401k are locked until 59½ without penalties. If you retire at 50, your Robinhood account is the only penalty-free income source for those 9+ years. As your target date approaches, consider gradually shifting more monthly contributions there. This is where your FIRE bridge lives." },
            { title: "Consolidate Your 4 Old 401ks", color: "#8A9DC9", body: "Four separate 401k accounts mean four sets of fees and four dashboards to track. Roll three into your active Human Interest 401k or into a Vanguard rollover IRA. Do not roll into a traditional IRA if you're planning a backdoor Roth — that triggers the pro-rata rule. Consolidating simplifies management and likely reduces total fees." },
            { title: "Roth Conversion Window Is Coming", color: "#A0C0FF", body: "When your husband retires in roughly five years, household income drops significantly. That lower-bracket window is your prime opportunity to convert traditional IRA and 401k balances to Roth — paying tax now at a reduced rate so all future growth is tax-free. This is especially valuable given you could have 40+ years of growth ahead of you. Plan ahead with your CPA to be ready the year his income stops." },
          ].map((note) => (
            <div key={note.title} style={{ display: "flex", gap: 13, marginBottom: 17, paddingBottom: 17, borderBottom: "1px solid rgba(201,168,76,0.06)" }}>
              <div style={{ width: 3, background: note.color, borderRadius: 4, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#EDE0C4", marginBottom: 5 }}>{note.title}</div>
                <div style={{ fontSize: 13, color: "#7A6A50", lineHeight: 1.75 }}>{note.body}</div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 9, color: "#2A2018", fontFamily: "monospace", marginTop: 4 }}>
            For planning purposes only. Consult a fee-only fiduciary advisor and CPA. FIRE projections assume consistent returns — actual results will vary.
          </div>
        </div>
      )}
    </div>
  );
}
