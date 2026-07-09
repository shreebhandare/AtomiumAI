// ───────────────────────── MOLECULE REACTION SEED DATA ─────────────────────────
// Hand-authored molecule-to-molecule reactions, one per required family (see the
// "Future Compatibility" requirement: precipitation, neutralization, combustion,
// decomposition, synthesis, single displacement, double displacement). Every
// entry follows the exact schema documented in reactionStore.js:
//
//   reactants: [formula, formula, ...]     — repeat a formula for coefficient > 1
//   products:  [{ formula, coefficient }]
//
// This is data only — no atom concatenation, no formula synthesis. Additional
// entries can be registered at runtime via registerReaction() (e.g. from an AI
// prediction source) without touching the resolver or engine.
export const REACTION_SEED_DATA = [
  // ── Double displacement / precipitation ──
  {
    type: "double_displacement",
    name: "Barium sulfate precipitation",
    reactants: ["BaCl2", "Na2SO4"],
    products: [
      { formula: "BaSO4", coefficient: 1 },
      { formula: "NaCl", coefficient: 2 },
    ],
    fact: "Barium sulfate is virtually insoluble in water, so it precipitates out of solution as a white solid.",
    deltaH: -18,
  },
  {
    type: "double_displacement",
    name: "Silver chloride precipitation",
    reactants: ["AgNO3", "NaCl"],
    products: [
      { formula: "AgCl", coefficient: 1 },
      { formula: "NaNO3", coefficient: 1 },
    ],
    fact: "Silver chloride forms an insoluble white precipitate, a classic qualitative test for chloride ions.",
    deltaH: -65,
  },

  // ── Neutralization ──
  {
    type: "neutralization",
    name: "Hydrochloric acid + sodium hydroxide",
    reactants: ["HCl", "NaOH"],
    products: [
      { formula: "NaCl", coefficient: 1 },
      { formula: "H2O", coefficient: 1 },
    ],
    fact: "A strong acid and strong base neutralize each other completely, producing a salt and water.",
    deltaH: -57.3,
  },

  // ── Combustion ──
  {
    type: "combustion",
    name: "Methane combustion",
    reactants: ["CH4", "O2", "O2"],
    products: [
      { formula: "CO2", coefficient: 1 },
      { formula: "H2O", coefficient: 2 },
    ],
    fact: "Complete combustion of methane releases a large amount of energy — this is the reaction that powers gas stoves.",
    deltaH: -890,
  },

  // ── Decomposition ──
  {
    type: "decomposition",
    name: "Calcium carbonate decomposition",
    reactants: ["CaCO3"],
    products: [
      { formula: "CaO", coefficient: 1 },
      { formula: "CO2", coefficient: 1 },
    ],
    fact: "Heating limestone (calcium carbonate) drives off carbon dioxide gas, leaving quicklime behind.",
    minTempK: 1123,
    deltaH: 178,
  },

  // ── Synthesis ──
  {
    type: "synthesis",
    name: "Hydrogen chloride synthesis",
    reactants: ["H2", "Cl2"],
    products: [
      { formula: "HCl", coefficient: 2 },
    ],
    fact: "Hydrogen and chlorine gas combine directly to form hydrogen chloride, releasing heat.",
    deltaH: -184.6,
  },

  // ── Single displacement ──
  {
    type: "single_displacement",
    name: "Zinc + hydrochloric acid",
    reactants: ["Zn", "HCl", "HCl"],
    products: [
      { formula: "ZnCl2", coefficient: 1 },
      { formula: "H2", coefficient: 1 },
    ],
    fact: "Zinc is more reactive than hydrogen, so it displaces it from hydrochloric acid, releasing hydrogen gas.",
    deltaH: -152,
  },
];
