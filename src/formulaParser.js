/**
 * Chemistry Formula Parser and Validator
 */

import { ELEMENTS } from "./data/elements";

const ELEMENTS_SET = new Set([
  "H", "HE", "LI", "BE", "B", "C", "N", "O", "F", "NE", "NA", "MG", "AL", "SI", "P", "S", "CL", "AR",
  "K", "CA", "SC", "TI", "V", "CR", "MN", "FE", "CO", "NI", "CU", "ZN", "GA", "GE", "AS", "SE", "BR",
  "KR", "RB", "SR", "Y", "ZR", "NB", "MO", "TC", "RU", "RH", "PD", "AG", "CD", "IN", "SN", "SB", "TE",
  "I", "XE", "CS", "BA", "LA", "CE", "PR", "ND", "PM", "SM", "EU", "GD", "TB", "DY", "HO", "ER", "TM",
  "YB", "LU", "HF", "TA", "W", "RE", "OS", "IR", "PT", "AU", "HG", "TL", "PB", "BI", "PO", "AT", "RN",
  "FR", "RA", "AC", "TH", "PA", "U", "NP", "PU", "AM", "CM", "BK", "CF", "ES", "FM", "MD", "NO", "LR",
  "RF", "DB", "SG", "BH", "HS", "MT", "DS", "RG", "CN", "NH", "FL", "MC", "LV", "TS", "OG"
]);

// Canonical display casing for each symbol (e.g. "FE" -> "Fe"), built from the
// real periodic-table data so the two stay in sync automatically.
const CANONICAL_CASE = new Map(ELEMENTS.map((el) => [el.sym.toUpperCase(), el.sym]));

// Unicode subscript digits (used when pasting formulas like "H₂SO₄") mapped to ASCII.
const SUBSCRIPT_DIGITS = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };
const SUBSCRIPT_RE = /[₀₁₂₃₄₅₆₇₈₉]/g;

// Every character a chemical formula can legitimately contain. Anything else
// (typed or pasted) is silently dropped by normalizeFormulaInput.
const ALLOWED_CHARS_RE = /[^a-zA-Z0-9()+\-^.*·−]/g;

/**
 * Live-input normalizer (Upgrade #3): converts unicode subscripts to plain
 * digits, strips whitespace (so "H 2 O" -> "H2O"), and drops any character
 * that isn't chemistry-relevant. Safe to run on every keystroke — it never
 * reorders or reinterprets letters, only cleans up punctuation/whitespace/
 * digit representation, so it can't turn one valid formula into another.
 */
export function normalizeFormulaInput(raw) {
  if (!raw) return "";
  return raw
    .replace(SUBSCRIPT_RE, (d) => SUBSCRIPT_DIGITS[d])
    .replace(/\s+/g, "")
    .replace(ALLOWED_CHARS_RE, "");
}

// ── Element-run resolution (with capitalization repair as a fallback) ─────
// The tokenizers below capture a full contiguous run of letters (any case)
// and hand it to this helper, which:
//   1. First tries the "conventional" split — a new element starts at each
//      letter and consumes any immediately-following LOWERCASE letters. This
//      is exactly the original behavior and handles correctly-cased input
//      perfectly ("NaCl" -> Na, Cl), it just now also canonicalizes the
//      display case of single-letter symbols ("h" -> "H").
//   2. If that doesn't produce an all-valid split (e.g. all-lowercase "nacl"
//      or all-caps "NACL", where the user gave no case signal at all), it
//      falls back to a 2-letter-then-1-letter backtracking segmentation of
//      the WHOLE run.
// Genuinely ambiguous runs (e.g. "cocl" could be Co+Cl or C+O+Cl) will
// resolve to *some* valid segmentation (2-letter symbols preferred), not
// necessarily the one the user meant — but that only replaces a guaranteed
// error with a best-effort guess, and correctly-cased input is never touched.
function resolveElementRun(run) {
  const conventional = [];
  let ok = true;
  let j = 0;
  while (j < run.length) {
    let piece = run[j];
    j++;
    while (j < run.length && /[a-z]/.test(run[j])) {
      piece += run[j];
      j++;
    }
    const canon = CANONICAL_CASE.get(piece.toUpperCase());
    if (!canon) { ok = false; break; }
    conventional.push(canon);
  }
  if (ok) return conventional;

  return trySegmentElementRun(run);
}

