import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./supabase";
import {
  selectBestLayout, denormalizePositions, normalizePositions,
  clearLayoutCache, buildCircularLayout,
} from "./layoutEngine";
import { parseFormula, expandFormulaToAtoms } from "./formulaParser";
import Molecule3DViewer from "./Molecule3DViewer";
import HeaderBar from "./components/Header/HeaderBar";
import FormulaInput from "./components/FormulaInput/FormulaInput";
import ChatPanel from "./components/ChatAssistant/ChatPanel";
import InspectorSidebar from "./components/Inspector/InspectorSidebar";
import PeriodicTablePalette from "./components/PeriodicTable/PeriodicTablePalette";
import ElementTooltip from "./components/Tooltip/ElementTooltip";
import CanvasStage from "./components/Canvas/CanvasStage";
import SimpleModeLegend from "./components/Legend/SimpleModeLegend";
import ReactionsBar from "./components/ReactionsBar/ReactionsBar";
import { useLiveRef } from "./hooks/useLiveRef";
import { useChatAssistant } from "./hooks/useChatAssistant";

// ── Extracted modules (Phase 1 refactor — behavior-preserving split of the ──
// ── former monolithic ChemLabCanvas.jsx into focused files) ──
import { ELEMENTS, getElement, getGroupStyles } from "./data/elements";
import { fingerprint } from "./chemistry/fingerprint";
import {
  REACTIONS,
  COMPOUND_BLUEPRINTS,
  bumpInventorySearchGeneration, getInventorySearchGeneration,
  setSearchOnlineEnabled,
} from "./chemistry/reactionStore";
import { getMoleculeForAtom, alignAtomsToReactants, identifyMolecules } from "./chemistry/moleculeGraph";
import { NUCLEUS_R, shellRadius } from "./chemistry/physics";
import { pickAtomsForEntry } from "./chemistry/reactionResolver";
import {
  detectCoordinationCompound, buildCoordinationLayout,
} from "./chemistry/coordinationCompounds";
import { build3DXYZFallback } from "./chemistry/xyzFallback";
import { drawFormula } from "./render/drawFormula";
import { runInventorySearch, findCompoundEntry } from "./lookup/reactionResolutionService";
import { getCanonicalEquation, getExperimentEquation, formatFormulaUnicode, buildMoleculeEquation, getProductsLabel } from "./chemistry/equationBuilder";
import { runReactionEngine, REACTION_ENGINE_STATUS } from "./chemistry/reactionEngine";
import { expandProducts } from "./chemistry/moleculeReactionResolver";

