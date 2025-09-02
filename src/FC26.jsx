import { useMemo, useState, useEffect, useRef } from "react";
import { Zap, Star } from "lucide-react";

// ================================
// FC26 — UI Sandbox (Single file)
// ================================
// - Header en dos filas
// - Archetypes como cabecera madre que cambia a Role • Name
// - Estrellas (Skill / WF) en el header solo cuando hay arquetipo
// - Slider de nivel empieza en 1
// - Se elimina el bloque duplicado de Skills/Foot en Attributes

// ---------- Utils ----------
const clone = (v) => (typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
function clampLvl(n) { return Math.max(1, Math.min(40, Number(n) || 1)); }
function hexToRgb(hex){ hex = hex.replace('#',''); if(hex.length===3){hex = hex.split('').map(c=>c+c).join('');} const num=parseInt(hex,16); return {r:(num>>16)&255,g:(num>>8)&255,b:num&255}; }
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

// Stars: Forwards (5/5 todos). Midfielders: Maestro/Spark 5/5, Recycler/Creator 4/5.
// Defenders y Goalkeepers: base 3/3 hasta confirmar.
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

// Attributes: base values + related PS
const RELATED_PS = {
  "Sprint Speed": ["Rapid", "Quick Step"],
  "Acceleration": ["Quick Step"],
  "Finishing": ["Finesse Shot", "Power Shot"],
  "Curve": ["Technical"],
  "Vision": ["Pinged Pass"],
};

const CATS_BASE = [
  { id: "ball-control", title: "Ball Control", stats: [["Agility", 75],["Balance", 75],["Reactions", 75],["Ball Control", 75],["Dribbling", 75],["Composure", 75]] },
  { id: "scoring", title: "Scoring", stats: [["Att. Position", 75],["Finishing", 76],["Shot Power", 75],["Long Shots", 65],["Volleys", 75],["Penalties", 75]] },
  { id: "passing", title: "Passing", stats: [["Vision", 75],["Crossing", 65],["FK Acc.", 65],["Short Pass", 75],["Long Pass", 50],["Curve", 75]] },
  { id: "defending", title: "Defending", stats: [["Interceptions", 50],["Heading Acc.", 65],["Def. Aware", 40],["Stand Tackle", 40],["Slide Tackle", 40]] },
  { id: "pace", title: "Pace", stats: [["Acceleration", 85, true],["Sprint Speed", 84, true]] },
  { id: "physical", title: "Physical", stats: [["Jumping", 40],["Strength", 65],["Stamina", 75],["Aggression", 50]] },
];

// ===== Helper: Stars (5 fijas, llenas + vacías) =====
function Stars5({ value, size = "size-4", gap = "gap-0.5", filledClass = "text-amber-300", emptyClass = "text-white/35" }) {
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
}

// ================= App =================
function FC26() {
  const [active, setActive] = useState("archetypes");
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [lvl, setLvl] = useState(1);

  const AP_BY_LEVEL = [40,7,7,7,15,8,8,8,8,20,10,10,10,10,20,10,10,10,10,35,15,15,15,15,30,20,20,20,20,50,20,20,20,20,30,20,20,20,20,40];
  const apTotal = useMemo(()=> AP_BY_LEVEL.slice(0, lvl).reduce((a,b)=>a+b,0), [lvl]);
  const [apSpent, setApSpent] = useState(0);
  const apAvail = Math.max(0, apTotal - apSpent);
  const [specializationPS, setSpecializationPS] = useState(null);

  return (
    <div className="min-h-screen bg-[#0d1115] text-white">
      <Header
        lvl={lvl}
        setLvl={(v)=>setLvl(clampLvl(v))}
        apAvail={apAvail}
        apTotal={apTotal}
        active={active}
        onNav={setActive}
        selectedArchetype={selectedArchetype}
      />

      {active === "archetypes" && (
        <ArchetypesView selected={selectedArchetype} onSelect={(v)=>{ setSelectedArchetype(v); }} />
      )}

      {active === "attributes" && (
        <AttributesView lvl={lvl} apAvail={apAvail} onSpend={(delta)=> setApSpent((v)=> Math.max(0, v + delta))} />
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
function Header({ lvl, setLvl, apAvail, apTotal, active, onNav, selectedArchetype }) {
  const Link = ({ id, children }) => (
    <button onClick={() => onNav(id)} className={`px-2 py-1 rounded-md border border-transparent hover:border-white/15 ${active === id ? "text-white font-semibold bg-white/5" : "text-white/80"}`}>{children}</button>
  );

  const accent = selectedArchetype ? (ROLE_STYLES[selectedArchetype.role]?.accent) : null;

  const Title = () => (
    <button onClick={() => onNav('archetypes')} className="text-left focus:outline-none" title="Open Archetypes">
      {selectedArchetype ? (
        <div className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: accent }}>
          {selectedArchetype.role} • {selectedArchetype.item.name}
        </div>
      ) : (
        <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Archetypes</div>
      )}
    </button>
  );

  return (
    <header className={`sticky top-0 z-20 backdrop-blur border-b border-white/10 bg-[#0d1115]/80`}>
      <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-3">
        {/* Fila 1: Título + estrellas a la derecha (si hay arquetipo) */}
        <div className="flex items-center justify-between gap-6">
          <Title />
          <HeaderStars selectedArchetype={selectedArchetype} />
        </div>

        <div className="h-px bg-white/10" />

        {/* Fila 2: Tabs + LVL/AP */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-2 text-sm mr-auto">
            <Link id="attributes">Attributes</Link>
            <Link id="playstyles">PlayStyles</Link>
            <Link id="specializations">Specializations</Link>
            <Link id="body">Body</Link>
          </nav>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <label className="text-white/70 text-xs">LVL</label>
              <input type="range" min={1} max={40} value={lvl} onChange={(e)=>setLvl(Number(e.target.value))} className="w-24" style={{ accentColor: accent || "#6b7280" }} />
              <input type="number" min={1} max={40} value={lvl} onChange={(e)=>setLvl(Number(e.target.value))} className="w-14 px-1 py-0.5 text-center rounded bg-white/5 border border-white/15 text-xs" />
            </div>
            <Badge icon={<Star className="size-3" />} label={<span><b className="text-amber-300">AP</b> {apAvail} <span className="opacity-60">/ {apTotal}</span></span>} />
          </div>
        </div>
      </div>
    </header>
  );
}

function Badge({ label, icon }) {
  return (
    <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center gap-1.5">
      {icon}
      <span className="[&_b]:text-amber-300 [&_b]:font-bold">{label}</span>
    </div>
  );
}

// ===== HeaderStars con 5 estrellas (llenas + vacías) =====
function HeaderStars({ selectedArchetype }) {
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
}

// -------- Archetypes View --------
function ArchetypesView({ selected, onSelect }) {
  const entries = Object.entries(ARCHETYPES || {});
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
                return (
                  <div
                    key={a.name}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect({ role, item: a })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect({ role, item: a }); } }}
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
                      {/* Estrellas con vacías: Skill y WF */}
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
}

// ------- Attributes View -------
function AttributesView({ lvl, apAvail, onSpend }) {
  const [data, setData] = useState(() => CATS_BASE.map((c) => ({ ...c, stats: c.stats.map(([name, val, keyAttr, stars]) => ({ name, val, keyAttr: !!keyAttr, stars: stars || 0 })) })) );
  const baseData = useRef(null);
  useEffect(() => { if (!baseData.current) baseData.current = clone(data); }, []);

  const defaultSel = useMemo(() => ({ cat: 4, idx: 1 }), []);
  const [sel, setSel] = useState(defaultSel);
  const selected = data[sel.cat]?.stats[sel.idx];

  const inc = () => {
    if (!selected) return;
    const next = Math.min(99, selected.val + 1);
    const cost = pointCost(next);
    if (apAvail < cost) return;
    setData((prev) => { const cp = clone(prev); const s = cp[sel.cat].stats[sel.idx]; s.val = next; return cp; });
    onSpend(cost);
  };
  const dec = () => {
    if (!selected) return;
    if (selected.val <= 1) return;
    const refund = pointCost(selected.val);
    setData((prev) => { const cp = clone(prev); const s = cp[sel.cat].stats[sel.idx]; s.val = s.val - 1; return cp; });
    onSpend(-refund);
  };

  const [buildName, setBuildName] = useState("");
  const [saved, setSaved] = useState({});
  useEffect(() => { try { setSaved(JSON.parse(localStorage.getItem("fc26_builds_v1")||"{}")); } catch { setSaved({}); } }, []);
  const BASE = useMemo(()=> CATS_BASE.map((c)=> ({...c, stats: c.stats.map(([n,v,k,s])=>({name:n,val:v,keyAttr:!!k,stars:s||0})) })), []);
  const recomputeSpent = (dataArr) => {
    let total = 0;
    for (let i=0;i<dataArr.length;i++) {
      for (let j=0;j<dataArr[i].stats.length;j++) {
        const cur = dataArr[i].stats[j].val;
        const base = BASE[i].stats[j].val;
        if (cur>base) total += rangeCost(base, cur);
      }
    }
    return total;
  };
  const saveCurrent = () => { if (!buildName.trim()) return; const all = { ...(saved||{}) }; all[buildName.trim()] = { data }; localStorage.setItem("fc26_builds_v1", JSON.stringify(all)); setSaved(all); };
  const loadSelected = (name) => { const b = saved?.[name]; if (!b) return; setData(b.data); onSpend(-999999); onSpend(recomputeSpent(b.data)); };
  const resetAll = () => { if (!window.confirm("¿Resetear atributos a los valores base?")) return; const fresh = CATS_BASE.map((c)=>({ ...c, stats: c.stats.map(([n,v,k,s])=>({name:n,val:v,keyAttr:!!k,stars:s||0})) })); setData(fresh); onSpend(-999999); onSpend(0); };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
      {data.slice(0, 4).map((cat, i) => (
        <Column key={cat.id} cat={cat} colIndex={i} onSelect={(idx) => setSel({ cat: i, idx })} sel={sel} />
      ))}

      <DetailsPanel stat={selected} onPlus={inc} onMinus={dec} />

      <div className="md:col-span-2 xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.slice(4).map((cat, j) => (
          <Column key={cat.id} cat={cat} colIndex={j + 4} onSelect={(idx) => setSel({ cat: j + 4, idx })} sel={sel} compact />
        ))}
      </div>

      {/* Eliminado Skills/Foot duplicado */}

      <section className="xl:col-span-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col lg:flex-row gap-3 items-start lg:items-center">
        <div className="text-sm font-semibold text-white/80">Builds</div>
        <input value={buildName} onChange={(e)=>setBuildName(e.target.value)} placeholder="Nombre de la build" className="px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-sm w-full lg:w-64" />
        <button onClick={saveCurrent} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-sm">Guardar</button>
        <select onChange={(e)=>loadSelected(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-sm w-full lg:w-64">
          <option value="">Cargar build…</option>
          {Object.keys(saved||{}).map((k)=> (<option key={k} value={k}>{k}</option>))}
        </select>
        <button onClick={resetAll} className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-400/30 text-red-200 text-sm ml-auto">Reset</button>
      </section>
    </main>
  );
}