function trySegmentElementRun(letters, memo = new Map()) {
  if (letters === "") return [];
  if (memo.has(letters)) return memo.get(letters);

  let result = null;
  // Prefer a 2-letter symbol first, then 1-letter, backtracking on failure.
  for (const len of [2, 1]) {
    if (letters.length < len) continue;
    const head = letters.slice(0, len).toUpperCase();
    if (!ELEMENTS_SET.has(head)) continue;
    const rest = trySegmentElementRun(letters.slice(len), memo);
    if (rest !== null) {
      result = [CANONICAL_CASE.get(head) || head, ...rest];
      break;
    }
  }
  memo.set(letters, result);
  return result;
}

/**
 * Parses a chemical formula string into rendering tokens.
 * Supports:
 * - Parentheses: Ca(OH)2
 * - Dot notation: CuSO4·5H2O, CuSO4.5H2O, CuSO4*5H2O
 * - Charges: SO4^2−, NH4+, Fe3+, Cl-, Na+
 * 
 * Returns: { isValid: boolean, tokens: Array, error: string }
 */
export function parseFormula(formulaStr) {
  if (!formulaStr || formulaStr.trim() === "") {
    return { isValid: false, tokens: [], error: "Formula is empty" };
  }

  const tokens = [];
  const errors = [];

  // Replace common characters to standardize
  // Standardize dot notation to '·'
  let normalized = formulaStr.replace(/\*/g, "·").replace(/\./g, "·");
  // Standardize minus sign characters
  normalized = normalized.replace(/−/g, "-");

  let i = 0;
  const len = normalized.length;

  // Track parentheses balance
  let openParentheses = 0;

  while (i < len) {
    const char = normalized[i];

    // 1. Dot Notation
    if (char === "·") {
      tokens.push({ type: "dot", text: "·" });
      i++;
      continue;
    }

    // 2. Parentheses
    if (char === "(") {
      tokens.push({ type: "parenthesis", text: "(" });
      openParentheses++;
      i++;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "parenthesis", text: ")" });
      openParentheses--;
      if (openParentheses < 0) {
        errors.push("Unmatched closing parenthesis");
      }
      i++;
      continue;
    }

    // 3. Explicit Charge with '^'
    if (char === "^") {
      // Find charge content
      let chargeStr = "";
      i++; // skip '^'
      while (i < len && /[0-9\+\-]/i.test(normalized[i])) {
        chargeStr += normalized[i];
        i++;
      }
      if (chargeStr === "") {
        errors.push("Empty charge indicator '^'");
      } else {
        tokens.push({ type: "charge", text: chargeStr });
      }
      continue;
    }

    // 4. Implicit Charge (e.g. NH4+, Fe3+, Cl-, Na+)
    // If we are near the end of the string or followed by dot/parentheses/charge,
    // look for trailing '+' or '-' optionally preceded by a number.
    // Let's check if the remaining substring starts with a number followed by + or - or just + or - at the very end
    // of a component block. A component block ends at the end of the string, or at a dot '·'.
    let rest = normalized.slice(i);
    let implicitChargeMatch = rest.match(/^([0-9]*[\+\-])(?=$|·)/);
    if (implicitChargeMatch) {
      tokens.push({ type: "charge", text: implicitChargeMatch[1] });
      i += implicitChargeMatch[1].length;
      continue;
    }

    // 5. Numbers / Subscripts or Coefficients
    // A number can be a subscript (if it follows an element or parenthesis)
    // or a coefficient (if it follows a dot '·' or is at the very beginning).
    if (/[0-9]/.test(char)) {
      let numStr = "";
      while (i < len && /[0-9]/.test(normalized[i])) {
        numStr += normalized[i];
        i++;
      }

      // Check if this number is a coefficient
      // It is a coefficient if:
      // - it is at the very start of the formula
      // - the previous token was a dot '·'
      const isCoefficient = tokens.length === 0 || tokens[tokens.length - 1].type === "dot";
      tokens.push({
        type: isCoefficient ? "coefficient" : "subscript",
        text: numStr
      });
      continue;
    }

    // 6. Element Symbols
    // Capture the full contiguous letter run (any case) and resolve it —
    // see resolveElementRun for how correctly-cased vs. ambiguous runs differ.
    if (/[a-zA-Z]/.test(char)) {
      let run = char;
      i++;
      while (i < len && /[a-zA-Z]/.test(normalized[i])) {
        run += normalized[i];
        i++;
      }

      const resolved = resolveElementRun(run);
      if (resolved) {
        for (const sym of resolved) tokens.push({ type: "element", text: sym });
      } else {
        errors.push(`Unknown element symbol "${run}"`);
        tokens.push({ type: "element", text: run });
      }
      continue;
    }

    // 7. Unrecognized characters
    errors.push(`Unexpected character "${char}"`);
    tokens.push({ type: "unknown", text: char });
    i++;
  }

  if (openParentheses > 0) {
    errors.push("Unmatched opening parenthesis");
  }

  return {
    isValid: errors.length === 0,
    tokens,
    error: errors.length > 0 ? errors.join("; ") : null
  };
}

