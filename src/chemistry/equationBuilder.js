// ───────────────────────── CANONICAL REACTION EQUATION ─────────────────────────
// Single source of truth for turning a resolved reaction entry into the equation
// text shown anywhere in Atomium: Inspector previews, completed-reaction cards,
// the diagnostics panel, AI explanations, and any future history/export UI.
// Every surface should call getCanonicalEquation(entry) rather than formatting
// reactants/products itself, so a formula never renders two different ways.
import { parseFormula, canonicalElementOrder } from "../formulaParser";
import { expandProducts } from "./moleculeReactionResolver";

const SUB_DIGITS = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };

// Elements that only exist in nature as diatomic molecules. Grouping these as
// X2 (rather than bare atoms) is what makes the output match standard textbook
// notation, e.g. "O2" rather than "O".
const DIATOMIC_ELEMENTS = new Set(["H", "N", "O", "F", "Cl", "Br", "I"]);

function toSubscriptDigits(numOrStr) {
  return String(numOrStr).split("").map((ch) => SUB_DIGITS[ch] ?? ch).join("");
}

function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}

/**
 * Renders a plain molecular formula string (e.g. "Ca(OH)2", "H2O", "NaCl")
 * into display form with unicode subscripts, reusing the same tokenizer the
 * formula-input preview uses so the two never drift apart visually.
 */
export function formatFormulaUnicode(formulaStr) {
  if (!formulaStr) return "";
  const { tokens } = parseFormula(formulaStr);
  return tokens
    .map((t) => {
      if (t.type === "subscript") return toSubscriptDigits(t.text);
      return t.text; // element, parenthesis, dot, coefficient, charge all render as-is
    })
    .join("");
}

/**
 * Builds the left-hand ("reactant") side of a canonical equation from the flat
 * list of elemental atoms consumed to form ONE unit of the product — i.e.
 * entry.reactants, e.g. ["H", "H", "O"] for water.
 *
 * Diatomic elements (H, N, O, F, Cl, Br, I) are grouped as X2 rather than bare
 * atoms. Because a single atom-combination "pick" can consume an ODD number of
 * a diatomic element (one O atom for water), the whole equation is scaled by 2
 * whenever needed so every diatomic group divides evenly, then reduced back
 * down to the smallest whole-number ratio. This reproduces the standard
 * textbook equation (2H2 + O2 -> 2H2O) regardless of how many atoms the
 * simulation actually picked up in one event.
 *
 * NOTE — scope: this models single-product atom-combination reactions only
 * (the engine's actual data model). Multi-product reactions between two
 * already-formed molecules (e.g. NaOH + HCl -> NaCl + H2O) aren't
 * representable until the reaction data model itself tracks multiple product
 * molecules — see the Reaction Resolution Engine / Molecule Locking notes.
 */
export function buildReactantGroups(reactantSyms) {
  if (!Array.isArray(reactantSyms) || reactantSyms.length === 0) {
    return { groups: [], productCoefficient: 1 };
  }

  const rawCounts = {};
  for (const s of reactantSyms) rawCounts[s] = (rawCounts[s] || 0) + 1;

  const needsDoubling = Object.entries(rawCounts).some(
    ([sym, n]) => DIATOMIC_ELEMENTS.has(sym) && n % 2 !== 0
  );
  const scale = needsDoubling ? 2 : 1;

  // Hill order (C first, H second, then alphabetical) — matches
  // formulaFromCounts so reactant and product sides read consistently
  // (e.g. "H2 + Cl2 -> 2HCl", not "Cl2 + H2 -> 2HCl").
  const hillSort = (a, b) => {
    if (a === "C") return -1;
    if (b === "C") return 1;
    if (a === "H") return -1;
    if (b === "H") return 1;
    return a.localeCompare(b);
  };

  const groups = Object.keys(rawCounts)
    .sort(hillSort)
    .map((sym) => {
      const scaledCount = rawCounts[sym] * scale;
      const isDiatomic = DIATOMIC_ELEMENTS.has(sym);
      return {
        sym,
        subscript: isDiatomic ? 2 : 1,
        units: isDiatomic ? scaledCount / 2 : scaledCount,
      };
    });

  const productMultiplier = scale;
  const overallGcd = groups.reduce((g, group) => gcd(g, group.units), productMultiplier);

  return {
    groups: groups.map((g) => ({ ...g, coefficient: g.units / overallGcd })),
    productCoefficient: productMultiplier / overallGcd,
  };
}