// ───────────────────────── MAIN COMPONENT ─────────────────────────
export default function ChemLabCanvas() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const atomsRef = useRef([]);
  const bondsRef = useRef([]);
  const idCounter = useRef(1);
  const particlesRef = useRef([]);
  const dragId = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  // Canvas panning (Upgrade #2): pan is stored in screen pixels (not world units)
  // so a given mouse delta pans the same visual distance regardless of zoom level.
  const panRef = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const lastTime = useRef(performance.now());
  const bondRestLengths = useRef(new Map()); // Map<"id1-id2", rest_length_px>

  // Upgrade #2.5: content-aware navigation. Panning itself stays completely
  // free (no hard walls right at the molecules' edges) — but the workspace
  // can't be dragged so far that the existing molecules are lost forever in
  // empty space. CONTENT_PAN_SLACK is how many extra canvas-widths/heights of
  // travel are allowed beyond the content's own bounding box in every
  // direction before the view gets pulled back toward it.
  const CONTENT_PAN_SLACK = 1.5;
  const clampPanToContent = (pan, zoom) => {
    const canvas = canvasRef.current;
    const atoms = atomsRef.current;
    if (!canvas || atoms.length === 0) return pan; // nothing to stay centered around — fully free
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const a of atoms) {
      if (a.x < minX) minX = a.x;
      if (a.x > maxX) maxX = a.x;
      if (a.y < minY) minY = a.y;
      if (a.y > maxY) maxY = a.y;
    }
    const W = canvas.width, H = canvas.height;
    const marginX = W * CONTENT_PAN_SLACK;
    const marginY = H * CONTENT_PAN_SLACK;

    // Screen-space position of the content bbox is: W/2 + pan + worldCoord*zoom.
    // Solve for the pan range that keeps at least the near edge of the
    // bounding box within [-margin, canvasSize+margin] of the viewport.
    const minPanX = -marginX - W / 2 - maxX * zoom;
    const maxPanX = W / 2 + marginX - minX * zoom;
    const minPanY = -marginY - H / 2 - maxY * zoom;
    const maxPanY = H / 2 + marginY - minY * zoom;

    // If the content itself is so large the range inverts, don't fight the user.
    const x = minPanX <= maxPanX ? Math.min(maxPanX, Math.max(minPanX, pan.x)) : pan.x;
    const y = minPanY <= maxPanY ? Math.min(maxPanY, Math.max(minPanY, pan.y)) : pan.y;
    return { x, y };
  };

  // ── 3D Viewer data state (fed into Molecule3DViewer component) ──
  const [viewer3dSdf, setViewer3dSdf] = useState("");
  const [viewer3dXyz, setViewer3dXyz] = useState("");
  const [viewer3dTitle, setViewer3dTitle] = useState("");

  const [mode, setMode] = useState("setup"); // setup | running
  const [visualMode, setVisualMode] = useState("bohr"); // bohr | simple | 3d

  // ── Application Theme ──
  const [theme, setThemeState] = useState(() => {
    try { return localStorage.getItem("chemlab-theme") || "light"; } catch { return "light"; }
  });
  const handleSetTheme = (t) => {
    setThemeState(t);
    try { localStorage.setItem("chemlab-theme", t); } catch {}
  };
  const themeVars = useMemo(() => {
    const themes = {
      light: {
        bgApp: "#f8fafc", bgPanel: "#ffffff", bgCard: "#f8fafc", bgHover: "#f1f5f9", bgHeader: "#ffffff",
        textPrimary: "#0f172a", textSecondary: "#475569", textMuted: "#94a3b8",
        border: "#e2e8f0", borderAccent: "#cbd5e1",
        btnBg: "#ffffff", btnHover: "#f1f5f9", btnBorder: "#cbd5e1", btnText: "#334155",
        scrollTrack: "#f1f5f9", scrollThumb: "#cbd5e1", scrollThumbHover: "#94a3b8",
      },
      dawn: {
        bgApp: "#faf6ef", bgPanel: "#f5ede0", bgCard: "#eedbc5", bgHover: "#e8d4be", bgHeader: "#f5ede0",
        textPrimary: "#3b1f04", textSecondary: "#6d4c30", textMuted: "#9a7d5a",
        border: "#e0c8a8", borderAccent: "#d4b48e",
        btnBg: "#f5ede0", btnHover: "#e8d4be", btnBorder: "#d4b48e", btnText: "#3b1f04",
        scrollTrack: "#eedbc5", scrollThumb: "#d4b48e", scrollThumbHover: "#b89870",
      },
      dark: {
        bgApp: "#0b0f19", bgPanel: "#0f172a", bgCard: "#1e293b", bgHover: "#334155", bgHeader: "#0f172a",
        textPrimary: "#f1f5f9", textSecondary: "#94a3b8", textMuted: "#64748b",
        border: "#334155", borderAccent: "#475569",
        btnBg: "#1e293b", btnHover: "#334155", btnBorder: "#475569", btnText: "#e2e8f0",
        scrollTrack: "#1e293b", scrollThumb: "#475569", scrollThumbHover: "#64748b",
      },
      grey: {
        bgApp: "#18181b", bgPanel: "#202023", bgCard: "#2d2d30", bgHover: "#3f3f46", bgHeader: "#202023",
        textPrimary: "#f4f4f5", textSecondary: "#a1a1aa", textMuted: "#71717a",
        border: "#3f3f46", borderAccent: "#52525b",
        btnBg: "#2d2d30", btnHover: "#3f3f46", btnBorder: "#52525b", btnText: "#e4e4e7",
        scrollTrack: "#2d2d30", scrollThumb: "#52525b", scrollThumbHover: "#71717a",
      },
    };
    return themes[theme] || themes.light;
  }, [theme]);
  const [tempK, setTempK] = useState(298);
  const [pressureAtm, setPressureAtm] = useState(1);
  const [selected, setSelected] = useState(null);
  const [lastReaction, setLastReaction] = useState(null);
  // Cross-cutting upgrade: "Generate and display the reaction equation every
  // time any reaction happens." lastReaction only tracks the ONE most-recent
  // completed reaction (and only shows up if the Inspector panel is visible),
  // so it's silently overwritten when several reactions happen in a row
  // (e.g. locking one compound and letting the leftovers react again, or a
  // multi-step cascade). reactionToasts is a separate, additive stream: a
  // stack of transient on-canvas cards, one per DISTINCT reaction commit, so
  // nothing that happened gets missed even if the Inspector is closed or
  // reactions occur faster than a person can read the sidebar.
  const [reactionToasts, setReactionToasts] = useState([]);
  const REACTION_TOAST_TTL_MS = 5000;
  const pushReactionToast = (entry) => {
    let equation;
    if (Array.isArray(entry?.products)) {
      equation = buildMoleculeEquation(entry.reactants, expandProducts(entry));
    } else {
      equation = getCanonicalEquation(entry);
    }
    if (!equation) return;
    const id = `rxn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setReactionToasts((prev) => [...prev, {
      id,
      equation,
      name: entry.name || "",
    }]);
    setTimeout(() => {
      setReactionToasts((prev) => prev.filter((t) => t.id !== id));
    }, REACTION_TOAST_TTL_MS);
  };
  const dismissReactionToast = (id) => {
    setReactionToasts((prev) => prev.filter((t) => t.id !== id));
  };
  const [diagnostics, setDiagnostics] = useState([]); // persistent list of blocked pairs + reasons
  const [pubchemStatus, setPubchemStatus] = useState(null); // null | "searching" | "found:<name>" | "not-found"
  const [counts, setCounts] = useState({ atoms: 0, bonds: 0 });
  const [zoom, setZoom] = useState(1);
  const [hoveredElement, setHoveredElement] = useState(null); // { el, x, y }
  const hoveredElementRef = useLiveRef(hoveredElement);
  const [formulaInput, setFormulaInput] = useState("");
  const formulaInputRef = useLiveRef(formulaInput);

  const [smartCascade, setSmartCascade] = useState(false);
  const smartCascadeRef = useLiveRef(smartCascade);

  // Upgrade #10.1: "Search Online" toggle — when off, PubChem's live network
  // lookup is skipped and resolution falls back to in-memory/Supabase cache only.
  const [searchOnline, setSearchOnlineState] = useState(true);
  const toggleSearchOnline = () => {
    setSearchOnlineState((v) => {
      const next = !v;
      setSearchOnlineEnabled(next);
      return next;
    });
  };

  // ── Stability & inventory search refs ──
  const committedCompound = useRef(null); // { fp, entry, aligned, targetPositions }
  const isStable = useRef(false);
  const lastInventoryFp = useRef(null); // fingerprint of last committed inventory
  const stableTimeRef = useRef(null);

  const [reactionEquation, setReactionEquation] = useState("Awaiting reactants... Build your experiment and click Start.");
  const [equationMode, setEquationMode] = useState("experiment"); // "experiment" | "standard"
  const equationModeRef = useLiveRef(equationMode);

  const [experimentHistory, setExperimentHistory] = useState([]);

  const currentMolecules = useMemo(() => {
    const atoms = atomsRef.current || [];
    // Group by spawnGroupId
    const groupCounts = {};
    for (const a of atoms) {
      if (a.spawnGroupId) {
        groupCounts[a.spawnGroupId] = (groupCounts[a.spawnGroupId] || 0) + 1;
      }
    }

    const completeGroups = new Map();
    const individualCounts = {};

    for (const a of atoms) {
      if (a.spawnGroupId && a.spawnGroupSize && groupCounts[a.spawnGroupId] === a.spawnGroupSize) {
        completeGroups.set(a.spawnGroupId, a.spawnGroupFormula);
      } else {
        individualCounts[a.sym] = (individualCounts[a.sym] || 0) + 1;
      }
    }

    const results = [];
    const sortedGroupFormulas = Array.from(completeGroups.values()).sort();
    sortedGroupFormulas.forEach((formula) => {
      results.push(formula);
    });

    const sortedAtoms = Object.keys(individualCounts).sort((a, b) => {
      if (a === "C") return -1;
      if (b === "C") return 1;
      if (a === "H") return -1;
      if (b === "H") return 1;
      return a.localeCompare(b);
    });
    sortedAtoms.forEach((sym) => {
      const count = individualCounts[sym];
      const display = count > 1 ? `${count}${sym}` : sym;
      results.push(display);
    });

    return results;
  }, [counts.atoms]);

  const displayedEquation = useMemo(() => {
    // Molecule-level reaction result (multi-product)
    if (reactionEquation && typeof reactionEquation === "object" && reactionEquation.type === "molecule_reaction") {
      return { type: "success", text: reactionEquation.equationStr };
    }

    // 1. Successful reaction equation
    if (reactionEquation && typeof reactionEquation === "object" && reactionEquation.type === "reaction") {
      const entry = reactionEquation.entry;
      const alignedAtoms = reactionEquation.alignedAtoms;
      const eqFn = equationMode === "standard" ? getCanonicalEquation : getExperimentEquation;
      const eqStr = eqFn(entry, alignedAtoms) || `→ ${entry.formula}`;
      return { type: "success", text: eqStr };
    }

    // 2. Warning or error message
    if (reactionEquation && (
      reactionEquation.includes("No") ||
      reactionEquation.includes("Error") ||
      reactionEquation.includes("Please") ||
      reactionEquation.includes("Could not verify")
    )) {
      return { type: "warning", text: reactionEquation };
    }

    // 3. Current reactants on canvas (Experiment Building State)
    if (currentMolecules && currentMolecules.length > 0) {
      const formatFormulaUnicode = (formula) => {
        return formula
          .replace(/H2O/g, "H₂O")
          .replace(/CO2/g, "CO₂")
          .replace(/NaCl/g, "NaCl")
          .replace(/O2/g, "O₂")
          .replace(/H2/g, "H₂")
          .replace(/Cl2/g, "Cl₂")
          .replace(/HCl/g, "HCl")
          .replace(/NaOH/g, "NaOH")
          .replace(/BaCl2/g, "BaCl₂")
          .replace(/Na2SO4/g, "Na₂SO₄")
          .replace(/BaSO4/g, "BaSO₄")
          .replace(/([A-Z][a-z]?)([0-9]+)/g, (m, sym, num) => {
            const subs = {
              "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
              "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉"
            };
            const subNum = Array.from(num).map(c => subs[c] || c).join("");
            return sym + subNum;
          });
      };
      
      const formattedReactants = currentMolecules.map(formatFormulaUnicode).join(" + ");
      return { type: "building", text: `Current Reactants: ${formattedReactants}` };
    }

    // 4. Initial State (empty canvas)
    return { type: "initial", text: "Waiting for experiment..." };
  }, [reactionEquation, equationMode, currentMolecules]);

  useEffect(() => {
    supabase.from('reactions').select('*').then(({ data, error }) => {
      if (error) {
        console.error("Error loading compound blueprints from Supabase:", error.message);
        return;
      }
      if (data) {
        data.forEach(row => {
          COMPOUND_BLUEPRINTS[row.fingerprint] = {
            name: row.name,
            formula: row.formula,
            reactants: row.reactants,
            bonds: row.bonds,
            coords: row.coords || null, // load coordinates if stored
            minTempK: row.minTempK,
            minPressureAtm: row.minPressureAtm,
            deltaH: row.deltaH,
            fact: row.fact,
            fromPubChem: true,
          };
        });
        console.log(`Loaded ${data.length} compound blueprints from Supabase.`);
      }
    });
  }, []);

  // ── 3D mode: distinct molecule selection ──
  const [selected3DMoleculeIndex, setSelected3DMoleculeIndex] = useState(0);
  const distinctMolecules = useMemo(() => {
    return identifyMolecules(atomsRef.current, bondsRef.current);
  }, [counts.atoms, counts.bonds]);
  // Reset selection if it falls out of bounds
  useEffect(() => {
    if (selected3DMoleculeIndex >= distinctMolecules.length && distinctMolecules.length > 0) {
      setSelected3DMoleculeIndex(0);
    }
  }, [distinctMolecules.length, selected3DMoleculeIndex]);

  // Auto-clear pubchemStatus search notifications 5 seconds after they complete
  useEffect(() => {
    if (pubchemStatus && (pubchemStatus.startsWith("found:") || pubchemStatus === "not-found")) {
      const timer = setTimeout(() => {
        setPubchemStatus(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [pubchemStatus]);

  // ── 3D data-fetching effect: populates viewer3dSdf / viewer3dXyz ──
  const fetch3DDebounceRef = useRef(null);
  // Upgrade #4.3.1: cache PubChem 3D results per compound (keyed by CID, or
  // name as a fallback) so switching back to a compound you've already viewed
  // in 3D doesn't re-hit PubChem.
  const threeDCacheRef = useRef(new Map());
  useEffect(() => {
    if (visualMode !== "3d") {
      setViewer3dSdf("");
      setViewer3dXyz("");
      setViewer3dTitle("");
      return;
    }

    const fetch3DData = async () => {
      const allAtoms = atomsRef.current;
      const allBonds = bondsRef.current;
      const molecules = identifyMolecules(allAtoms, allBonds);
      const selIdx = Math.min(selected3DMoleculeIndex, molecules.length - 1);
      const selMol = molecules[selIdx >= 0 ? selIdx : 0];

      if (!selMol) {
        setViewer3dSdf("");
        setViewer3dXyz("");
        setViewer3dTitle("");
        return;
      }

      // Check blueprint if available
      const blueprint = selMol.blueprint;
      const entryName = blueprint?.name || selMol.name || "";
      const entryFormula = blueprint?.formula || selMol.formula || "";
      const cid = blueprint?.cid || null;
      const cacheKey = cid ? `cid:${cid}` : entryName ? `name:${entryName}` : null;

      if (cacheKey && threeDCacheRef.current.has(cacheKey)) {
        const cached = threeDCacheRef.current.get(cacheKey);
        setViewer3dSdf(cached.sdf);
        setViewer3dXyz(cached.xyz);
        setViewer3dTitle(cached.title);
        return;
      }

      // ── Attempt 1: PubChem 3D conformer by CID ────────────────────────
      if (cid) {
        try {
          const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("CID 3D SDF not found");
          const sdf = await res.text();
          const title = entryName || entryFormula || "Molecule";
          setViewer3dSdf(sdf);
          setViewer3dXyz("");
          setViewer3dTitle(title);
          if (cacheKey) threeDCacheRef.current.set(cacheKey, { sdf, xyz: "", title });
          return;
        } catch (e) {
          console.warn("[3Dmol] CID lookup failed:", e.message);
        }
      }

      // ── Attempt 2: PubChem 3D conformer by compound name ─────────────
      if (entryName) {
        try {
          const encodedName = encodeURIComponent(entryName);
          const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodedName}/SDF?record_type=3d`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("Name 3D SDF not found");
          const sdf = await res.text();
          setViewer3dSdf(sdf);
          setViewer3dXyz("");
          setViewer3dTitle(entryName);
          if (cacheKey) threeDCacheRef.current.set(cacheKey, { sdf, xyz: "", title: entryName });
          return;
        } catch (e) {
          console.warn("[3Dmol] Name lookup failed:", e.message);
        }
      }

      // ── Attempt 3: Local tetrahedral 3D layout from canvas atoms + bonds
      const molAtomIds = new Set(selMol.atomIds);
      const filteredAtoms = allAtoms.filter(a => molAtomIds.has(a.id));
      const filteredBonds = allBonds.filter(b => molAtomIds.has(b.a) && molAtomIds.has(b.b));
      if (filteredAtoms.length > 0) {
        const xyz = build3DXYZFallback(filteredAtoms, filteredBonds);
        setViewer3dXyz(xyz);
        setViewer3dSdf("");
        setViewer3dTitle(
          entryName || entryFormula ||
          (filteredAtoms.length === 1 ? filteredAtoms[0].sym : "Canvas Molecule")
        );
      }
    };

    // Upgrade #4.3.3: debounce so a fast sequence of bonds forming during an
    // active reaction doesn't fire a fresh PubChem request on every single
    // atom/bond-count change — only once things settle for 400ms.
    clearTimeout(fetch3DDebounceRef.current);
    fetch3DDebounceRef.current = setTimeout(fetch3DData, 400);
    return () => clearTimeout(fetch3DDebounceRef.current);
  }, [visualMode, counts.atoms, counts.bonds, selected3DMoleculeIndex]);

  const modeRef = useLiveRef(mode);
  const visualModeRef = useLiveRef(visualMode);
  const tempRef = useLiveRef(tempK);
  const pressureRef = useLiveRef(pressureAtm);
  const zoomRef = useLiveRef(zoom);
  // Upgrade #4.1.4: electron orbit animation speed control (Bohr mode slider).
  const [orbitSpeed, setOrbitSpeed] = useState(1);
  const orbitSpeedRef = useLiveRef(orbitSpeed);


  // Upgrade #5.1: slow-motion / step-by-step physics. simSpeed scales the dt
  // fed into physicsTick each frame — 1 = normal, <1 = slow motion, 0 = fully
  // paused (physics frozen; step advances exactly one fixed tick on demand).
  // Kept separate from orbitSpeed (#4.1.4), which only affects the cosmetic
  // Bohr-mode electron-orbit animation, not the bonding/movement simulation.
  const [simSpeed, setSimSpeed] = useState(1);
  const simSpeedRef = useLiveRef(simSpeed);
  const isSimPaused = simSpeed === 0;
  const STEP_DT = 1 / 60; // one fixed frame's worth of simulated time
  const lastDiagnosticRun = useRef(0);
  const activeTarget = useRef(null); // { atomIds, fp, entry, elapsed } — the one outcome currently being driven to completion

  const spawnParticles = (x, y, color, count = 10) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      particlesRef.current.push({
        x, y, vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 1.4,
        born: performance.now(), life: 500, color,
      });
    }
  };

  // ───────────────────────── ENGINE TICK ─────────────────────────
  const engineTick = useCallback((dt) => {
    if (modeRef.current !== "running") return;

    if (committedCompound.current) {
      if (isStable.current) {
        if (stableTimeRef.current === null) {
          stableTimeRef.current = performance.now();
        }
        // If it has been stable for over 5 seconds, clear the diagnostics banner
        if (performance.now() - stableTimeRef.current > 5000) {
          setDiagnostics([]);
          return;
        }
      } else {
        stableTimeRef.current = null;
      }

      const { entry } = committedCompound.current;
      const labelStr = isStable.current ? "Stable Molecule" : "Optimizing Layout...";
      setDiagnostics([{
        key: "active-target",
        formula: entry.formula,
        name: entry.name,
        equation: getCanonicalEquation(entry),
        issues: [{ type: "info", label: labelStr, detail: "", severity: "low" }],
      }]);
    } else {
      stableTimeRef.current = null;
      setDiagnostics([]);
    }
  }, []);

  // ───────────────────────── PHYSICS TICK ─────────────────────────
  const physicsTick = useCallback((dt) => {
    const atoms = atomsRef.current;

    // Update orbit angles and instability
    for (const a of atoms) {
      a.shellAngle += dt * (1.4 + a.shells.length * 0.3) * orbitSpeedRef.current;
      a.instability = Math.max(0, a.instability - dt * 0.5);
    }

    // ── UNIVERSAL PAIRWISE REPULSION ──────────────────────────────
    // Runs for ALL atoms every frame regardless of bonding state.
    // Uses a soft inverse-square force so atoms naturally spread out
    // and never pile up on each other, even inside a committed molecule.
    {
      const vmode = visualModeRef.current;
      const REPULSE_STRENGTH = 800; // tweak: higher = stronger push
      const MAX_REPULSE_DIST = 280; // px: repulsion falls to zero beyond this

      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          const a = atoms[i], b = atoms[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist2 = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(dist2);

          if (dist >= MAX_REPULSE_DIST) continue;

          // Scale the equilibrium radius by atom size
          const elA = getElement(a.sym);
          const elB = getElement(b.sym);
          const rA = vmode === 'simple' ? 18 : 13 + 16 * elA.shells.length;
          const rB = vmode === 'simple' ? 18 : 13 + 16 * elB.shells.length;
          const minDist = rA + rB + 8; // 8 px gap at equilibrium

          // Soft-sphere: full repulsion inside minDist, tapering out beyond
          const overlap = Math.max(0, minDist - dist);
          const taper = Math.max(0, 1 - dist / MAX_REPULSE_DIST);
          const f = (REPULSE_STRENGTH * taper * taper / dist2
            + overlap * 1.2 / (minDist || 1)) * dt;

          const nx = dx / dist, ny = dy / dist;

          if (a.id !== dragId.current) { a.vx -= nx * f; a.vy -= ny * f; }
          if (b.id !== dragId.current) { b.vx += nx * f; b.vy += ny * f; }
        }
      }
    }

    if (committedCompound.current) {
      const { aligned, targetPositions, entry } = committedCompound.current;
      const alignedIds = new Set(aligned.map(a => a.id));
      const isDraggingMolAtom = dragId.current && alignedIds.has(dragId.current);

      if (isDraggingMolAtom) {
        // ── SPRING PHYSICS during drag: molecule flexes naturally ──
        isStable.current = false;

        const rl = bondRestLengths.current;
        const K_SPRING = 0.35;
        const DAMPING = 0.72;

        for (const a of aligned) {
          if (a.id !== dragId.current) { a.vx *= DAMPING; a.vy *= DAMPING; }
        }

        for (const bd of entry.bonds) {
          const atomA = aligned[bd.from];
          const atomB = aligned[bd.to];
          if (!atomA || !atomB) continue;

          const dx = atomB.x - atomA.x;
          const dy = atomB.y - atomA.y;
          const dist = Math.hypot(dx, dy) || 1;
          const key1 = `${atomA.id}-${atomB.id}`;
          const key2 = `${atomB.id}-${atomA.id}`;
          const rest = rl.get(key1) || rl.get(key2) || dist;
          const stretch = (dist - rest) * K_SPRING;
          const fx = (dx / dist) * stretch;
          const fy = (dy / dist) * stretch;

          if (atomA.id !== dragId.current) { atomA.vx += fx; atomA.vy += fy; }
          if (atomB.id !== dragId.current) { atomB.vx -= fx; atomB.vy -= fy; }
        }

        for (const a of aligned) {
          if (a.id === dragId.current) continue;
          a.x += a.vx;
          a.y += a.vy;
        }

      } else if (!isStable.current) {
        // ── RELAXATION: smooth interpolation back to target layout ──
        let allConverged = true;

        aligned.forEach((atom, i) => {
          if (atom.id === dragId.current) { allConverged = false; return; }

          const targetPos = targetPositions[i];
          const dx = targetPos.x - atom.x;
          const dy = targetPos.y - atom.y;

          atom.x += dx * 0.12;
          atom.y += dy * 0.12;
          atom.vx = 0;
          atom.vy = 0;

          if (Math.hypot(dx, dy) > 1.0) allConverged = false;
        });

        if (allConverged) {
          isStable.current = true;
          // Molecule is stable — user can now choose to lock it via the sidebar button
        }
      }
      // else: isStable = true — molecule at rest; repulsion handles micro-separation

    } else {
      // ── FREE ATOMS (not in committed compound): damping + boundary bounce ──
      const canvas = canvasRef.current;

      for (const a of atoms) {
        if (a.id === dragId.current) continue;
        a.vx *= 0.78;
        a.vy *= 0.78;
      }

      if (canvas) {
        const W = canvas.width / zoomRef.current;
        const H = canvas.height / zoomRef.current;
        for (const a of atoms) {
          if (a.id === dragId.current) continue;
          if (a.x < -W / 2 + 30) a.vx += 0.5;
          if (a.x > W / 2 - 30) a.vx -= 0.5;
          if (a.y < -H / 2 + 30) a.vy += 0.5;
          if (a.y > H / 2 - 30) a.vy -= 0.5;

          a.x += a.vx;
          a.y += a.vy;
        }
      }
    }
  }, []);

  // ───────────────────────── DRAW ─────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2 + panRef.current.x, H / 2 + panRef.current.y);
    ctx.scale(zoomRef.current, zoomRef.current);



    if (formulaInputRef.current) {
      const parsed = parseFormula(formulaInputRef.current);
      drawFormula(ctx, W, H, parsed.tokens, zoomRef.current);
      ctx.restore();
      return;
    }

    const atoms = atomsRef.current;
    const bonds = bondsRef.current;
    const vmode = visualModeRef.current;

    // ── bonds ──
    bonds.forEach((bd) => {
      const atomA = atoms.find((a) => a.id === bd.a);
      const atomB = atoms.find((a) => a.id === bd.b);
      if (!atomA || !atomB) return;

      const elA = getElement(atomA.sym);
      const elB = getElement(atomB.sym);
      const colorA = `#${elA.color.toString(16).padStart(6, "0")}`;
      const colorB = `#${elB.color.toString(16).padStart(6, "0")}`;
      const isIonic = bd.type === "ionic";
      const order = bd.order || 1;

      const dx = atomB.x - atomA.x, dy = atomB.y - atomA.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist, ny = dy / dist;

      ctx.save();

      // Standard structural rendering (solid lines)
      const grad = ctx.createLinearGradient(atomA.x, atomA.y, atomB.x, atomB.y);
      grad.addColorStop(0, colorA);
      grad.addColorStop(1, colorB);

      // Determine highlight state
      const isHoveredAtomA = hoveredElementRef.current && !hoveredElementRef.current.isBond && hoveredElementRef.current.atomId === atomA.id;
      const isHoveredAtomB = hoveredElementRef.current && !hoveredElementRef.current.isBond && hoveredElementRef.current.atomId === atomB.id;
      const isHoveredBond = hoveredElementRef.current && hoveredElementRef.current.isBond && 
        (hoveredElementRef.current.bondKey === `${bd.a}-${bd.b}` || hoveredElementRef.current.bondKey === `${bd.b}-${bd.a}`);
      
      const isHighlighted = isHoveredAtomA || isHoveredAtomB || isHoveredBond;

      const offsets = order === 1 ? [0] : order === 2 ? [-3, 3] : [-5, 0, 5];
      offsets.forEach((off) => {
        const px = -ny * off, py = nx * off;
        ctx.beginPath();
        ctx.moveTo(atomA.x + px, atomA.y + py);
        ctx.lineTo(atomB.x + px, atomB.y + py);
        ctx.strokeStyle = grad;
        // In simple 2D mode, bonds are subtle by default, fully visible on hover/highlight
        ctx.lineWidth = isHighlighted ? 2.5 : (vmode === "simple" ? 1.5 : 2);
        ctx.globalAlpha = isHighlighted ? 0.95 : (vmode === "simple" ? 0.15 : 0.8);
        // Ionic bonds are electrostatic attraction, not a shared electron pair —
        // rendered dashed to visually distinguish from solid covalent bonds
        // (explained in the Simple Mode one-time legend).
        ctx.setLineDash(isIonic ? [5, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // ── Shared bonding orbital visualization in Bohr mode ──
      if (vmode === "bohr") {
        const rValA = shellRadius(elA.shells.length - 1);
        const rValB = shellRadius(elB.shells.length - 1);
        const x_min = -dist / 2 - rValA;
        const x_max = dist / 2 + rValB;
        const x_c = (x_min + x_max) / 2;
        const a = (x_max - x_min) / 2;
        const w = 24; // lobe width of the figure-eight
        const pm = { x: (atomA.x + atomB.x) / 2, y: (atomA.y + atomB.y) / 2 };

        offsets.forEach((off) => {
          // Draw orbital track
          ctx.beginPath();
          for (let step = 0; step <= 60; step++) {
            const t = (step / 60) * Math.PI * 2;
            const x_local = x_c + a * Math.cos(t);
            const y_local = off + w * Math.sin(2 * t);
            const px = x_local * nx - y_local * ny + pm.x;
            const py = x_local * ny + y_local * nx + pm.y;
            if (step === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = 0.09;
          ctx.stroke();

          // Animate electron pair traversing the loop
          const timePhase = (performance.now() / 240) * orbitSpeedRef.current;
          const phases = [timePhase, timePhase + Math.PI];
          phases.forEach((t) => {
            const x_local = x_c + a * Math.cos(t);
            const y_local = off + w * Math.sin(2 * t);
            const px = x_local * nx - y_local * ny + pm.x;
            const py = x_local * ny + y_local * nx + pm.y;

            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = colorA;
            ctx.shadowBlur = 6;
            ctx.globalAlpha = 0.95;
            ctx.fill();
            ctx.shadowBlur = 0;
          });
        });
      }

      ctx.restore();
    });

    // ── atoms ──
    atoms.forEach((atom) => {
      const el = getElement(atom.sym);
      const colorHex = `#${el.color.toString(16).padStart(6, "0")}`;
      const isSel = selected?.id === atom.id;
      const pulse = 1 + Math.sin(performance.now() / 700) * 0.025;

      if (vmode === "simple") {
        ctx.beginPath();
        ctx.arc(atom.x, atom.y, NUCLEUS_R * 1.45 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = colorHex;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
        if (isSel) {
          ctx.save();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(atom.x, atom.y, NUCLEUS_R * 1.45 + 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(atom.sym, atom.x, atom.y);

        // Upgrade #4.2.1: persistent element name label, not just the symbol.
        ctx.font = "600 10px sans-serif";
        ctx.fillStyle = "#334155";
        ctx.textBaseline = "top";
        ctx.fillText(el.name, atom.x, atom.y + NUCLEUS_R * 1.45 + 5);
        return;
      }

      // outer glow — tight and subtle so bonded atoms don't create a starburst at overlap
      const glowR = shellRadius(el.shells.length - 1) + 8;
      const grad = ctx.createRadialGradient(atom.x, atom.y, NUCLEUS_R, atom.x, atom.y, glowR);
      grad.addColorStop(0, colorHex + "18");
      grad.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(atom.x, atom.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // shells + electrons
      const atomBonds = bonds.filter(b => b.a === atom.id || b.b === atom.id);
      const isBonded = atomBonds.length > 0;
      const sharedCount = atomBonds.reduce((sum, b) => sum + b.order, 0);

      // Upgrade #4.1.3: ionic charge badge. The lower-electronegativity atom in
      // an ionic bond gives up its electron(s) (cation, +); the higher one
      // takes them (anion, −). Falls back to null (no badge) if either atom's
      // electronegativity is unknown (e.g. noble gases).
      let ionicCharge = null;
      for (const b of atomBonds) {
        if (b.type !== "ionic") continue;
        const otherId = b.a === atom.id ? b.b : b.a;
        const other = atoms.find(a => a.id === otherId);
        if (!other) continue;
        const otherEl = getElement(other.sym);
        if (el.en == null || otherEl.en == null) continue;
        ionicCharge = el.en < otherEl.en ? "+" : "−";
        break;
      }

      el.shells.forEach((count, idx) => {
        const isValence = idx === el.shells.length - 1;
        let electronCount = count;
        if (isBonded && isValence) {
          electronCount = Math.max(0, count - sharedCount);
        }

        const r = shellRadius(idx);
        ctx.beginPath();
        ctx.strokeStyle = colorHex;
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = 1;
        ctx.arc(atom.x, atom.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        if (electronCount > 0) {
          const dir = idx % 2 === 0 ? 1 : -1;
          const speed = 4 - idx * 0.9;
          // Upgrade #4.1.1: remaining valence electrons on an already-bonded atom
          // are lone pairs — draw them as paired amber dots with a distinct glow
          // so they read differently from the white, colored-glow bonding-pair
          // dots drawn in the bond loop above, and from ordinary shell electrons.
          const isLonePairShell = isBonded && isValence;
          if (isLonePairShell) {
            const pairCount = Math.ceil(electronCount / 2);
            for (let p = 0; p < pairCount; p++) {
              const electronsInPair = (p === pairCount - 1 && electronCount % 2 === 1) ? 1 : 2;
              const ang = (p / pairCount) * Math.PI * 2 + atom.shellAngle * speed * dir;
              const cx = atom.x + Math.cos(ang) * r;
              const cy = atom.y + Math.sin(ang) * r;
              const perpAng = ang + Math.PI / 2;
              const spread = 3.4;
              for (let k = 0; k < electronsInPair; k++) {
                const off = electronsInPair === 2 ? (k === 0 ? -spread / 2 : spread / 2) : 0;
                const ex = cx + Math.cos(perpAng) * off;
                const ey = cy + Math.sin(perpAng) * off;
                ctx.beginPath();
                ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
                ctx.fillStyle = "#fde68a";
                ctx.shadowColor = "#f59e0b";
                ctx.shadowBlur = 7;
                ctx.fill();
              }
            }
            ctx.shadowBlur = 0;
          } else {
            for (let e = 0; e < electronCount; e++) {
              const ang = (e / electronCount) * Math.PI * 2 + atom.shellAngle * speed * dir;
              const ex = atom.x + Math.cos(ang) * r;
              const ey = atom.y + Math.sin(ang) * r;
              ctx.beginPath();
              ctx.arc(ex, ey, 2.4, 0, Math.PI * 2);
              ctx.fillStyle = colorHex;
              ctx.shadowColor = colorHex;
              ctx.shadowBlur = 5;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }
      });

      // nucleus
      const nGrad = ctx.createRadialGradient(atom.x - 4, atom.y - 4, 1, atom.x, atom.y, NUCLEUS_R);
      nGrad.addColorStop(0, colorHex);
      nGrad.addColorStop(1, colorHex + "aa");
      ctx.beginPath();
      ctx.arc(atom.x, atom.y, NUCLEUS_R * pulse, 0, Math.PI * 2);
      ctx.fillStyle = nGrad;
      ctx.fill();

      if (isSel) {
        ctx.save();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(atom.x, atom.y, shellRadius(el.shells.length) + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Ionic charge badge — small +/- pill near the nucleus, offset to the
      // upper-right so it doesn't cover the element symbol.
      if (ionicCharge) {
        const bx = atom.x + NUCLEUS_R * 0.75;
        const by = atom.y - NUCLEUS_R * 0.75;
        ctx.beginPath();
        ctx.arc(bx, by, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = ionicCharge === "+" ? "#dc2626" : "#2563eb";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.4;
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ionicCharge, bx, by + 0.5);
      }

      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(atom.sym, atom.x, atom.y);
    });



    // Particles disabled as per user request

    ctx.restore();
  }, [selected]);

  // ───────────────────────── ANIMATION LOOP ─────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined" && canvas) {
      resizeObserver = new ResizeObserver(() => {
        resize();
      });
      resizeObserver.observe(canvas);
    }

    const loop = (t) => {
      const dt = Math.min(0.05, (t - lastTime.current) / 1000);
      lastTime.current = t;
      // Upgrade #4.3.2: pause the 2D physics simulation while 3D mode is active.
      // Atoms/bonds stay frozen in place underneath the 3D viewer overlay rather
      // than continuing to drift, settle, or orbit while unseen — so switching
      // back to Bohr/Simple mode shows exactly what you left.
      if (visualModeRef.current !== "3d") {
        // Upgrade #5.1: simSpeed 0 = paused (physics frozen; advance only via
        // the explicit Step button), otherwise dt is scaled for slow motion.
        const speed = simSpeedRef.current;
        if (speed > 0) physicsTick(dt * speed);
        engineTick(dt);
      }
      // Upgrade #2.5: re-assert content-aware pan bounds every frame — cheap,
      // idempotent, and catches cases the discrete handlers don't (e.g. new
      // atoms/molecules spawning in while the view is panned far away).
      if (!isPanning.current) {
        panRef.current = clampPanToContent(panRef.current, zoomRef.current);
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [physicsTick, engineTick, draw]);

  // Upgrades #2.2/#2.4: find a spot near (desiredX, desiredY) with no existing
  // atom within groupRadius+minGap, so newly-spawned molecule groups land near
  // whatever's already on the canvas without stacking on top of it. Deliberately
  // NOT used for single dragged/dropped atoms — a user dragging one atom next to
  // another is trying to bond them, and this would fight that.
  const findFreePlacement = (desiredX, desiredY, groupRadius) => {
    const existing = atomsRef.current;
    const minGap = 40;
    const isClear = (cx, cy) => existing.every((a) => Math.hypot(a.x - cx, a.y - cy) > groupRadius + minGap);
    if (existing.length === 0 || isClear(desiredX, desiredY)) return { x: desiredX, y: desiredY };

    const step = 40;
    for (let ring = 1; ring <= 40; ring++) {
      const ringRadius = ring * step;
      const pointsOnRing = Math.max(6, ring * 6);
      for (let p = 0; p < pointsOnRing; p++) {
        const angle = (p / pointsOnRing) * Math.PI * 2;
        const cx = desiredX + ringRadius * Math.cos(angle);
        const cy = desiredY + ringRadius * Math.sin(angle);
        if (isClear(cx, cy)) return { x: cx, y: cy };
      }
    }
    return { x: desiredX, y: desiredY }; // give up gracefully rather than search forever
  };

  const worldPos = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = clientX - rect.left - canvas.width / 2 - panRef.current.x;
    const cy = clientY - rect.top - canvas.height / 2 - panRef.current.y;
    return { x: cx / zoomRef.current, y: cy / zoomRef.current };
  };

  const handleMouseDown = (e) => {
    const { x, y } = worldPos(e.clientX, e.clientY);
    const hit = atomsRef.current.find((a) => Math.hypot(a.x - x, a.y - y) < 30);
    if (hit) {
      dragId.current = hit.id;
      dragOffset.current = { x: x - hit.x, y: y - hit.y };
      setSelected({ id: hit.id, sym: hit.sym });
    } else {
      setSelected(null);
      // Upgrade #2.1: dragging empty canvas space pans the view instead of doing nothing.
      isPanning.current = true;
      panStart.current = {
        mouseX: e.clientX, mouseY: e.clientY,
        panX: panRef.current.x, panY: panRef.current.y,
      };
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning.current) {
      const rawPan = {
        x: panStart.current.panX + (e.clientX - panStart.current.mouseX),
        y: panStart.current.panY + (e.clientY - panStart.current.mouseY),
      };
      // Upgrade #2.5: content-aware navigation — free panning, softly bounded
      // so existing molecules can't be dragged out of reach entirely.
      panRef.current = clampPanToContent(rawPan, zoomRef.current);
      return;
    }
    if (!dragId.current) {
      const { x, y } = worldPos(e.clientX, e.clientY);
      const hovered = atomsRef.current.find((a) => Math.hypot(a.x - x, a.y - y) < 30);
      if (hovered) {
        const el = getElement(hovered.sym);
        setHoveredElement({
          el, x: e.clientX, y: e.clientY,
          atomId: hovered.id,
          shells: visualModeRef.current === "bohr" ? hovered.shells : null,
        });
      } else {
        // Check for hovered bond (Simple 2D mode specific feature)
        let hoveredBond = null;
        for (const bd of bondsRef.current) {
          const a1 = atomsRef.current.find((a) => a.id === bd.a);
          const a2 = atomsRef.current.find((a) => a.id === bd.b);
          if (!a1 || !a2) continue;
          
          const dx = a2.x - a1.x, dy = a2.y - a1.y;
          const l2 = dx * dx + dy * dy;
          if (l2 === 0) continue;
          
          let t = ((x - a1.x) * dx + (y - a1.y) * dy) / l2;
          t = Math.max(0, Math.min(1, t));
          const px = a1.x + t * dx;
          const py = a1.y + t * dy;
          const dist = Math.hypot(x - px, y - py);
          if (dist < 8) {
            hoveredBond = bd;
            break;
          }
        }
        
        if (hoveredBond) {
          const typeStr = hoveredBond.type === "ionic" ? "Ionic" : "Covalent";
          const order = Number(hoveredBond.order);
          const orderStr = order === 3 ? "Triple" : order === 2 ? "Double" : "Single";
          setHoveredElement({
            isBond: true,
            text: `${orderStr} ${typeStr} Bond`,
            x: e.clientX,
            y: e.clientY,
            bondKey: `${hoveredBond.a}-${hoveredBond.b}`
          });
        } else {
          setHoveredElement(null);
        }
      }
    }
    if (!dragId.current) return;
    const { x, y } = worldPos(e.clientX, e.clientY);
    const atom = atomsRef.current.find((a) => a.id === dragId.current);
    if (!atom) return;

    const newX = x - dragOffset.current.x;
    const newY = y - dragOffset.current.y;
    const movDx = newX - atom.x;
    const movDy = newY - atom.y;
    atom.x = newX;
    atom.y = newY;
    atom.vx = 0; atom.vy = 0;

  };

  const handleMouseUp = () => {
    isPanning.current = false;
    const wasDragging = dragId.current;
    dragId.current = null;

    // If we dragged a molecule atom, recompute target layout at the molecule's new centroid
    if (wasDragging && committedCompound.current) {
      const { aligned, entry, normalizedPositions } = committedCompound.current;
      const alignedIds = new Set(aligned.map(a => a.id));
      if (alignedIds.has(wasDragging)) {
        const cx = aligned.reduce((s, a) => s + a.x, 0) / aligned.length;
        const cy = aligned.reduce((s, a) => s + a.y, 0) / aligned.length;
        const newCentroid = { x: cx, y: cy };

        let newTargets;
        if (normalizedPositions) {
          // Fast path: denormalize stored layout at new centroid (no re-optimization)
          newTargets = denormalizePositions(normalizedPositions, newCentroid);
        } else {
          // Fallback for coordination compounds (they don't store normalized positions)
          const coordInfo = detectCoordinationCompound(entry);
          if (coordInfo) {
            const rawPositions = buildCoordinationLayout(entry, coordInfo, newCentroid);
            newTargets = aligned.map((_, i) => rawPositions[i]);
          } else {
            const r = Math.max(60, aligned.length * 25);
            newTargets = aligned.map((_, i) => ({
              x: cx + r * Math.cos((2 * Math.PI * i) / aligned.length),
              y: cy + r * Math.sin((2 * Math.PI * i) / aligned.length),
            }));
          }
        }

        committedCompound.current = { ...committedCompound.current, targetPositions: newTargets };

        const rlMap = new Map();
        entry.bonds.forEach(bd => {
          const pa = newTargets[bd.from], pb = newTargets[bd.to];
          if (pa && pb) {
            const key = `${aligned[bd.from].id}-${aligned[bd.to].id}`;
            rlMap.set(key, Math.hypot(pb.x - pa.x, pb.y - pa.y));
          }
        });
        bondRestLengths.current = rlMap;
        isStable.current = false;
      }
    }
  };

  const handleCanvasMouseLeave = () => {
    handleMouseUp();
    setHoveredElement(null);
  };


  const handleWheel = (e) => {
    e.preventDefault();
    setZoom((z) => {
      const newZoom = Math.max(0.4, Math.min(2.2, z * (e.deltaY > 0 ? 0.92 : 1.08)));
      // Upgrade #2.5: bounds are zoom-dependent (same pan can go from valid to
      // out-of-reach as zoom shrinks content), so re-clamp right away.
      panRef.current = clampPanToContent(panRef.current, newZoom);
      return newZoom;
    });
  };

  // Upgrade #2.3: zoom and pan so every atom on the canvas is in view, centered.
  const fitAll = () => {
    const canvas = canvasRef.current;
    const atoms = atomsRef.current;
    if (!canvas || atoms.length === 0) {
      panRef.current = { x: 0, y: 0 };
      setZoom(1);
      return;
    }
    const xs = atoms.map((a) => a.x);
    const ys = atoms.map((a) => a.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);
    const margin = 120; // canvas-px padding, plus room for atom radius/labels
    const availW = Math.max(canvas.width - margin * 2, 50);
    const availH = Math.max(canvas.height - margin * 2, 50);
    const newZoom = Math.max(0.4, Math.min(2.2, Math.min(availW / spanX, availH / spanY)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    panRef.current = { x: -centerX * newZoom, y: -centerY * newZoom };
    setZoom(newZoom);
  };

  const resetView = () => {
    panRef.current = { x: 0, y: 0 };
    setZoom(1);
  };

  // Upgrade #5.1: advance the physics simulation by exactly one fixed tick.
  // Only meaningful (and only exposed in the UI) while simSpeed is 0/paused —
  // the render loop is still running for drawing/pan, it just isn't feeding
  // physicsTick any time on its own, so this is the only thing that moves
  // atoms/bonds forward.
  const stepSimulation = () => {
    if (visualModeRef.current === "3d") return;
    physicsTick(STEP_DT);
    engineTick(STEP_DT);
    draw();
  };

  const addAtomToCanvas = (sym, x, y, particleCount = 10) => {
    const el = getElement(sym);
    if (!el) return;
    const id = idCounter.current++;
    atomsRef.current.push({
      id, sym, x, y, vx: 0, vy: 0,
      shellAngle: Math.random() * 10, shells: el.shells,
      instability: 1, vibPhase: Math.random() * 10,
    });
    spawnParticles(x, y, el.color, particleCount);
    setCounts({ atoms: atomsRef.current.length, bonds: bondsRef.current.length });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const sym = e.dataTransfer.getData("symbol");
    if (!sym) return;
    const { x, y } = worldPos(e.clientX, e.clientY);
    addAtomToCanvas(sym, x, y, 10);
  };

  // Element search "Enter" behavior (Upgrade #1): place the highlighted element near
  // the canvas center, same spawn path as a drag-and-drop, just without drop coordinates.
  const addElementFromSearch = (sym) => {
    const jitter = () => (Math.random() - 0.5) * 40;
    const { x, y } = findFreePlacement(jitter(), jitter(), 30);
    addAtomToCanvas(sym, x, y, 10);
  };

  const clearAll = () => {
    atomsRef.current = [];
    bondsRef.current = [];
    committedCompound.current = null;
    isStable.current = false;
    lastInventoryFp.current = null;
    bondRestLengths.current = new Map();
    activeTarget.current = null;
    clearLayoutCache();
    setSelected(null);
    setLastReaction(null);
    setReactionToasts([]);
    setDiagnostics([]);
    setPubchemStatus(null);
    setCounts({ atoms: 0, bonds: 0 });
    setMode("setup");
    setReactionEquation("Awaiting reactants... Build your experiment and click Start.");
  };

  /**
   * Handles spawning the products of a molecule-level reaction.
   * Resolves all product blueprints in parallel, ensuring a transactional
   * all-or-nothing execution before removing reactants.
   *
   * @param {object} result - The reaction engine result object
   */
  const handleMoleculeReaction = async (result) => {
    const reactantAtomIds = new Set();
    const reactantBondIds = new Set();
    
    result.molecules.forEach(m => {
      if (result.reactantFormulas.includes(m.formula)) {
        m.atomIds.forEach(id => reactantAtomIds.add(id));
        m.bondIds.forEach(id => reactantBondIds.add(id));
      }
    });

    const reactingAtoms = atomsRef.current.filter(a => reactantAtomIds.has(a.id));
    if (reactingAtoms.length === 0) return;

    const reactionCentroid = {
      x: reactingAtoms.reduce((s, a) => s + a.x, 0) / reactingAtoms.length,
      y: reactingAtoms.reduce((s, a) => s + a.y, 0) / reactingAtoms.length,
    };

    setPubchemStatus("searching");
    setReactionEquation("Resolving products...");

    try {
      // 1. Resolve ALL product blueprints in parallel (Promise.all)
      const blueprints = await Promise.all(
        result.productFormulas.map(async (formula) => {
          const subAtoms = expandFormulaToAtoms(formula);
          if (subAtoms.length <= 1) {
            return { formula, reactants: subAtoms, bonds: [] };
          }
          const fp = fingerprint(subAtoms);
          return findCompoundEntry(fp, subAtoms);
        })
      );

      // 2. All-or-Nothing check: Did every product blueprint resolve?
      const allResolved = blueprints.every(bp => bp !== null);
      if (!allResolved) {
        console.warn("[Molecule Reaction] One or more product blueprints failed to resolve. Aborting reaction.");
        setPubchemStatus("not-found");
        setReactionEquation("No reaction possible (could not verify product structures).");
        return;
      }

      // 3. Execution: delete reactants since everything resolved
      atomsRef.current = atomsRef.current.filter(a => !reactantAtomIds.has(a.id));
      bondsRef.current = bondsRef.current.filter(b => !reactantBondIds.has(b.id));

      let totalSpawnedAtoms = 0;
      const n = result.productFormulas.length;

      // 4. Spawn products in sequence, computing distinct centers
      for (let i = 0; i < n; i++) {
        const formula = result.productFormulas[i];
        const blueprint = blueprints[i];
        const subAtoms = expandFormulaToAtoms(formula);
        const radius = subAtoms.length === 1 ? 0 : Math.max(80, subAtoms.length * 28);

        let desiredCenter;
        if (n === 1) {
          desiredCenter = reactionCentroid;
        } else if (n === 2) {
          desiredCenter = {
            x: reactionCentroid.x + (i === 0 ? -130 : 130),
            y: reactionCentroid.y,
          };
        } else {
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
          const dist = Math.max(120, n * 80);
          desiredCenter = {
            x: reactionCentroid.x + dist * Math.cos(angle),
            y: reactionCentroid.y + dist * Math.sin(angle),
          };
        }

        const center = findFreePlacement(desiredCenter.x, desiredCenter.y, radius);

        let targetPositions = null;
        if (blueprint && blueprint.reactants && blueprint.reactants.length > 1) {
          const coordInfo = detectCoordinationCompound(blueprint);
          if (coordInfo) {
            const rawPositions = buildCoordinationLayout(blueprint, coordInfo, center);
            targetPositions = blueprint.reactants.map((_, idx) => rawPositions[idx]);
          } else {
            targetPositions = await selectBestLayout(blueprint, center);
          }
        }

        const blueprintWithTarget = blueprint ? { ...blueprint, targetPositions } : null;
        const count = spawnMoleculeAtPosition(formula, blueprintWithTarget, center);
        totalSpawnedAtoms += count;
      }

      setPubchemStatus(null);
      setCounts({ atoms: atomsRef.current.length, bonds: bondsRef.current.length });

      // Update UI states
      const equationStr = buildMoleculeEquation(result.reactantFormulas, result.productFormulas);
      setReactionEquation({ type: "molecule_reaction", equationStr });

      const productsLabel = getProductsLabel(result.entry);
      setLastReaction({
        ...result.entry,
        formula: productsLabel,
        atomCount: totalSpawnedAtoms,
      });

      const productLabels = result.entry.products.map((p) =>
        (p.coefficient > 1 ? String(p.coefficient) : "") + p.formula
      );

      setExperimentHistory((prev) => [
        ...prev,
        {
          id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          number: prev.length + 1,
          reactants: result.reactantFormulas,
          products: productLabels,
          fact: result.entry.fact || "No explanation provided.",
          name: result.entry.name,
        },
      ]);

      pushReactionToast(result.entry);
      spawnParticles(reactionCentroid.x, reactionCentroid.y, 0x06b6d4, 20);
      setMode("running");

    } catch (err) {
      console.error("[Molecule Reaction] Error spawning products:", err.message);
      setPubchemStatus("not-found");
      setReactionEquation("Error occurred while executing reaction.");
    }
  };

  /**
   * Spawns a single molecule (or single atom) pre-bonded and positioned correctly
   * centered at target position.
   * Updates atomsRef.current, bondsRef.current, and bondRestLengths.current directly.
   * Does not call setCounts (caller should call it after spawning batches).
   *
   * @param {string} formula - The formula of the molecule to spawn (e.g. "NaCl", "H2O")
   * @param {object|null} blueprint - The resolved compound entry from findCompoundEntry,
   *                                  or null if none was resolved (fallback to circular loose atoms)
   * @param {{x: number, y: number}} center - The desired centroid target coordinate
   * @returns {number} - The number of atoms successfully spawned
   */
  const spawnMoleculeAtPosition = (formula, blueprint, center) => {
    const subAtoms = expandFormulaToAtoms(formula);
    if (subAtoms.length === 0) return 0;

    // 1. Single-atom case (e.g. "H" or element-only formula)
    if (subAtoms.length === 1) {
      const sym = subAtoms[0];
      const el = getElement(sym.charAt(0).toUpperCase() + sym.slice(1).toLowerCase())
               || getElement(sym.toUpperCase())
               || getElement(sym);
      if (!el) return 0;
      const id = idCounter.current++;
      atomsRef.current.push({
        id, sym: el.sym, x: center.x, y: center.y, vx: 0, vy: 0,
        shellAngle: Math.random() * 10, shells: el.shells,
        instability: 1, vibPhase: Math.random() * 10,
      });
      spawnParticles(center.x, center.y, el.color, 8);
      return 1;
    }

    // 2. Verified blueprint case (structures and bonds pre-resolved)
    if (blueprint && Array.isArray(blueprint.bonds)) {
      const countPerMolecule = blueprint.reactants.length;
      let targetPositions;
      const coordInfo = detectCoordinationCompound(blueprint);
      if (coordInfo) {
        const rawPositions = buildCoordinationLayout(blueprint, coordInfo, center);
        targetPositions = blueprint.reactants.map((_, i) => rawPositions[i]);
      } else {
        targetPositions = blueprint.targetPositions || buildCircularLayout(blueprint, center);
      }

      const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const formattedFormula = formatFormulaUnicode(blueprint.formula);

      const spawnedAtoms = [];
      blueprint.reactants.forEach((sym, idx) => {
        const el = getElement(sym);
        const pos = targetPositions[idx] || center;
        const id = idCounter.current++;
        const newAtom = {
          id, sym: el?.sym || sym, x: pos.x, y: pos.y, vx: 0, vy: 0,
          shellAngle: Math.random() * 10,
          shells: el?.shells || [1],
          instability: 1,
          vibPhase: Math.random() * 10,
          spawnGroupId: groupId,
          spawnGroupFormula: formattedFormula,
          spawnGroupSize: countPerMolecule,
        };
        atomsRef.current.push(newAtom);
        spawnedAtoms.push(newAtom);
        spawnParticles(pos.x, pos.y, el?.color || 0xcccccc, 8);
      });

      blueprint.bonds.forEach((bd) => {
        const atomA = spawnedAtoms[bd.from];
        const atomB = spawnedAtoms[bd.to];
        if (atomA && atomB) {
          const elA = getElement(atomA.sym);
          const elB = getElement(atomB.sym);
          const bondId = `${atomA.id}-${atomB.id}`;
          bondsRef.current.push({
            id: bondId,
            a: atomA.id, b: atomB.id,
            order: Number(bd.order) || 1, type: bd.type || 'covalent',
            enA: elA?.en ?? 1.0, enB: elB?.en ?? 1.0,
          });
          const dist = Math.hypot(atomB.x - atomA.x, atomB.y - atomA.y);
          bondRestLengths.current.set(bondId, dist);
        }
      });

      return countPerMolecule;
    } else {
      // 3. Unverified compound fallback — spawn circular loose atoms
      const count = subAtoms.length;
      const radius = Math.max(80, count * 28);
      const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const formattedFormula = formatFormulaUnicode(formula);

      subAtoms.forEach((sym, spawnedIdx) => {
        const el = getElement(sym.charAt(0).toUpperCase() + sym.slice(1).toLowerCase())
                 || getElement(sym.toUpperCase())
                 || getElement(sym);
        if (!el) return;

        const angle = (spawnedIdx / count) * Math.PI * 2 - Math.PI / 2;
        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);
        const id = idCounter.current++;
        atomsRef.current.push({
          id, sym: el.sym, x, y, vx: 0, vy: 0,
          shellAngle: Math.random() * 10,
          shells: el.shells,
          instability: 1,
          vibPhase: Math.random() * 10,
          spawnGroupId: groupId,
          spawnGroupFormula: formattedFormula,
          spawnGroupSize: count,
        });
        spawnParticles(x, y, el.color, 8);
      });

      return count;
    }
  };

  /**
   * Expand the current formulaInput into individual atoms and place them
   * on the canvas in a circular arrangement centred at the origin.
   * Clears any existing atoms first so the canvas always shows exactly
   * the atoms that match the formula.
   */
  const spawnAtomsFromFormula = async () => {
    const formula = formulaInput.trim();
    if (!formula) return;

    let s = formula.replace(/\s+/g, "");
    let coefMatch = s.match(/^([0-9]+)(.*)/);
    let coef = 1;
    let subFormula = s;
    if (coefMatch) {
      coef = parseInt(coefMatch[1], 10);
      subFormula = coefMatch[2];
    }

    const subAtoms = expandFormulaToAtoms(subFormula);
    if (subAtoms.length === 0) return;

    // Reset transient visual state
    isStable.current = false;
    lastInventoryFp.current = null;
    clearLayoutCache();
    setSelected(null);
    setLastReaction(null);
    setDiagnostics([]);

    // Clear formula input box immediately
    setFormulaInput("");
    formulaInputRef.current = "";

    // If H or NaCl-type elements of count <= 1, spawn immediately
    if (subAtoms.length <= 1) {
      const spacingRadius = 0;
      const center = findFreePlacement(0, 0, spacingRadius);
      spawnMoleculeAtPosition(subFormula, null, center);
      setCounts({ atoms: atomsRef.current.length, bonds: bondsRef.current.length });
      return;
    }

    setPubchemStatus("searching");
    setReactionEquation("Verifying molecule structure...");

    try {
      const fp = fingerprint(subAtoms);
      const blueprint = await findCompoundEntry(fp, subAtoms);

      if (!blueprint) {
        throw new Error(`Could not verify structure for "${subFormula}"`);
      }

      setPubchemStatus(null);
      setReactionEquation("Awaiting reactants... Build your experiment and click Start.");

      const spacingRadius = subAtoms.length === 1 ? 0 : Math.max(80, subAtoms.length * 28);

      for (let c = 0; c < coef; c++) {
        const existing = atomsRef.current;
        const desired = existing.length > 0
          ? { x: Math.max(...existing.map((a) => a.x)) + spacingRadius + 100, y: 0 }
          : { x: 0, y: 0 };
        const center = findFreePlacement(desired.x, desired.y, spacingRadius);

        // Pre-optimize layout center for this c-th iteration so helper runs sync
        let targetPositions;
        const coordInfo = detectCoordinationCompound(blueprint);
        if (coordInfo) {
          const rawPositions = buildCoordinationLayout(blueprint, coordInfo, center);
          targetPositions = blueprint.reactants.map((_, idx) => rawPositions[idx]);
        } else {
          targetPositions = await selectBestLayout(blueprint, center);
        }

        const blueprintWithTarget = { ...blueprint, targetPositions };
        spawnMoleculeAtPosition(subFormula, blueprintWithTarget, center);
      }

      setCounts({ atoms: atomsRef.current.length, bonds: bondsRef.current.length });
    } catch (err) {
      console.warn(`[Verified Spawn] Blueprint lookup failed for ${formula}, falling back to loose atoms:`, err.message);
      setPubchemStatus("not-found");
      setReactionEquation(`Could not verify "${subFormula}" as a stable molecule. Spawning separate atoms.`);
      
      const spacingRadius = Math.max(80, subAtoms.length * 28);
      for (let c = 0; c < coef; c++) {
        const existing = atomsRef.current;
        const desired = existing.length > 0
          ? { x: Math.max(...existing.map((a) => a.x)) + spacingRadius + 100, y: 0 }
          : { x: 0, y: 0 };
        const center = findFreePlacement(desired.x, desired.y, spacingRadius);
        spawnMoleculeAtPosition(subFormula, null, center);
      }
      setCounts({ atoms: atomsRef.current.length, bonds: bondsRef.current.length });
    }
  };


  const removeSelected = () => {
    if (!selected) return;
    atomsRef.current = atomsRef.current.filter((a) => a.id !== selected.id);
    bondsRef.current = bondsRef.current.filter((b) => b.a !== selected.id && b.b !== selected.id);
    setCounts({ atoms: atomsRef.current.length, bonds: bondsRef.current.length });
    setSelected(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable)) {
          return;
        }
        removeSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected]);

  // ── Unlock ONE loc  // ── Start Reaction ──
  const startReaction = () => {
    const atoms = atomsRef.current;
    if (atoms.length < 2) {
      setReactionEquation("Please add at least 2 atoms to start an experiment.");
      return;
    }

    // ── Molecule-level reaction check (REACTIONS database) ──
    const moleculeEngineResult = runReactionEngine(atoms, bondsRef.current);
    if (moleculeEngineResult.status === REACTION_ENGINE_STATUS.REACTION) {
      handleMoleculeReaction(moleculeEngineResult);
      return;
    }

    setPubchemStatus("searching");
    setReactionEquation("Analyzing experiment...");

    const generation = bumpInventorySearchGeneration();

    const onCommit = async (fp, entry, syms) => {
      if (getInventorySearchGeneration() !== generation) return;

      console.log(`[Start Reaction] Committing compound: ${entry.formula}`);
      lastInventoryFp.current = fp;
      isStable.current = false;

      const aligned = alignAtomsToReactants(
        atomsRef.current.filter(a => syms.includes(a.sym)),
        entry
      );
      if (!aligned || aligned.length !== entry.reactants.length) {
        console.warn('[Start Reaction] Could not align atoms to reactants.');
        setReactionEquation("Error aligning atoms for reaction.");
        setPubchemStatus(null);
        return;
      }

      const centroid = {
        x: aligned.reduce((sum, a) => sum + a.x, 0) / aligned.length,
        y: aligned.reduce((sum, a) => sum + a.y, 0) / aligned.length,
      };

      // Choose target positions
      let targetPositions;
      let normalizedPositions = null;
      const coordInfo = detectCoordinationCompound(entry);
      if (coordInfo) {
        const rawPositions = buildCoordinationLayout(entry, coordInfo, centroid);
        targetPositions = aligned.map((_, i) => rawPositions[i]);
        normalizedPositions = normalizePositions(targetPositions, entry.bonds);
      } else {
        targetPositions = await selectBestLayout(entry, centroid);
        if (getInventorySearchGeneration() !== generation) return;
        normalizedPositions = normalizePositions(targetPositions, entry.bonds);
      }

      // Write authoritative bonds
      const newBonds = entry.bonds.map(bd => {
        const atomA = aligned[bd.from], atomB = aligned[bd.to];
        const elA = getElement(atomA.sym), elB = getElement(atomB.sym);
        return {
          id: `${atomA.id}-${atomB.id}`,
          a: atomA.id, b: atomB.id,
          order: Number(bd.order) || 1, type: bd.type || 'covalent',
          enA: elA?.en ?? 1.0, enB: elB?.en ?? 1.0,
        };
      });

      const involvedIds = new Set(aligned.map(a => a.id));
      bondsRef.current = [
        ...bondsRef.current.filter(b => !involvedIds.has(b.a) && !involvedIds.has(b.b)),
        ...newBonds,
      ];

      committedCompound.current = { fp, entry, aligned, targetPositions, normalizedPositions };
      isStable.current = false;
      activeTarget.current = null;

      // Build bond rest lengths for spring-based drag physics
      const rlMap = new Map();
      entry.bonds.forEach(bd => {
        const pa = targetPositions[bd.from], pb = targetPositions[bd.to];
        if (pa && pb) {
          const key = `${aligned[bd.from].id}-${aligned[bd.to].id}`;
          rlMap.set(key, Math.hypot(pb.x - pa.x, pb.y - pa.y));
        }
      });
      bondRestLengths.current = rlMap;

      setCounts({ atoms: atomsRef.current.length, bonds: bondsRef.current.length });

      // Update Reactions Bar with raw reaction entry and aligned canvas atoms for dynamic display mode formatting
      setReactionEquation({ type: "reaction", entry, alignedAtoms: aligned });

      // Record completed products in the Lab Notebook (lastReaction)
      setLastReaction({ ...entry, atomCount: aligned.length });

      // Append reaction event to session-persistent Lab Notebook Experiment History
      const reactantMolecules = (() => {
        const groupCounts = {};
        for (const a of aligned) {
          if (a.spawnGroupId) {
            groupCounts[a.spawnGroupId] = (groupCounts[a.spawnGroupId] || 0) + 1;
          }
        }

        const completeGroups = new Map();
        const individualCounts = {};

        for (const a of aligned) {
          if (a.spawnGroupId && a.spawnGroupSize && groupCounts[a.spawnGroupId] === a.spawnGroupSize) {
            completeGroups.set(a.spawnGroupId, a.spawnGroupFormula);
          } else {
            individualCounts[a.sym] = (individualCounts[a.sym] || 0) + 1;
          }
        }

        const results = [];
        const sortedGroupFormulas = Array.from(completeGroups.values()).sort();
        sortedGroupFormulas.forEach((formula) => {
          results.push(formula);
        });

        const sortedAtoms = Object.keys(individualCounts).sort((a, b) => {
          if (a === "C") return -1;
          if (b === "C") return 1;
          if (a === "H") return -1;
          if (b === "H") return 1;
          return a.localeCompare(b);
        });
        sortedAtoms.forEach((sym) => {
          const count = individualCounts[sym];
          const display = count > 1 ? `${count}${sym}` : sym;
          results.push(display);
        });

        return results;
      })();

      const products = entry.formula.split("+").map(p => p.trim());

      setExperimentHistory(prev => [
        ...prev,
        {
          id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          number: prev.length + 1,
          reactants: reactantMolecules,
          products,
          fact: entry.fact || "No explanation provided.",
          name: entry.name,
        }
      ]);

      pushReactionToast(entry);
      setPubchemStatus(`found:${entry.name}`);
      spawnParticles(centroid.x, centroid.y, 0x06b6d4, 20);

      // Trigger reaction animations
      setMode("running");
    };

    const statusHandler = (status) => {
      setPubchemStatus(status);
      if (status === "not-found") {
        setReactionEquation("No reaction possible with the current reactants.");
      } else if (status === "searching") {
        setReactionEquation("Searching PubChem for reaction data...");
      } else if (status === "ai-generating") {
        setReactionEquation("Gemini is analyzing the chemical reaction...");
      }
    };

    runInventorySearch(atoms, generation, onCommit, statusHandler);
  };

  const getAllPossibleReactions = () => {
    const allAtoms = atomsRef.current;
    if (allAtoms.length < 2) return [];

    const possible = [];
    for (const fp in REACTIONS) {
      const entry = REACTIONS[fp];
      const group = pickAtomsForEntry(allAtoms, entry);
      if (group) {
        possible.push(entry);
      }
    }
    return possible;
  };

  const selEl = selected ? getElement(selected.sym) : null;
  const selAtom = selected ? atomsRef.current.find((a) => a.id === selected.id) : null;
  const selBondCount = selected ? bondsRef.current.filter((b) => b.a === selected.id || b.b === selected.id).length : 0;
  const selMolecule = selected ? getMoleculeForAtom(selected.id, atomsRef.current, bondsRef.current) : null;

  const {
    chatMessages, chatInput, setChatInput, chatExpanded, setChatExpanded, sendChatMessage, useAI, setUseAI,
    settingsOpen, setSettingsOpen, isWaitingForAI
  } = useChatAssistant({
    atomsRef, idCounter, clearAll, setCounts, setTempK, setPressureAtm,
    selectedAtom: selected,
    selectedMolecule: selMolecule,
    currentMolecules,
    reactionEquation,
    experimentHistory,
  });


  const presetExperiment = (kind) => {
    clearAll();
    setTimeout(() => {
      if (kind === "water") {
        atomsRef.current = [
          { id: idCounter.current++, sym: "H", x: -55, y: 0, vx: 0, vy: 0, shellAngle: 0, shells: [1], instability: 1, vibPhase: 0 },
          { id: idCounter.current++, sym: "H", x: 55, y: 0, vx: 0, vy: 0, shellAngle: 1, shells: [1], instability: 1, vibPhase: 1 },
          { id: idCounter.current++, sym: "O", x: 0, y: 0, vx: 0, vy: 0, shellAngle: 2, shells: [2, 6], instability: 1, vibPhase: 2 },
        ];
        setTempK(520);
        setPressureAtm(1);
      } else if (kind === "salt") {
        atomsRef.current = [
          { id: idCounter.current++, sym: "Na", x: -45, y: 0, vx: 0, vy: 0, shellAngle: 0, shells: [2, 8, 1], instability: 1, vibPhase: 0 },
          { id: idCounter.current++, sym: "Cl", x: 45, y: 0, vx: 0, vy: 0, shellAngle: 1, shells: [2, 8, 7], instability: 1, vibPhase: 1 },
        ];
        setTempK(298);
        setPressureAtm(1);
      } else if (kind === "hcl") {
        atomsRef.current = [
          { id: idCounter.current++, sym: "H", x: -45, y: 0, vx: 0, vy: 0, shellAngle: 0, shells: [1], instability: 1, vibPhase: 0 },
          { id: idCounter.current++, sym: "Cl", x: 45, y: 0, vx: 0, vy: 0, shellAngle: 1, shells: [2, 8, 7], instability: 1, vibPhase: 1 },
        ];
        setTempK(310);
        setPressureAtm(1);
      } else if (kind === "stuck") {
        // Deliberately placed far apart, cold, and under-pressured, with conditions left
        // exactly as the user last set them — demonstrates the engine auto-correcting
        // temperature/pressure AND pulling distant atoms together, unprompted, within 4s.
        atomsRef.current = [
          { id: idCounter.current++, sym: "H", x: -260, y: -40, vx: 0, vy: 0, shellAngle: 0, shells: [1], instability: 1, vibPhase: 0 },
          { id: idCounter.current++, sym: "F", x: 240, y: 60, vx: 0, vy: 0, shellAngle: 1, shells: [2, 7], instability: 1, vibPhase: 1 },
        ];
        setTempK(150);
        setPressureAtm(0.4);
      }
      setCounts({ atoms: atomsRef.current.length, bonds: 0 });
      bondsRef.current = [];
      setLastReaction(null);
      setDiagnostics([]);
    }, 50);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: themeVars.bgApp, color: themeVars.textPrimary, fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: "14.5px", overflow: "hidden", transition: "background 0.3s ease, color 0.3s ease" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        
        body {
          font-size: 14.5px;
        }

        .clb-btn { 
          background: ${themeVars.btnBg}; 
          border: 1px solid ${themeVars.btnBorder}; 
          color: ${themeVars.btnText}; 
          border-radius: 8px; 
          padding: 8px 16px; 
          font-size: 14.5px; 
          font-weight: 500; 
          cursor: pointer; 
          font-family: inherit; 
          transition: all .15s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .clb-btn:hover { 
          background: ${themeVars.btnHover}; 
          border-color: ${themeVars.borderAccent}; 
          color: ${themeVars.textPrimary}; 
        }
        .clb-btn:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 1px;
        }
        .clb-btn.active { 
          background: #2563eb; 
          border-color: #2563eb; 
          color: #ffffff; 
          box-shadow: 0 2px 4px rgba(37,99,235,0.15);
        }
        .clb-btn.active:hover {
          background: #1d4ed8;
          border-color: #1d4ed8;
        }
        .clb-elem { 
          cursor: grab; 
          position: relative; 
          z-index: 1; 
          transition: transform 0.12s ease, filter 0.12s ease; 
        }
        .clb-elem:hover { 
          z-index: 99; 
          transform: scale(1.08);
        }
        input[type=range] { 
          accent-color: #2563eb; 
          cursor: pointer;
        }
        ::-webkit-scrollbar { 
          width: 6px; 
          height: 6px; 
        }
        ::-webkit-scrollbar-track {
          background: ${themeVars.scrollTrack};
        }
        ::-webkit-scrollbar-thumb { 
          background: ${themeVars.scrollThumb}; 
          border-radius: 3px; 
        }
        ::-webkit-scrollbar-thumb:hover { 
          background: ${themeVars.scrollThumbHover}; 
        }
        input::placeholder { color: ${themeVars.textMuted}; }
      `}</style>

      {/* HEADER */}
      <HeaderBar
        mode={mode} setMode={setMode}
        startReaction={startReaction}
        clearAll={clearAll}
        searchOnline={searchOnline} toggleSearchOnline={toggleSearchOnline}
        equationMode={equationMode} setEquationMode={setEquationMode}
        settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen}
        useAI={useAI} toggleUseAI={() => setUseAI(v => !v)}
        visualMode={visualMode} setVisualMode={setVisualMode}
        theme={theme} setTheme={handleSetTheme}
      />

      {/* MAIN */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* LEFT PANEL */}
        <div style={{
          width: 320,
          background: themeVars.bgPanel,
          borderRight: `1px solid ${themeVars.border}`,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          flexShrink: 0,
          transition: "background 0.3s ease",
        }}>
          
          <FormulaInput
            formulaInput={formulaInput} setFormulaInput={setFormulaInput}
            spawnAtomsFromFormula={spawnAtomsFromFormula}
          />

          <div style={{ height: 1, background: themeVars.border, margin: "4px 0" }} />
          <InspectorSidebar
            selEl={selEl} selBondCount={selBondCount} selMolecule={selMolecule}
            getAllPossibleReactions={getAllPossibleReactions}
            removeSelected={removeSelected} lastReaction={lastReaction} counts={counts}
            currentMolecules={currentMolecules} experimentHistory={experimentHistory}
          />
        </div>

        {/* CENTER COLUMN (Canvas + Reactions Bar + Periodic Table) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* CANVAS */}
          <CanvasStage
            diagnostics={diagnostics} pubchemStatus={pubchemStatus} counts={counts}
            formulaInput={formulaInput} visualMode={visualMode}
            viewer3dSdf={viewer3dSdf} viewer3dXyz={viewer3dXyz} viewer3dTitle={viewer3dTitle}
            canvasRef={canvasRef} handleMouseDown={handleMouseDown} handleMouseMove={handleMouseMove}
            handleMouseUp={handleMouseUp} handleMouseLeave={handleCanvasMouseLeave} handleWheel={handleWheel} handleDrop={handleDrop}
            zoom={zoom} setZoom={setZoom} fitAll={fitAll} resetView={resetView}
            reactionToasts={reactionToasts} dismissReactionToast={dismissReactionToast}
            orbitSpeed={orbitSpeed} setOrbitSpeed={setOrbitSpeed}
            distinctMolecules={distinctMolecules}
            selected3DMoleculeIndex={selected3DMoleculeIndex}
            setSelected3DMoleculeIndex={setSelected3DMoleculeIndex}
          />

          {/* REACTIONS BAR */}
          <ReactionsBar equation={displayedEquation} />

          {/* PERIODIC TABLE */}
          <PeriodicTablePalette setHoveredElement={setHoveredElement} onSelectElement={addElementFromSearch} />
        </div>

        {/* RIGHT PANEL — AI CHAT */}
        <ChatPanel
          chatExpanded={chatExpanded} setChatExpanded={setChatExpanded}
          chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput}
          sendChatMessage={sendChatMessage} useAI={useAI}
          isWaitingForAI={isWaitingForAI}
        />
      </div>

      <ElementTooltip hoveredElement={hoveredElement} />
    </div>
  );
}