/**
 * Expands a validated chemical formula string into a flat array of element symbols.
 * Handles multipliers, subscripts, coefficients, dot operators, and parentheses.
 * E.g., "CuSO4·5H2O" -> ["Cu", "S", "O", "O", "O", "O", "H", "H", "O", ...]
 */
export function expandFormulaToAtoms(formulaStr) {
  if (!formulaStr) return [];
  // Standardize dot notation and remove spaces
  let s = formulaStr.replace(/\*/g, "·").replace(/\./g, "·").replace(/\s+/g, "");
  s = s.replace(/−/g, "-");
  
  const components = s.split('·');
  let allAtoms = [];
  
  for (const comp of components) {
    let coefMatch = comp.match(/^([0-9]+)(.*)/);
    let coef = 1;
    let subFormula = comp;
    if (coefMatch) {
      coef = parseInt(coefMatch[1], 10);
      subFormula = coefMatch[2];
    }
    
    const compAtoms = parseSubFormula(subFormula);
    for (let c = 0; c < coef; c++) {
      allAtoms.push(...compAtoms);
    }
  }
  
  return allAtoms;
}

function parseSubFormula(s) {
  let i = 0;
  const len = s.length;
  let atoms = [];
  
  while (i < len) {
    // Skip explicit charges starting with '^'
    if (s[i] === '^') {
      i++;
      while (i < len && /[0-9\+\-]/i.test(s[i])) i++;
      continue;
    }
    // Skip implicit trailing charges
    if (s[i] === '+' || s[i] === '-') {
      i++;
      continue;
    }
    
    // Handle parenthesis groups
    if (s[i] === '(') {
      let depth = 1;
      let start = i + 1;
      i++;
      while (i < len && depth > 0) {
        if (s[i] === '(') depth++;
        if (s[i] === ')') depth--;
        i++;
      }
      let sub = s.slice(start, i - 1);
      
      // Read subscript multiplier
      let countStr = "";
      while (i < len && /[0-9]/.test(s[i])) {
        countStr += s[i];
        i++;
      }
      let multiplier = countStr === "" ? 1 : parseInt(countStr, 10);
      const subAtoms = parseSubFormula(sub);
      for (let m = 0; m < multiplier; m++) {
        atoms.push(...subAtoms);
      }
      continue;
    }
    
    // Read element symbol — capture the full letter run (any case), same as
    // parseFormula, then resolve it the same way so expansion always agrees
    // with what the validator/preview showed.
    if (/[a-zA-Z]/.test(s[i])) {
      let run = s[i];
      i++;
      while (i < len && /[a-zA-Z]/.test(s[i])) {
        run += s[i];
        i++;
      }

      const resolved = resolveElementRun(run) || [run];

      // Read subscript count — applies to the *last* symbol in the run,
      // matching how a real formula like "CO2" applies the subscript only
      // to the O.
      let countStr = "";
      while (i < len && /[0-9]/.test(s[i])) {
        countStr += s[i];
        i++;
      }
      let count = countStr === "" ? 1 : parseInt(countStr, 10);

      for (let k = 0; k < resolved.length - 1; k++) atoms.push(resolved[k]);
      for (let c = 0; c < count; c++) atoms.push(resolved[resolved.length - 1]);
      continue;
    }
    
    i++;
  }
  
  return atoms;
}