function Column({ cat, colIndex, onSelect, sel, compact = false }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-sm font-semibold tracking-wide uppercase text-white/70 mb-2">{cat.title}</h3>
      <div className="space-y-3">
        {cat.stats.map((s, idx) => (
          <Row key={s.name} name={s.name} value={s.val} stars={s.stars} active={sel.cat === colIndex && sel.idx === idx} onClick={() => onSelect(idx)} keyAttr={s.keyAttr} compact={compact} />
        ))}
      </div>
    </section>
  );
}

function Row({ name, value, stars = 0, active, onClick, keyAttr }) {
  return (
    <button onClick={onClick} className={`w-full text-left group ${active ? "" : "opacity-90"}`}>
      <div className="flex items-center justify-between text-[13px]">
        <span className={`font-medium ${active ? "text-white" : "text-white/80"}`}>{name}</span>
        <span className="tabular-nums text-white/80">{stars ? "★".repeat(stars) : value}</span>
      </div>
      <div className={`mt-1 h-1.5 rounded-full overflow-hidden ${keyAttr ? "bg-emerald-600/20" : "bg-white/10"}`}>
        <div className={`${keyAttr ? "bg-emerald-400" : "bg-yellow-300"} h-full`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      {active && <div className="mt-1 text-[10px] text-emerald-300/80">Selected</div>}
    </button>
  );
}

function DetailsPanel({ stat, onPlus, onMinus }) {
  if (!stat) return null;
  const playstyles = RELATED_PS[stat.name] || [];
  return (
    <aside className="xl:row-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h4 className="text-white/80 text-xs font-semibold uppercase mb-2">{stat.name.toUpperCase()} {stat.name.includes("Speed") ? "(SPD)" : ""}</h4>
      <div className="flex items-center gap-3 mb-3">
        <button onClick={onMinus} className="px-3 py-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10">–</button>
        <div className="text-6xl font-bold tabular-nums leading-none min-w-[3ch] text-center">{stat.val}</div>
        <button onClick={onPlus} className="px-3 py-2 rounded-full bg-gradient-to-b from-[#6ad0ff] to-[#5aa3ff] text-[#07131d] font-semibold text-sm shadow-md border border-white/20">+</button>
      </div>
      <div className="text-xs text-white/70 mb-2">Coste actual: <b className="text-amber-300">AP</b> {pointCost(Math.min(99, stat.val+1))}</div>
      <p className="text-xs text-white/60 mb-4">Descripción placeholder del atributo seleccionado.</p>
      <div className="text-xs text-white/70 font-semibold uppercase mb-2">Related PlayStyles</div>
      <div className="grid grid-cols-2 gap-2">
        {playstyles.length ? playstyles.map((p) => <PlayStyle key={p} name={p} />) : <span className="text-xs text-white/50">No related playstyles</span>}
      </div>
    </aside>
  );
}

function PlayStyle({ name }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 flex items-center gap-2">
      <Zap className="size-4 opacity-80" />
      <span className="text-xs">{name}</span>
    </div>
  );
}

