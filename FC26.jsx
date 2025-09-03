import { memo, useMemo, useState, useEffect, useCallback } from "react";
import { Zap, Star } from "lucide-react";

// ================================
// FC26 — UI Sandbox (Single file)
// ================================
// Ajustes solicitados y fixes:
// - Unificación del estilo de estrellas (header y Attributes → Others) con 5 fijas:
//   3 rellenas por defecto y 2 solo contorno; al subir con + se rellenan 4ª y 5ª.
// - Others (Skill/WF) escalables por estrellas, sin barra numérica.
// - Eliminado cualquier dependencia de componentes no definidos (Header, SpecializationsView, etc. definidos aquí).

// ---------- Utils ----------
const deepClone = typeof structuredClone === "function"
  ? (v) => structuredClone(v)
  : (v) => JSON.parse(JSON.stringify(v));

function clampLvl(n) { return Math.max(1, Math.min(40, Number(n) || 1)); }
function hexToRgb(hex){ hex = hex.replace('#',''); if(hex.length===3){hex = hex.split('').map(c=>c+c).join('');} const num=parseInt(hex,16); return {r:(num>>16)&255,g:(num>>8)&255,b:(num)&255}; }
function getUnlockedSlots(lvl) { return [lvl >= 1, lvl >= 10, lvl >= 20, lvl >= 40]; }
function pointCost(v) { if (v <= 29) return 0; if (v <= 39) return 1; if (v <= 49) return 2; if (v <= 59) return 3; if (v <= 69) return 4; if (v <= 79) return 5; if (v <= 89) return 6; return 7; }
function rangeCost(from, to) { if (to <= from) return 0; let c = 0; for (let v = from + 1; v <= to; v++) c += pointCost(v); return c; }

// ---------- Data ----------
const ROLE_STYLES = {
  Forward:     { accent: "#00E5FF", glow: "rgba(0,229,255,0.2)" },
  Midfielder:  { accent: "#22C55E", glow: "rgba(34,197,94,0.2)" },
  Defender:    { accent: "#EAB308", glow: "rgba(234,179,8,0.2)" },
  Goalkeeper:  { accent: "#A855F7", glow: "rgba(168,85,247,0.2)" },
};

const ARCHETYPES = {
  Forward: {
    items: [
      { name: "Magician", desc: "Combining remarkable control, dribbling, and vision, this player creates chances out of very little, both for themselves and teammates.", playstyles: ["Technical", "Finesse Shot"], skills: 5, weakFoot: 5 },
      { name: "Finisher", desc: "Possesses a killer instinct in front of goal - a beast when one-on-one with the keeper.", playstyles: ["Low Driven Shot", "First Touch"], skills: 5, weakFoot: 5 },
      { name: "Target", desc: "Classic hold-up player that harnesses their physicality in duels both on the ground and in the air.", playstyles: ["Power Shot", "Precision Header"], skills: 5, weakFoot: 5 },
    ],
  },
  Midfielder: {
    items: [
      { name: "Recycler", desc: "This passing machine is critical to taking the ball from the backline and giving it to your most dangerous attackers.", playstyles: ["Press Proven", "Intercept"], skills: 4, weakFoot: 5 },
      { name: "Maestro", desc: "Orchestrating the game from deep, this player can unlock a defence to create chances for their forwards.", playstyles: ["Tiki Taka", "Pinged Pass"], skills: 5, weakFoot: 5 },
      { name: "Creator", desc: "Capable of delivering precise and incisive passes that can dismantle even the most organised backlines.", playstyles: ["Incisive Pass", "Inventive Pass"], skills: 4, weakFoot: 5 },
      { name: "Spark", desc: "Excels in short, explosive bursts - getting to the byline and pulling back tantalising crosses for teammates.", playstyles: ["Rapid", "Trickster"], skills: 5, weakFoot: 5 },
    ],
  },
  Defender: {
    items: [
      { name: "Progressor", desc: "A modern centre-back capable of stepping out of the backline to start attacks with progressive passing.", playstyles: ["Long Ball Pass", "Anticipate"], skills: 3, weakFoot: 3 },
      { name: "Boss", desc: "Wins the ball with imposing physicality. Willing to put everything on the line for the team.", playstyles: ["Bruiser", "Aerial Fortress"], skills: 3, weakFoot: 3 },
      { name: "Engine", desc: "This player's incredible stamina allows them to maintain maximum effort throughout the match.", playstyles: ["Jockey", "Relentless"], skills: 3, weakFoot: 3 },
      { name: "Marauder", desc: "A defensive specialist whose pulsating pace means they're also comfortable and effective going forward.", playstyles: ["Whipped Pass", "Quick Step"], skills: 3, weakFoot: 3 },
    ],
  },
  Goalkeeper: {
    items: [
      { name: "Shot Stopper", desc: "Unphased when faced with an attacker one-on-one, can be relied upon to make difficult saves.", playstyles: ["Footwork", "Far Reach"], skills: 3, weakFoot: 3 },
      { name: "Sweeper Keeper", desc: "A modern-day keeper, comfortable with the ball at their feet, and with a high defensive line.", playstyles: ["Cross Claimer", "1v1 Close Down"], skills: 3, weakFoot: 3 },
    ],
  },
};