/**
 * Returns the single canonical equation string for a resolved reaction entry,
 * e.g. "2H₂ + O₂ → 2H₂O". This is the ONLY place equation text should be
 * assembled — every surface in the app should call this rather than building
 * its own formatting from entry.reactants / entry.formula directly.
 *
 * Returns "" if the entry doesn't have enough information yet (e.g. mid-search).
 */
export function getCanonicalEquation(entry) {
  if (!entry || !Array.isArray(entry.reactants) || !entry.formula) return "";

  const { groups, productCoefficient } = buildReactantGroups(entry.reactants);
  if (groups.length === 0) return "";

  const reactantSide = groups
    .map((g) => {
      const coeffStr = g.coefficient > 1 ? String(g.coefficient) : "";
      const subStr = g.subscript > 1 ? toSubscriptDigits(g.subscript) : "";
      return `${coeffStr}${g.sym}${subStr}`;
    })
    .join(" + ");

  const productCoeffStr = productCoefficient > 1 ? String(productCoefficient) : "";
  const productSide = `${productCoeffStr}${formatFormulaUnicode(entry.formula)}`;

  return `${reactantSide} → ${productSide}`;
}

/**
 * Returns an "experiment mode" equation that reflects exactly the atoms the
 * user placed on the canvas, without diatomic grouping or equation scaling.
 *
 * e.g. entry.reactants = ["H","H","O"] → "2H + O → H₂O"
 *      entry.reactants = ["Na","Cl"]   → "Na + Cl → NaCl"
 *      entry.reactants = ["C","O","O"] → "C + 2O → CO₂"
 *
 * Returns "" if the entry doesn't have enough information yet.
 */
export function getExperimentEquation(entry, alignedAtoms) {
  if (!entry || !Array.isArray(entry.reactants) || !entry.formula) return "";

  // If alignedAtoms is not provided or is empty, fallback to raw atom counting
  if (!Array.isArray(alignedAtoms) || alignedAtoms.length === 0) {
    const rawCounts = {};
    for (const s of entry.reactants) rawCounts[s] = (rawCounts[s] || 0) + 1;

    const uniqueSyms = Object.keys(rawCounts);
    const sortedSyms = canonicalElementOrder(uniqueSyms);

    const reactantSide = sortedSyms
      .map((sym) => {
        const count = rawCounts[sym];
        const coeffStr = count > 1 ? String(count) : "";
        return `${coeffStr}${sym}`;
      })
      .join(" + ");

    const productSide = formatFormulaUnicode(entry.formula);
    return `${reactantSide} → ${productSide}`;
  }

  // 1. Group the alignedAtoms by spawnGroupId to see which molecules were fully consumed
  const groupCounts = {};
  for (const a of alignedAtoms) {
    if (a.spawnGroupId) {
      groupCounts[a.spawnGroupId] = (groupCounts[a.spawnGroupId] || 0) + 1;
    }
  }

  // Determine which groups are fully consumed
  const consumedGroups = new Set();
  for (const a of alignedAtoms) {
    if (a.spawnGroupId && a.spawnGroupSize && groupCounts[a.spawnGroupId] === a.spawnGroupSize) {
      consumedGroups.add(a.spawnGroupId);
    }
  }

  // 2. Count the reactants (either a complete molecule formula or an individual symbol)
  const reactantCounts = {};
  const processedGroups = new Set();

  for (const a of alignedAtoms) {
    if (a.spawnGroupId && consumedGroups.has(a.spawnGroupId)) {
      if (!processedGroups.has(a.spawnGroupId)) {
        processedGroups.add(a.spawnGroupId);
        const formula = a.spawnGroupFormula;
        reactantCounts[formula] = (reactantCounts[formula] || 0) + 1;
      }
    } else {
      // Individual atom (either no group, or group not fully consumed)
      reactantCounts[a.sym] = (reactantCounts[a.sym] || 0) + 1;
    }
  }

  // 3. Sort reactants canonically/alphabetically for consistent display
  const reactantNames = Object.keys(reactantCounts).sort((a, b) => a.localeCompare(b));

  const reactantSide = reactantNames
    .map((name) => {
      const count = reactantCounts[name];
      const coeffStr = count > 1 ? String(count) : "";
      return `${coeffStr}${formatFormulaUnicode(name)}`;
    })
    .join(" + ");

  const productSide = formatFormulaUnicode(entry.formula);

  return `${reactantSide} → ${productSide}`;
}