// ------- Playstyles View -------
function PlaystylesView({ lvl, specializationPS, selectedArchetype }) {
  const signature = useMemo(() => {
    const arr = Array.isArray(selectedArchetype?.item?.playstyles) ? selectedArchetype.item.playstyles : ["Finesse Shot", "Technical"];
    return arr.map((n, i) => ({ id: `sig-${i}`, name: n, desc: `${n} signature style.` }));
  }, [selectedArchetype]);

  const unlockFlags = getUnlockedSlots(lvl);
  const unlockSlots = [
    { id: "slot-1", minLvl: 1,  unlocked: unlockFlags[0] },
    { id: "slot-2", minLvl: 10, unlocked: unlockFlags[1] },
    { id: "slot-3", minLvl: 20, unlocked: unlockFlags[2] },
    { id: "slot-4", minLvl: 40, unlocked: unlockFlags[3] },
  ];

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

        <div className="mt-8">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <div className="text-sm font-semibold tracking-wide uppercase text-white/70">Club Facilities PlayStyles</div>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <div className="mt-4 text-sm text-white/60">None</div>
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
        <div className="mt-6 text-[11px] text-white/50">
          <b className="text-white/70">Signature PlayStyles</b> can only be changed once a Specialization has been unlocked.
          <div className="mt-2">Upgrades to PlayStyle+ at LVL 40.</div>
        </div>
      </aside>
    </div>
  );
}