// Defaults con bloque Others
const CATS_BASE = [
  { id: "ball-control", title: "Ball Control", stats: [["Agility", 75],["Balance", 75],["Reactions", 75],["Ball Control", 75],["Dribbling", 75],["Composure", 75]] },
  { id: "pace", title: "Pace", stats: [["Acceleration", 75, true],["Sprint Speed", 70, true]] },
  { id: "scoring", title: "Scoring", stats: [["Att. Position", 75],["Finishing", 75],["Shot Power", 75],["Long Shots", 65],["Volleys", 75],["Penalties", 75]] },
  { id: "passing", title: "Passing", stats: [["Vision", 75],["Crossing", 65],["FK Acc.", 65],["Short Pass", 75],["Long Pass", 50],["Curve", 75]] },
  { id: "physical", title: "Physical", stats: [["Jumping", 40],["Strength", 65],["Stamina", 75],["Aggression", 50]] },
  { id: "defending", title: "Defending", stats: [["Interceptions", 50],["Heading Acc.", 65],["Def. Aware", 40],["Stand Tackle", 40],["Slide Tackle", 40]] },
  { id: "others", title: "Others", stats: [["Skill", 75, false, 3],["WF", 75, false, 3]] },
];

const BASE_DATA = CATS_BASE.map((c) => ({
  ...c,
  stats: c.stats.map(([name, val, keyAttr, stars]) => ({ name, val, keyAttr: !!keyAttr, stars: stars || 0 })),
}));

const AP_BY_LEVEL = [40,7,7,7,15,8,8,8,8,20,10,10,10,10,20,10,10,10,10,35,15,15,15,15,30,20,20,20,20,50,20,20,20,20,30,20,20,20,20,40];

// Mapeo estrellas -> valor representativo (para coste/color). Index 1..5
const STAR_VALS = [0, 40, 60, 75, 85, 95];

