import { memo, useMemo, useState, useEffect, useCallback } from "react";
import { Zap, Star, Key } from "lucide-react";

// ================================
// FC26 — UI Sandbox (Single file)
// ================================
// Ajustes solicitados y fixes:
// - Solución al error de JSX adyacente: el return de FC26 está envuelto en un único padre (Fragment + <div> raíz).
// - Unificación del estilo de estrellas (header y Attributes → Others) con 5 fijas:
//   3 rellenas por defecto y 2 solo contorno; al subir con + se rellenan 4ª y 5ª.
// - Others (Skill/WF) escalables por estrellas, sin barra numérica.
// - Eliminado cualquier dependencia de componentes no definidos (Header, SpecializationsView, etc. definidos aquí).
// - Retirada de Skills/WF + estrellas de los BLOQUES de arquetipos (vista Archetypes), tal como solicitaste.
// - FIX actual: eliminar barras invertidas escapadas en JSX (p. ej., className=\"...\") que provocaban SyntaxError por secuencias Unicode.

// ---------- Utils ----------
function normalizeAttrName(s) {
  if (!s) return s;
  const map = {
    "Heading Accuracy": "Heading Acc.",
    "Composture": "Composure",
    "Long Shot": "Long Shots",
    "FK Accuracy": "FK Acc."
  };
  return map[s] || s;
}

const deepClone = typeof structuredClone === "function"
  ? (v) => structuredClone(v)
  : (v) => JSON.parse(JSON.stringify(v));

function clampLvl(n) { return Math.max(1, Math.min(50, Number(n) || 1)); }
function hexToRgb(hex){ hex = hex.replace('#',''); if(hex.length===3){hex = hex.split('').map(c=>c+c).join('');} const num=parseInt(hex,16); return {r:(num>>16)&255,g:(num>>8)&255,b:(num)&255}; }
function getUnlockedSlots(lvl) { return [lvl >= 1, lvl >= 10, lvl >= 20, lvl >= 40]; }
// === Coste por punto (nuevo esquema) ===
// 0–59 → 1 | 60–64 → 2 | 65–69 → 4 | 70–74 → 6
// 75–79 → 8 | 80–84 → 10 | 85–89 → 15 | 90–94 → 20 | 95–99 → 25
function pointCost(v) {
  const n = Number(v) || 0;
  if (n <= 59) return 1;
  if (n <= 64) return 2;
  if (n <= 69) return 4;
  if (n <= 74) return 6;
  if (n <= 79) return 8;
  if (n <= 84) return 10;
  if (n <= 89) return 15;
  if (n <= 94) return 20;
  if (n <= 99) return 25;
  return 25; // ≥100
}

function rangeCost(from, to) {
  const a = Math.floor(Number(from) || 0);
  const b = Math.floor(Number(to) || 0);
  if (b <= a) return 0;
  let c = 0;
  for (let v = a + 1; v <= b; v++) c += pointCost(v);
  return c;
}

// ---------- Data ----------
// ---- Position color mapping ----
const POSITION_COLORS = {
  GK: "#fb923c", // orange
  CB: "#facc15", RB: "#facc15", LB: "#facc15", RWB: "#facc15", LWB: "#facc15", // yellow
  CDM: "#22c55e", CM: "#22c55e", RM: "#22c55e", LM: "#22c55e", CAM: "#22c55e", // green
  RW: "#3b82f6", LW: "#3b82f6", RF: "#3b82f6", LF: "#3b82f6", CF: "#3b82f6", ST: "#3b82f6", // blue
};
const positionColor = (pos) => POSITION_COLORS[pos] || "#9ca3af";

const ARCH_ORDER = {
  Forward: ["Target","Finisher","Magician"],
  Midfielder: ["Spark","Creator","Maestro","Recycler"],
  Defender: ["Marauder","Engine","Boss","Progressor"],
  Goalkeeper: ["Sweeper Keeper","Shot Stopper"],
};

const ROLE_STYLES = {
  Forward:     { accent: "#00E5FF", glow: "rgba(0,229,255,0.2)" },
  Midfielder:  { accent: "#22C55E", glow: "rgba(34,197,94,0.2)" },
  Defender:    { accent: "#EAB308", glow: "rgba(234,179,8,0.2)" },
  Goalkeeper:  { accent: "#A855F7", glow: "rgba(168,85,247,0.2)" },
};