/**
 * ───────────────────────── MOLECULE-BASED EQUATION RENDERER ─────────────────────────
 * Pure renderer for the new molecule-based reaction engine (reactionEngine.js /
 * moleculeReactionResolver.js). It does NOT infer any chemistry — it just takes
 * the reactant molecule formulas and the already-resolved product formulas and
 * groups + formats them. Every surface showing a molecule-based reaction's
 * equation should go through this rather than assembling text itself.
 *
 * Reactants: flat list of molecule formulas as found on the canvas, e.g.
 *   ["BaCl2", "Na2SO4"]
 * Products: flat list of individual product molecule formulas (already
 * expanded from the REACTIONS entry's coefficients), e.g.
 *   ["BaSO4", "NaCl", "NaCl"]
 *
 * Identical formulas on either side are grouped and given a leading
 * coefficient: ["NaCl", "NaCl"] -> "2NaCl".
 */
export function groupFormulas(formulas) {
  const counts = {};
  const order = [];
  for (const f of formulas) {
    if (!(f in counts)) order.push(f);
    counts[f] = (counts[f] || 0) + 1;
  }
  return order.map((formula) => ({ formula, coefficient: counts[formula] }));
}

export function renderFormulaSide(formulas) {
  return groupFormulas(formulas)
    .map(({ formula, coefficient }) => {
      const coeffStr = coefficient > 1 ? String(coefficient) : "";
      return `${coeffStr}${formatFormulaUnicode(formula)}`;
    })
    .join(" + ");
}

/**
 * Renders "BaCl₂ + Na₂SO₄ → BaSO₄ + 2NaCl" from raw reactant/product formula
 * lists. This is the renderer described by the Equation Builder spec: it only
 * groups and formats, it never decides what the products are.
 */
export function buildMoleculeEquation(reactantFormulas, productFormulas) {
  if (!Array.isArray(reactantFormulas) || reactantFormulas.length === 0) return "";
  if (!Array.isArray(productFormulas) || productFormulas.length === 0) return "";
  return `${renderFormulaSide(reactantFormulas)} → ${renderFormulaSide(productFormulas)}`;
}

/**
 * Convenience wrapper: renders the equation directly from a resolved
 * REACTIONS entry (as returned by resolveMoleculeReaction), expanding its
 * `products` coefficients internally via expandProducts().
 */
export function getMoleculeEquation(entry) {
  if (!entry || !Array.isArray(entry.reactants)) return "";
  return buildMoleculeEquation(entry.reactants, expandProducts(entry));
}

/**
 * Returns the formatted product display string for a molecule-based REACTIONS
 * entry, e.g. products: [{formula:"BaSO4",coeff:1},{formula:"NaCl",coeff:2}]
 * → "BaSO₄ + 2NaCl"
 * Falls back to entry.formula if products[] is absent (atom-assembly entries).
 */
export function getProductsLabel(entry) {
  if (!entry) return "";
  if (Array.isArray(entry.products) && entry.products.length > 0) {
    return renderFormulaSide(expandProducts(entry));
  }
  return formatFormulaUnicode(entry.formula || "");
}