// ===== Helper: Stars (5 fijas) =====
const Stars5 = memo(function Stars5({ value, size = "size-5", gap = "gap-0.5", filledClass = "text-amber-300", emptyClass = "text-white/35" }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <div className={`flex items-center ${gap}`} aria-label={`${v} de 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < v;
        return (
          <Star
            key={i}
            className={`${size} ${filled ? filledClass : emptyClass}`}
            {...(filled ? { fill: 'currentColor' } : { fill: 'none' })}
            strokeWidth={1.5}
          />
        );
      })}
    </div>
  );
});

// ================= App =================
function FC26() {
  const [active, setActive] = useState("archetypes");
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [lvl, _setLvl] = useState(1);
  const [data, setData] = useState(() => deepClone(BASE_DATA));

  const setLvl = useCallback((v) => _setLvl(clampLvl(v)), []);
  const apTotal = useMemo(() => AP_BY_LEVEL.slice(0, lvl).reduce((a,b)=>a+b,0), [lvl]);
  const [apSpent, setApSpent] = useState(0);
  const apAvail = Math.max(0, apTotal - apSpent);
  const [specializationPS, setSpecializationPS] = useState(null);

  const onNav = useCallback((id) => setActive(id), []);
  const onArchetypeSelect = useCallback((v) => {
    setSelectedArchetype(v);
    setData(deepClone(BASE_DATA)); // defaults comunes por ahora
    setApSpent(0);
  }, []);
  const onSpendDelta = useCallback((delta) => setApSpent((val) => Math.max(0, val + delta)), []);
  const onSetSpentAbs = useCallback((val) => setApSpent(Math.max(0, val)), []);

  return (
    <div className="min-h-screen bg-[#0d1115] text-white">
      <Header
        lvl={lvl}
        setLvl={setLvl}
        apAvail={apAvail}
        apTotal={apTotal}
        active={active}
        onNav={onNav}
        selectedArchetype={selectedArchetype}
      />

      {active === "archetypes" && (
        <ArchetypesView selected={selectedArchetype} onSelect={onArchetypeSelect} />
      )}

      {active === "attributes" && (
        <AttributesView data={data} setData={setData} lvl={lvl} apAvail={apAvail} onSpend={onSpendDelta} onSetSpent={onSetSpentAbs} />
      )}

      {active === "playstyles" && (
        <PlaystylesView lvl={lvl} specializationPS={specializationPS} selectedArchetype={selectedArchetype} />
      )}

      {active === "specializations" && (
        <SpecializationsView value={specializationPS} onChange={setSpecializationPS} />
      )}

      {active === "body" && <BodyView />}

      <DevTests />
    </div>
  );
}

// -------------- Header --------------
const NavLink = memo(function NavLink({ id, active, onNav, children }) {
  const handle = useCallback(() => onNav(id), [onNav, id]);
  return (
    <button onClick={handle} className={`px-2 py-1 rounded-md border border-transparent hover:border-white/15 ${active === id ? "text-white font-semibold bg-white/5" : "text-white/80"}`}>{children}</button>
  );
});

const Badge = memo(function Badge({ label, icon }) {
  return (
    <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center gap-1.5">
      {icon}
      <span className="[&_b]:text-amber-300 [&_b]:font-bold">{label}</span>
    </div>
  );
});

const HeaderStars = memo(function HeaderStars({ selectedArchetype }) {
  if (!selectedArchetype) return null;
  const item = selectedArchetype.item || {};
  const skill = typeof item.skills === 'number' ? item.skills : 3;
  const weak  = typeof item.weakFoot === 'number' ? item.weakFoot : 3;

  return (
    <div className="flex items-center gap-2">
      <div className="px-2 py-1 rounded-md border border-white/10 bg-white/5 text-xs flex items-center gap-1" title={`Skill Moves: ${skill}/5`}>
        <span className="text-white/70">Skill</span>
        <Stars5 value={skill} />
      </div>
      <div className="px-2 py-1 rounded-md border border-white/10 bg-white/5 text-xs flex items-center gap-1" title={`Weak Foot: ${weak}/5`}>
        <span className="text-white/70">WF</span>
        <Stars5 value={weak} />
      </div>
    </div>
  );
});

function Header({ lvl, setLvl, apAvail, apTotal, active, onNav, selectedArchetype }) {
  const accent = selectedArchetype ? (ROLE_STYLES[selectedArchetype.role]?.accent) : null;
  const onLvlRange = useCallback((e) => setLvl(Number(e.target.value)), [setLvl]);
  const onLvlNum   = useCallback((e) => setLvl(Number(e.target.value)), [setLvl]);
  const openArchetypes = useCallback(() => onNav('archetypes'), [onNav]);

  const Title = useMemo(() => (
    <button onClick={openArchetypes} className="text-left focus:outline-none" title="Open Archetypes">
      {selectedArchetype ? (
        <div className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: accent }}>
          {selectedArchetype.role} • {selectedArchetype.item.name}
        </div>
      ) : (
        <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Archetypes</div>
      )}
    </button>
  ), [selectedArchetype, accent, openArchetypes]);

  return (
    <header className={`sticky top-0 z-20 backdrop-blur border-b border-white/10 bg-[#0d1115]/80`}>
      <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-6">
          {Title}
          <HeaderStars selectedArchetype={selectedArchetype} />
        </div>
        <div className="h-px bg-white/10" />
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-2 text-sm mr-auto">
            <NavLink id="attributes" active={active} onNav={onNav}>Attributes</NavLink>
            <NavLink id="playstyles" active={active} onNav={onNav}>PlayStyles</NavLink>
            <NavLink id="specializations" active={active} onNav={onNav}>Specializations</NavLink>
            <NavLink id="body" active={active} onNav={onNav}>Body</NavLink>
          </nav>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <label className="text-white/70 text-xs">LVL</label>
              <input type="range" min={1} max={40} value={lvl} onChange={onLvlRange} className="w-24" style={{ accentColor: accent || "#6b7280" }} />
              <input type="number" min={1} max={40} value={lvl} onChange={onLvlNum} className="w-14 px-1 py-0.5 text-center rounded bg-white/5 border border-white/15 text-xs" />
            </div>
            <Badge icon={<Star className="size-3" />} label={<span><b className="text-amber-300">AP</b> {apAvail} <span className="opacity-60">/ {apTotal}</span></span>} />
          </div>
        </div>
      </div>
    </header>
  );
}

// -------- Archetypes View --------
const ArchetypesView = memo(function ArchetypesView({ selected, onSelect }) {
  const entries = useMemo(() => Object.entries(ARCHETYPES || {}), []);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-12">
      <div className="mb-4 text-xs text-white/60">Haz clic en un bloque para seleccionar un arquetipo.</div>
      {entries.map(([role, cfg]) => {
        const items = Array.isArray(cfg?.items) ? cfg.items : [];
        const styleCfg = ROLE_STYLES[role] || { accent: "#6b7280", glow: "rgba(255,255,255,0.06)" };
        const { accent } = styleCfg;
        const { r,g,b } = hexToRgb(accent);
        return (
          <div key={role}>
            <h2 className="text-3xl font-bold mb-6" style={{ color: accent }}>{role}</h2>
            <div className="space-y-4 relative">
              {items.map((a) => {
                const isSel = selected?.role === role && selected?.item?.name === a.name;
                const ringStyle = isSel ? { boxShadow: `0 0 0 2px ${accent}` } : {};
                const handleSelect = () => onSelect({ role, item: a });
                const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect({ role, item: a }); } };
                return (
                  <div
                    key={a.name}
                    role="button"
                    tabIndex={0}
                    onClick={handleSelect}
                    onKeyDown={onKey}
                    className={`cursor-pointer select-none w-full rounded-xl p-4 flex flex-col md:flex-row gap-4 text-left transition-all`}
                    style={{
                      border: `1px solid rgba(${r},${g},${b},0.55)`,
                      background: `radial-gradient(60% 100% at 10% 0%, rgba(${r},${g},${b},0.22) 0%, rgba(${r},${g},${b},0.08) 40%, rgba(255,255,255,0.02) 100%)`,
                      boxShadow: `inset 0 0 0 1px rgba(${r},${g},${b},0.28), 0 10px 30px rgba(${r},${g},${b},0.05)`,
                      ...ringStyle
                    }}
                  >
                    <div className="font-semibold text-lg min-w-[120px]">{a.name}</div>
                    <div className="text-sm text-white/80 flex-1">{a.desc}</div>
                    <div className="text-sm font-medium min-w-[220px] flex flex-col items-end justify-center">
                      <div className="text-xs text-white/70">PlayStyles</div>
                      <div className="flex gap-2">{(Array.isArray(a.playstyles)?a.playstyles:[]).map((ps) => <span key={ps}>{ps}</span>)}</div>
                      <div className="mt-1 text-xs flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-white/70">Skill</span>
                          <Stars5 value={a.skills} />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-white/70">WF</span>
                          <Stars5 value={a.weakFoot} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// ------- Attributes View -------
function AttributesView({ data, setData, lvl, apAvail, onSpend, onSetSpent }) {
  const [sel, setSel] = useState({ cat: 0, idx: 0 });
  const selected = data[sel.cat]?.stats[sel.idx];

  const inc = useCallback(() => {
    if (!selected) return;
    // Atributos por estrellas: subir estrella -> set valor mapeado y coste según ese valor
    if ((selected.stars || 0) > 0) {
      setData((prev) => {
        const cp = deepClone(prev);
        const s = cp[sel.cat].stats[sel.idx];
        const currStars = Math.max(1, Math.min(5, s.stars || 1));
        if (currStars >= 5) return cp;
        const nextStars = currStars + 1;
        const nextVal = STAR_VALS[nextStars];
        const cost = pointCost(nextVal);
        if (apAvail < cost) return cp;
        s.stars = nextStars;
        s.val = nextVal;
        onSpend(cost);
        return cp;
      });
      return;
    }
    // Numérico normal +1
    const next = Math.min(99, selected.val + 1);
    const cost = pointCost(next);
    if (apAvail < cost) return;
    setData((prev)=>{ const cp=deepClone(prev); cp[sel.cat].stats[sel.idx].val=next; return cp; });
    onSpend(cost);
  }, [selected, apAvail, onSpend, sel, setData]);

  const dec = useCallback(() => {
    if (!selected) return;
    if ((selected.stars || 0) > 0) {
      setData((prev) => {
        const cp = deepClone(prev);
        const s = cp[sel.cat].stats[sel.idx];
        const currStars = Math.max(1, Math.min(5, s.stars || 1));
        if (currStars <= 1) return cp;
        const refund = pointCost(s.val);
        s.stars = currStars - 1;
        s.val = STAR_VALS[s.stars];
        onSpend(-refund);
        return cp;
      });
      return;
    }
    if (selected.val <= 1) return;
    const refund = pointCost(selected.val);
    setData((prev)=>{ const cp=deepClone(prev); cp[sel.cat].stats[sel.idx].val-=1; return cp; });
    onSpend(-refund);
  }, [selected, onSpend, sel, setData]);

  const onSelectIdx = useCallback((col, idx) => setSel({ cat: col, idx }), []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
      {data.slice(0, 4).map((cat,i)=>(<Column key={cat.id} cat={cat} colIndex={i} onSelect={onSelectIdx} sel={sel}/>))}
      <DetailsPanel stat={selected} onPlus={inc} onMinus={dec}/>
      <div className="md:col-span-2 xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.slice(4).map((cat,i)=>(<Column key={cat.id} cat={cat} colIndex={i+4} onSelect={onSelectIdx} sel={sel}/>))}
      </div>
    </main>
  );
}

const Column = memo(function Column({ cat, colIndex, onSelect, sel }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-sm font-semibold tracking-wide uppercase text-white/70 mb-2">{cat.title}</h3>
      <div className="space-y-3">
        {cat.stats.map((s, idx) => (
          <Row key={s.name} name={s.name} value={s.val} stars={s.stars} active={sel.cat===colIndex && sel.idx===idx} onClick={()=>onSelect(colIndex,idx)}/>
        ))}
      </div>
    </section>
  );
});

const Row = memo(function Row({ name, value, stars = 0, active, onClick }) {
  const isStars = (stars || 0) > 0;
  const getBarColor = (v) => {
    if (v <= 39) return 'bg-red-500';
    if (v <= 59) return 'bg-orange-400';
    if (v <= 79) return 'bg-yellow-300';
    if (v <= 89) return 'bg-green-400';
    return 'bg-emerald-300';
  };
  const currentVal = isStars ? STAR_VALS[Math.max(1, Math.min(5, stars))] : value;
  const pct = isStars ? (Math.max(1, Math.min(5, stars)) / 5) * 100 : Math.min(100, value);
  return (
    <button onClick={onClick} className={`w-full text-left group ${active?"":"opacity-90"}`}>
      <div className="flex items-center justify-between text-[13px]">
        <span className={`font-medium ${active?"text-white":"text-white/80"}`}>{name}</span>
        {isStars ? (
          <Stars5 value={stars} />
        ) : (
          <span className="tabular-nums text-white/80">{value}</span>
        )}
      </div>
      {!isStars && (
        <div className="mt-1 h-1.5 rounded-full overflow-hidden bg-white/10">
          <div className={`${getBarColor(currentVal)} h-full`} style={{width:`${pct}%`}}/>
        </div>
      )}
      {active && <div className="mt-1 text-[10px] text-emerald-300/80">Selected</div>}
    </button>
  );
});

const DetailsPanel = memo(function DetailsPanel({ stat, onPlus, onMinus }) {
  if (!stat) return null;
  const playstyles = RELATED_PS[stat.name] || [];
  const isStars = (stat.stars || 0) > 0;
  const nextCost = pointCost(Math.min(99, isStars ? STAR_VALS[Math.min(5, (stat.stars || 1) + 1)] : stat.val + 1));

  return (
    <aside className="xl:row-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h4 className="text-white/80 text-xs font-semibold uppercase mb-2">{stat.name.toUpperCase()} {stat.name.includes("Speed") ? "(SPD)" : ""}</h4>
      <div className="flex items-center gap-3 mb-3">
        <button onClick={onMinus} className="px-3 py-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10" aria-label="Decrease">–</button>
        <div className="leading-none min-w-[3ch] text-center">
          {isStars ? (
            <Stars5 value={stat.stars} size="size-8" />
          ) : (
            <div className="text-6xl font-bold tabular-nums">{stat.val}</div>
          )}
        </div>
        <button onClick={onPlus} className="px-3 py-2 rounded-full bg-gradient-to-b from-[#6ad0ff] to-[#5aa3ff] text-[#07131d] font-semibold text-sm shadow-md border border-white/20" aria-label="Increase">+</button>
      </div>
      <div className="text-xs text-white/70 mb-2">Coste actual: <b className="text-amber-300">AP</b> {nextCost}</div>
      <p className="text-xs text-white/60 mb-4">Descripción placeholder del atributo seleccionado.</p>
      <div className="text-xs text-white/70 font-semibold uppercase mb-2">Related PlayStyles</div>
      <div className="grid grid-cols-2 gap-2">
        {playstyles.length ? playstyles.map((p) => <PlayStyle key={p} name={p} />) : <span className="text-xs text-white/50">No related playstyles</span>}
      </div>
    </aside>
  );
});

const PlayStyle = memo(function PlayStyle({ name }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 flex items-center gap-2">
      <Zap className="size-4 opacity-80" />
      <span className="text-xs">{name}</span>
    </div>
  );
});

// ------- Playstyles View (simplificado) -------
const RELATED_PS = {
  "Sprint Speed": ["Rapid", "Quick Step"],
  "Acceleration": ["Quick Step"],
  "Finishing": ["Finesse Shot", "Power Shot"],
  "Curve": ["Technical"],
  "Vision": ["Pinged Pass"],
};

const PlaystylesView = memo(function PlaystylesView({ lvl, specializationPS, selectedArchetype }) {
  const signature = useMemo(() => {
    const arr = Array.isArray(selectedArchetype?.item?.playstyles) ? selectedArchetype.item.playstyles : ["Finesse Shot", "Technical"];
    return arr.map((n, i) => ({ id: `sig-${i}`, name: n, desc: `${n} signature style.` }));
  }, [selectedArchetype]);

  const unlockFlags = getUnlockedSlots(lvl);
  const unlockSlots = useMemo(() => ([
    { id: "slot-1", minLvl: 1,  unlocked: unlockFlags[0] },
    { id: "slot-2", minLvl: 10, unlocked: unlockFlags[1] },
    { id: "slot-3", minLvl: 20, unlocked: unlockFlags[2] },
    { id: "slot-4", minLvl: 40, unlocked: unlockFlags[3] },
  ]), [unlockFlags]);

  const [selected, setSelected] = useState(signature[0]);
  useEffect(() => { setSelected(signature[0]); }, [signature]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
      {!selectedArchetype && (
        <div className="xl:col-span-3 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-4 text-sm">
          Selecciona un <b>Archetype</b> primero para ver los Signature PlayStyles adecuados.
        </div>
      )}

      <section className="xl:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-white/70 mb-2">Signature</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {signature.map((ps) => (
            <PlayStyleCard key={ps.id} ps={ps} onClick={() => setSelected(ps)} />
          ))}
        </div>

        <h3 className="text-sm font-semibold tracking-wide uppercase text-white/70 mt-2 mb-2">Specialización</h3>
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4">
          {specializationPS ? (
            <PlayStyleRow name={specializationPS} onClick={() => setSelected({ id: "spec", name: specializationPS, desc: "PlayStyle elegido en Specializations." })} />
          ) : (
            <div className="text-xs text-white/50">Selecciona una especialización en la pestaña <b>Specializations</b>.</div>
          )}
        </div>

        <h3 className="text-sm font-semibold tracking-wide uppercase text-white/70 mt-6 mb-2">PlayStyles</h3>
        <div className="grid grid-cols-4 gap-4">
          {unlockSlots.map((slot) => (
            <button
              key={slot.id}
              disabled={!slot.unlocked}
              onClick={() => setSelected({ id: slot.id, name: slot.unlocked ? "Empty Slot" : `Locked`, desc: slot.unlocked ? "Elige un PlayStyle desbloqueado." : `Disponible al LVL ${slot.minLvl}` })}
              className={`aspect-square rounded-2xl border flex items-center justify-center text-xs ${slot.unlocked ? "border-white/15 bg-white/5 hover:bg-white/10" : "border-white/10 bg-white/[0.02] text-white/40"}`}
              title={slot.unlocked ? "Empty slot" : `LVL ${slot.minLvl}`}
            >
              {slot.unlocked ? <span className="text-2xl">＋</span> : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">🔒</span>
                  <span className="text-[10px]">LVL {slot.minLvl}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h4 className="text-white font-semibold text-lg mb-2 uppercase">{selected?.name}</h4>
        <p className="text-xs text-white/70 mb-4">{selected?.desc || "Selecciona un PlayStyle a la izquierda para ver los detalles."}</p>
        <div className="text-xs text-white/70 font-semibold uppercase mb-2">Related Attributes</div>
        <ul className="text-xs text-white/60 space-y-1">
          <li>Finishing</li>
          <li>Curve</li>
          <li>Shot Power</li>
        </ul>
      </aside>
    </div>
  );
});

const PlayStyleCard = memo(function PlayStyleCard({ ps, onClick }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,.06)_0%,rgba(255,255,255,.02)_100%)] p-3 text-left hover:bg-white/10">
      <div className="h-24 rounded-xl bg-white/5 mb-2 flex items-center justify-center text-2xl">◆</div>
      <div className="text-sm font-medium">{ps.name}</div>
    </button>
  );
});

const PlayStyleRow = memo(function PlayStyleRow({ name, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 p-3 text-left">
      <div className="size-10 rounded-lg bg-white/10 flex items-center justify-center">◆</div>
      <div className="text-sm font-medium">{name}</div>
    </button>
  );
});

// -------- Specializations View --------
const SPEC_OPTIONS = [
  { id: "spec-finesse", name: "Finesse Shot" },
  { id: "spec-power",   name: "Power Shot" },
  { id: "spec-technical", name: "Technical" },
];

const SpecializationsView = memo(function SpecializationsView({ value, onChange }) {
  const onPick = useCallback((name) => onChange(name), [onChange]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h2 className="text-xl font-semibold mb-4">Specializations</h2>
      <p className="text-white/70 text-sm mb-4">Elige 1 entre 3 especialidades. La selección aparecerá en la sección <b>Specialización</b> dentro de PlayStyles.</p>
      <div className="grid sm:grid-cols-3 gap-4">
        {SPEC_OPTIONS.map((o) => (
          <button key={o.id} onClick={() => onPick(o.name)} className={`rounded-xl border p-4 text-left ${value === o.name ? "bg-white/10 border-white/30" : "bg-white/5 border-white/15 hover:bg-white/10"}`}>
            <div className="h-20 rounded-lg bg-white/10 mb-2 flex items-center justify-center text-2xl">◆</div>
            <div className="text-sm font-medium">{o.name}</div>
            {value === o.name && <div className="text-[10px] mt-1 text-emerald-300">Seleccionado</div>}
          </button>
        ))}
      </div>
    </div>
  );
});

// -------------- Body --------------
const BodyView = memo(function BodyView() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h2 className="text-xl font-semibold mb-4">Body</h2>
      <p className="text-white/70 text-sm">Altura y peso modificarán atributos clave en la ventana de Atributos. (placeholder)</p>
    </div>
  );
});

// -------------- Dev Tests --------------
function DevTests() {
  useEffect(() => {
    try {
      // Tests existentes
      console.assert(pointCost(29) === 0, 'pointCost(29)=0');
      console.assert(pointCost(39) === 1, 'pointCost(39)=1');
      console.assert(pointCost(49) === 2, 'pointCost(49)=2');
      console.assert(pointCost(59) === 3, 'pointCost(59)=3');
      console.assert(pointCost(69) === 4, 'pointCost(69)=4');
      console.assert(pointCost(79) === 5, 'pointCost(79)=5');
      console.assert(pointCost(89) === 6, 'pointCost(89)=6');
      console.assert(pointCost(95) === 7, 'pointCost(95)=7');

      console.assert(rangeCost(75, 76) === pointCost(76), 'range single');
      console.assert(rangeCost(74, 76) === pointCost(75) + pointCost(76), 'range two');
      console.assert(rangeCost(80, 80) === 0, 'range none');

      const f1 = getUnlockedSlots(1);  console.assert(f1[0] && !f1[1] && !f1[2] && !f1[3], 'flags lvl1');
      const f10= getUnlockedSlots(10); console.assert(f10[0] && f10[1] && !f10[2] && !f10[3], 'flags lvl10');
      const f20= getUnlockedSlots(20); console.assert(f20[2] && f20[0] && f20[1] && !f20[3], 'flags lvl20');
      const f40= getUnlockedSlots(40); console.assert(f40.every(Boolean), 'flags lvl40');

      // Nuevos tests mínimos (sin romper existentes)
      console.assert(STAR_VALS[3] === 75 && STAR_VALS[4] === 85 && STAR_VALS[5] === 95, 'STAR_VALS mapping');
      const others = BASE_DATA.find(c=>c.id==='others');
      console.assert(others && others.stats.length===2, 'Others block exists');
      console.assert(others.stats[0].stars===3 && others.stats[0].val===75, 'Skill default 3★ => 75');
      console.assert(typeof ARCHETYPES === 'object' && Object.keys(ARCHETYPES).length>=1, 'Archetypes defined');
      console.assert(Array.isArray(SPEC_OPTIONS) && SPEC_OPTIONS.length===3, 'SPEC_OPTIONS length');
    } catch (err) { console.error('DevTests failed:', err); }
  }, []);
  return null;
}

export default FC26;