const ARCHETYPES = {
  Forward: {
  items: [
    { name: "Target", desc: "Dominant aerial presence and reliable hold-up striker.", playstyles: ["Power Shot","Precision Header"], skills: 5, weakFoot: 5, positions: ["ST","LW","RW","CAM"], keyAttrs: ["Shot Power","Heading Accuracy","Jumping","Strength"] },
    { name: "Finisher", desc: "Clinical goal-scorer with elite instinct in the box.", playstyles: ["Finesse Shot","Acrobatic"], skills: 5, weakFoot: 5, positions: ["ST","LW","RW","CAM"], keyAttrs: ["Reactions","Composure","Finishing","Volleys"] , inspiredBy: "Alex Morgan"},
    { name: "Magician", desc: "Creative forward who unlocks defenses in tight spaces.", playstyles: ["Rapid","Trickster"], skills: 5, weakFoot: 5, positions: ["ST","LW","RW","CAM","LM","RM"], keyAttrs: ["Acceleration","Finishing","Curve","Balance"] , inspiredBy: "Ronaldinho"}
  ]
},
  Midfielder: {
    items: [{ name: "Recycler", desc: "This passing machine is critical to taking the ball from the backline and giving it to your most dangerous attackers.", playstyles: ["Press Proven", "Intercept"], skills: 4, weakFoot: 5 , positions: ["CAM","CM","CDM","CB"], keyAttrs: ["Long Shots","Interceptions","Def. Aware","Strength"] , inspiredBy: "Michaël Essien"}, { name: "Maestro", desc: "Orchestrating the game from deep, this player can unlock a defence to create chances for their forwards.", playstyles: ["Tiki Taka", "Pinged Pass"], skills: 5, weakFoot: 5 , positions: ["CAM","LM","RM","CM","CDM"], keyAttrs: ["Ball Control","Composure","Long Pass","Vision"] , inspiredBy: "Toni Kroos"}, { name: "Creator", desc: "Capable of delivering precise and incisive passes that can dismantle even the most organised backlines.", playstyles: ["Incisive Pass", "Inventive Pass"], skills: 4, weakFoot: 5 , positions: ["CAM","LM","RM","CM"], keyAttrs: ["Long Pass","Vision","Short Pass","Curve"] , inspiredBy: "Xavi"}, { name: "Spark", desc: "Excels in short, explosive bursts - getting to the byline and pulling back tantalising crosses for teammates.", playstyles: ["Rapid", "Trickster"], skills: 5, weakFoot: 5 , positions: ["LW","RW","CAM","LM","RM"], keyAttrs: ["Acceleration","Agility","Ball Control","Dribbling"] , inspiredBy: "Luís Figo"}],
  },
  Defender: {
    items: [{ name: "Progressor", desc: "A modern centre-back capable of stepping out of the backline to start attacks with progressive passing.", playstyles: ["Long Ball Pass", "Anticipate"], skills: 3, weakFoot: 3 , inspiredBy: "Fernando Hierro"}, { name: "Boss", desc: "Wins the ball with imposing physicality. Willing to put everything on the line for the team.", playstyles: ["Bruiser", "Aerial Fortress"], skills: 3, weakFoot: 3 , inspiredBy: "Nemanja Vidić" }, { name: "Engine", desc: "This player's incredible stamina allows them to maintain maximum effort throughout the match.", playstyles: ["Jockey", "Relentless"], skills: 3, weakFoot: 3 , inspiredBy: "Park Ji Sung"}, { name: "Marauder", desc: "A defensive specialist whose pulsating pace means they're also comfortable and effective going forward.", playstyles: ["Whipped Pass", "Quick Step"], skills: 3, weakFoot: 3 , inspiredBy: "Cafú"}],
  },
  Goalkeeper: {
    items: [
      { name: "Shot Stopper", desc: "Unphased when faced with an attacker one-on-one, can be relied upon to make difficult saves.", playstyles: ["Footwork", "Far Reach"], skills: 3, weakFoot: 3 },
      { name: "Sweeper Keeper", desc: "A modern-day keeper, comfortable with the ball at their feet, and with a high defensive line.", playstyles: ["Cross Claimer", "1v1 Close Down"], skills: 3, weakFoot: 3 , inspiredBy: "Lev Yashin"},
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

const AP_BY_LEVEL = [40, 7, 7, 7, 15, 8, 8, 8, 8, 20, 10, 10, 10, 10, 20, 10, 10, 10, 10, 35, 15, 15, 15, 15, 30, 20, 20, 20, 20, 50, 20, 20, 20, 20, 30, 20, 20, 20, 20, 40, 20, 20, 20, 20, 35, 20, 20, 20, 20, 50];

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
    <>
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
          <AttributesView data={data} setData={setData} lvl={lvl} apAvail={apAvail} onSpend={onSpendDelta} onSetSpent={onSetSpentAbs} selectedArchetype={selectedArchetype} />
        )}

        {active === "playstyles" && (
          <PlaystylesView lvl={lvl} specializationPS={specializationPS} selectedArchetype={selectedArchetype} />
        )}

        {active === "specializations" && (
          <SpecializationsView value={specializationPS} onChange={setSpecializationPS} />
        )}

{active === "body" && <BodyView data={data} />}


        <DevTests />
      </div>
    </>
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
  const skills = typeof item.skills === 'number' ? item.skills : 3;
  const weak  = typeof item.weakFoot === 'number' ? item.weakFoot : 3;

  return (
    <div className="flex items-center gap-2">
      <div className="px-2.5 py-1.25 rounded-md border border-white/10 bg-white/5 text-xs flex items-center gap-1 min-h-[32px]" title="Acceleration type">
        <span className="text-white/70">AcceleRATE</span>
        <span className="text-amber-300 ml-1 font-bold">Controlled</span>
      </div>
      <div className="px-2 py-1 rounded-md border border-white/10 bg-white/5 text-xs flex items-center gap-1" title={`Skills Moves: ${skills}/5`}>
        <span className="text-white/70">Skills</span>
        <Stars5 value={skills} />
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
              <input type="range" min={1} max={50} value={lvl} onChange={onLvlRange} className="w-24" style={{ accentColor: accent || "#6b7280" }} />
              <input type="number" min={1} max={50} value={lvl} onChange={onLvlNum} className="w-14 px-1 py-0.5 text-center rounded bg-white/5 border border-white/15 text-xs" />
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
        const desired = ARCH_ORDER[role] || [];
        const indexOf = (name) => { const i = desired.indexOf(name); return i === -1 ? 9999 : i; };
        const itemsOrdered = [...items].sort((a,b) => indexOf(a?.name) - indexOf(b?.name));
        const styleCfg = ROLE_STYLES[role] || { accent: "#6b7280", glow: "rgba(255,255,255,0.06)" };
        const { accent } = styleCfg;
        const { r,g,b } = hexToRgb(accent);
        return (
          <div key={role}>
            <h2 className="text-3xl font-bold mb-6" style={{ color: accent }}>{role}</h2>
            <div className="space-y-4 relative">
              {itemsOrdered.map((a) => {
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
                    <div className="min-w-[120px]">  <div className="font-semibold text-lg leading-tight">{a.name}</div>  {a.inspiredBy && (    <div className="mt-0.5">      <div className="text-[10px] uppercase tracking-wide text-white/50">Inspired by</div>      <div className="text-xs text-white/70">{a.inspiredBy}</div>    </div>  )}</div>
                    <div className="text-sm text-white/80 flex-1">{a.desc}<div className="mt-3 space-y-2">  <div>    <div className="text-xs text-white/70 uppercase font-semibold mb-1">Positions</div>    <div className="flex flex-wrap gap-2">{(() => {      const pos = a.positions || []; const groups = []; const used = new Set();      pos.forEach(p => { if (used.has(p)) return; let pair = null;        if ((p==="LW" && pos.includes("RW")) || (p==="RW" && pos.includes("LW"))) pair = ["LW","RW"];        else if ((p==="LF" && pos.includes("RF")) || (p==="RF" && pos.includes("LF"))) pair = ["LF","RF"];        else if ((p==="LB" && pos.includes("RB")) || (p==="RB" && pos.includes("LB"))) pair = ["LB","RB"];        else if ((p==="LWB" && pos.includes("RWB")) || (p==="RWB" && pos.includes("LWB"))) pair = ["LWB","RWB"];        else if ((p==="LM" && pos.includes("RM")) || (p==="RM" && pos.includes("LM"))) pair = ["LM","RM"];        if (pair) { pair.forEach(x=>used.add(x)); groups.push(pair.join("/")); } else { used.add(p); groups.push(p); }      });      return groups.map(g => { const c = positionColor(g.includes("/") ? g.split("/")[0] : g); return (<span key={g} className="px-2 py-0.5 rounded-full border text-xs" style={{borderColor:c,color:c}}>{g}</span>); });    })()}</div>  </div>  <div>    <div className="text-xs text-white/70 uppercase font-semibold mb-1">Key Attributes</div>    <div className="flex flex-wrap gap-2">{([...(a.keyAttrs||[])]).sort((a,b)=>String(a).localeCompare(String(b))).map((k)=>(<span key={k} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs">{k}</span>))}</div>  </div></div></div>
                    <div className="text-sm font-medium min-w-[220px] flex flex-col items-end justify-center">
                      <div className="text-xs text-white/70">PlayStyles</div>
                      <div className="flex gap-2">{(Array.isArray(a.playstyles)?a.playstyles:[]).map((ps) => <span key={ps}>{ps}</span>)}</div>
                      {/* Skills/WF retirados de los BLOQUES de arquetipos */}
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
function AttributesView({ data, setData, lvl, apAvail, onSpend, onSetSpent, selectedArchetype }) {
  const [sel, setSel] = useState({ cat: 0, idx: 0 });
  const selected = data[sel.cat]?.stats[sel.idx];
  const keyAttrsSet = new Set((Array.isArray(selectedArchetype?.item?.keyAttrs) ? selectedArchetype.item.keyAttrs : []).map((x)=> normalizeAttrName(String(x))));

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
      {data.slice(0, 4).map((cat,i)=>(<Column key={cat.id} cat={cat} colIndex={i} onSelect={onSelectIdx} sel={sel} keyAttrsSet={keyAttrsSet}/>))}
      <DetailsPanel stat={selected} onPlus={inc} onMinus={dec}/>
      <div className="md:col-span-2 xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.slice(4).map((cat,i)=>(<Column key={cat.id} cat={cat} colIndex={i+4} onSelect={onSelectIdx} sel={sel} keyAttrsSet={keyAttrsSet}/>))}
      </div>
    </main>
  );
}

const Column = memo(function Column({ cat, colIndex, onSelect, sel, keyAttrsSet }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-sm font-semibold tracking-wide uppercase text-white/70 mb-2">{cat.title}</h3>
      <div className="space-y-3">
        {cat.stats.map((s, idx) => (
          <Row key={s.name} name={s.name} value={s.val} stars={s.stars} isKey={keyAttrsSet?.has(normalizeAttrName(s.name))} active={sel.cat===colIndex && sel.idx===idx} onClick={()=>onSelect(colIndex,idx)}/>
        ))}
      </div>
    </section>
  );
});

const Row = memo(function Row({ name, value, stars = 0, active, onClick, isKey = false }) {
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
    <button onClick={onClick} className={`w-full text-left group ${active?"":"opacity-90"}`} >
      <div className="flex items-center justify-between text-[13px]">
        <span className={`font-medium inline-flex items-center gap-1.5 ${active?"text-white":"text-white/80"}`}>{name}{isKey && <Key className="size-3.5 text-amber-300" title="Key attribute" />}</span>
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
// BodyView — Graph + right control block (Height & Weight sliders + linked attributes)
function BodyView({ data, feet = 5, inches = 11, pounds = 176 }) {
  const H_MIN_IN = 64; // 5'4" (162 cm)
  const H_MAX_IN = 78; // 6'6" (198 cm)
  const H_MIN_CM = 162;
  const H_MAX_CM = 198;
  const W_MIN_LB = 132; // ≈60 kg
  const W_MAX_LB = 220; // ≈100 kg

  const startInches = feet * 12 + inches;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const startCm = clamp(Math.round(startInches * 2.54), H_MIN_CM, H_MAX_CM);
  const [heightCm, setHeightCm] = useState(startCm);
  const [weightLb, setWeightLb] = useState(clamp(pounds, W_MIN_LB, W_MAX_LB));

  const heightInFloat = useMemo(() => heightCm / 2.54, [heightCm]);
  const { feetTxt, inchTxt, cmTxt, kgTxt } = useMemo(() => {
    let ft = Math.floor(heightInFloat / 12);
    let inc = Math.round(heightInFloat - ft * 12);
    if (inc === 12) { ft += 1; inc = 0; }
    const kg = Math.round(weightLb * 0.45359237);
    return { feetTxt: ft, inchTxt: inc, cmTxt: `${heightCm} cm`, kgTxt: `${kg} kg` };
  }, [heightInFloat, heightCm, weightLb]);

  const { xPct, yPct } = useMemo(() => {
    const nx = (weightLb - W_MIN_LB) / Math.max(1, W_MAX_LB - W_MIN_LB);
    const ny = 1 - (heightInFloat - H_MIN_IN) / Math.max(1, H_MAX_IN - H_MIN_IN);
    return { xPct: nx * 100, yPct: ny * 100 };
  }, [heightInFloat, weightLb]);

  const BODY_STATS = ["Acceleration", "Agility", "Balance", "Jumping", "Sprint Speed", "Strength"];
  const getStatByName = (name) => {
    for (const cat of data || []) {
      const idx = (cat.stats || []).findIndex((s) => s.name === name);
      if (idx !== -1) return cat.stats[idx];
    }
    return null;
  };

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-start gap-6">
          {/* --- Izquierda: Gráfica con sliders --- */}
          <div className="w-[420px] rounded-2xl border border-white/10 bg-white/[0.02] relative overflow-hidden">
            {/* Header con sliders */}
            <div className="px-5 pt-4 pb-2 grid grid-cols-2 gap-4 select-none">
              <div className="text-left">
                <div className="text-base font-bold text-white">Height</div>
                <div className="text-2xl font-semibold mt-0.5">{`${feetTxt}'${inchTxt}"`}</div>
                <div className="text-[11px] text-white/60 mt-0.5">({cmTxt})</div>
                <div className="mt-2">
                  <input type="range" min={H_MIN_CM} max={H_MAX_CM} step={1} value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} className="w-full accent-gray-300" />
                  <div className="flex justify-between text-[10px] text-white/50 mt-0.5">
                    <span>5'4" (162 cm)</span>
                    <span>6'6" (198 cm)</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold text-white">Weight</div>
                <div className="text-2xl font-semibold mt-0.5">{`${weightLb} lbs`}</div>
                <div className="text-[11px] text-white/60 mt-0.5">({kgTxt})</div>
                <div className="mt-2">
                  <input type="range" min={W_MIN_LB} max={W_MAX_LB} step={1} value={weightLb} onChange={(e) => setWeightLb(Number(e.target.value))} className="w-full accent-gray-300" />
                  <div className="flex justify-between text-[10px] text-white/50 mt-0.5">
                    <span>132 lbs (60 kg)</span>
                    <span>220 lbs (100 kg)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ÚNICA Gráfica */}
            <div className="px-4 pb-3">
              <div className="relative w-full h-[360px] rounded-[14px] bg-transparent overflow-hidden">
                {/* Rejilla (centrales marcadas + líneas finas) */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Ejes centrales */}
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[2px] h-full bg-white/50" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] w-full bg-white/50" />
                  {/* Líneas finas */}
                  <div className="absolute top-0 bottom-0 left-[25%] w-px bg-white/10" />
                  <div className="absolute top-0 bottom-0 left-[75%] w-px bg-white/10" />
                  <div className="absolute left-0 right-0 top-[25%] h-px bg-white/10" />
                  <div className="absolute left-0 right-0 top-[75%] h-px bg-white/10" />
                </div>
                {/* Knob */}
                <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${xPct}%`, top: `${yPct}%` }}>
                  <div className="w-8 h-8 rounded-full border border-white/40 bg-white/25 backdrop-blur-[2px] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                    <div className="w-3.5 h-3.5 rounded-full bg-white/80" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- Derecha: Bloque de atributos enlazados --- */}
          <div className="flex-1">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 w-full">
              <h3 className="text-sm font-semibold tracking-wide uppercase text-white/70 mb-2">Attributes</h3>
              <div className="space-y-3">
                {BODY_STATS.map((name) => {
                  const s = getStatByName(name);
                  const value = s ? s.val : 0;
                  const stars = s ? (s.stars || 0) : 0;
                  return (
                    <Row key={name} name={name} value={value} stars={stars} active={false} onClick={() => {}} />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tests de validación en runtime */}
      <DevTests />
    </>
  );
}


// -------------- Dev Tests --------------
function DevTests() {
  useEffect(() => {
    try {
      // Verificación del nuevo mapeo de costes
      console.assert(pointCost(0) === 1 && pointCost(59) === 1, '0–59 → 1 AP');
      console.assert(pointCost(60) === 2 && pointCost(64) === 2, '60–64 → 2 AP');
      console.assert(pointCost(65) === 4 && pointCost(69) === 4, '65–69 → 4 AP');
      console.assert(pointCost(70) === 6 && pointCost(74) === 6, '70–74 → 6 AP');
      console.assert(pointCost(75) === 8 && pointCost(79) === 8, '75–79 → 8 AP');
      console.assert(pointCost(80) === 10 && pointCost(84) === 10, '80–84 → 10 AP');
      console.assert(pointCost(85) === 15 && pointCost(89) === 15, '85–89 → 15 AP');
      console.assert(pointCost(90) === 20 && pointCost(94) === 20, '90–94 → 20 AP');
      console.assert(pointCost(95) === 25 && pointCost(99) === 25, '95–99 → 25 AP');
      console.assert(pointCost(100) === 25, '≥100 → 25');

      // Sanidad básica para rangeCost con el nuevo esquema
      console.assert(rangeCost(69, 70) === 6, '69→70 cuesta 6');
      console.assert(rangeCost(74, 75) === 8, '74→75 cuesta 8');
      console.assert(rangeCost(79, 80) === 10, '79→80 cuesta 10');
      console.assert(rangeCost(84, 85) === 15, '84→85 cuesta 15');
      console.assert(rangeCost(89, 90) === 20, '89→90 cuesta 20');
      console.assert(rangeCost(94, 95) === 25, '94→95 cuesta 25');

      // Flags de slots por nivel
      const f1  = getUnlockedSlots(1);  console.assert(f1[0] && !f1[1] && !f1[2] && !f1[3], 'flags lvl1');
      const f10 = getUnlockedSlots(10); console.assert(f10[0] && f10[1] && !f10[2] && !f10[3], 'flags lvl10');
      const f20 = getUnlockedSlots(20); console.assert(f20[0] && f20[1] && f20[2] && !f20[3], 'flags lvl20');
      const f40 = getUnlockedSlots(40); console.assert(f40.every(Boolean), 'flags lvl40');

      // Nuevos tests mínimos (sin romper existentes)
      console.assert(STAR_VALS[3] === 75 && STAR_VALS[4] === 85 && STAR_VALS[5] === 95, 'STAR_VALS mapping');
      const others = BASE_DATA.find(c=>c.id==='others');
      console.assert(others && others.stats.length===2, 'Others block exists');
      console.assert(others.stats[0].stars===3 && others.stats[0].val===75, 'Skill default 3★ => 75');
      console.assert(typeof ARCHETYPES === 'object' && Object.keys(ARCHETYPES).length>=1, 'Archetypes defined');
      console.assert(Array.isArray(SPEC_OPTIONS) && SPEC_OPTIONS.length===3, 'SPEC_OPTIONS length');

      // Extra: clamps
      console.assert(clampLvl(0) === 1, 'clampLvl lower bound');
      console.assert(clampLvl(999) === 50, 'clampLvl upper bound');
    } catch (err) { console.error('DevTests failed:', err); }
  }, []);
  return null;
}

export default FC26;