function PlayStyleCard({ ps, onClick }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,.06)_0%,rgba(255,255,255,.02)_100%)] p-3 text-left hover:bg-white/10">
      <div className="h-24 rounded-xl bg-white/5 mb-2 flex items-center justify-center text-2xl">◆</div>
      <div className="text-sm font-medium">{ps.name}</div>
    </button>
  );
}

function PlayStyleRow({ name, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 p-3 text-left">
      <div className="size-10 rounded-lg bg-white/10 flex items-center justify-center">◆</div>
      <div className="text-sm font-medium">{name}</div>
    </button>
  );
}

// -------- Specializations --------
function SpecializationsView({ value, onChange }) {
  const options = [
    { id: "spec-finesse", name: "Finesse Shot" },
    { id: "spec-power", name: "Power Shot" },
    { id: "spec-technical", name: "Technical" },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h2 className="text-xl font-semibold mb-4">Specializations</h2>
      <p className="text-white/70 text-sm mb-4">Elige 1 entre 3 especialidades. La selección aparecerá en la sección <b>Specialización</b> dentro de PlayStyles.</p>
      <div className="grid sm:grid-cols-3 gap-4">
        {options.map((o) => (
          <button key={o.id} onClick={() => onChange(o.name)} className={`rounded-xl border p-4 text-left ${value === o.name ? "bg-white/10 border-white/30" : "bg-white/5 border-white/15 hover:bg-white/10"}`}>
            <div className="h-20 rounded-lg bg-white/10 mb-2 flex items-center justify-center text-2xl">◆</div>
            <div className="text-sm font-medium">{o.name}</div>
            {value === o.name && <div className="text-[10px] mt-1 text-emerald-300">Seleccionado</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

// -------------- Body --------------
function BodyView() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h2 className="text-xl font-semibold mb-4">Body</h2>
      <p className="text-white/70 text-sm">Altura y peso modificarán atributos clave en la ventana de Atributos. (placeholder)</p>
    </div>
  );
}

// -------------- Dev Tests --------------
function DevTests() {
  useEffect(() => {
    try {
      // Existing tests (no tocar)
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

      // NEW tests añadidos
      console.assert(JSON.stringify(hexToRgb('#abc')) === JSON.stringify({r:170,g:187,b:204}), 'hexToRgb short #abc');
      console.assert(JSON.stringify(hexToRgb('#aabbcc')) === JSON.stringify({r:170,g:187,b:204}), 'hexToRgb long #aabbcc');
      console.assert(clampLvl(0) === 1 && clampLvl(41) === 40 && clampLvl(25) === 25, 'clampLvl bounds');
      console.assert(rangeCost(75, 81) >= rangeCost(75, 80), 'rangeCost monotonic');
    } catch (err) { console.error('DevTests failed:', err); }
  }, []);
  return null;
}

export default FC26;
