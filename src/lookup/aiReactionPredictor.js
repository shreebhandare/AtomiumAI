// ───────────────────────── AI REACTION PREDICTOR ─────────────────────────
// When the in-memory REACTIONS cache has no match for a set of molecules,
// this module asks the AI (Fireworks/Qwen) to predict whether a valid
// chemical reaction occurs between them.
//
// It returns a reaction entry in the exact same schema as the Supabase
// `chemical_reactions` rows (after adapter mapping), so the engine can
// register and execute it identically to a database-sourced reaction.
//
// PubChem is never used here — this is purely AI-based reaction prediction.

import { FIREWORKS_API_KEY, FIREWORKS_MODEL } from "../chemistry/reactionStore";
import { fetchWithRetry } from "./fireworksClient";

/**
 * Asks the AI to predict a molecule-to-molecule reaction.
 *
 * @param {string[]} reactantFormulas - e.g. ["Al", "Al", "Fe2O3"]
 * @returns {Promise<object|null>} - A reaction entry or null if no reaction
 */
export async function predictReactionWithAI(reactantFormulas) {
  if (!FIREWORKS_API_KEY || !FIREWORKS_MODEL) {
    console.warn("[AI Predictor] No Fireworks API key/model configured.");
    return null;
  }

  const formulaList = reactantFormulas.join(", ");

  const prompt = `You are a chemistry reaction prediction engine for an educational simulation app.

Given these reactant molecules on the canvas: [${formulaList}]

Determine if a known, real chemical reaction occurs between them.

RULES:
- Only return a reaction if it is chemically REAL and well-established.
- If no reaction occurs between these molecules, return exactly: {"no_reaction": true}
- The reactants array must be EXACTLY the input molecules listed above, preserving duplicates.
- Products must have formula and coefficient fields.
- Coefficients must be positive integers.
- The reaction must be balanced.

If a reaction exists, return a single JSON object with this EXACT schema:
{
  "name": "Human-readable reaction name",
  "type": "reaction type (e.g. combustion, synthesis, decomposition, neutralization, single_displacement, double_displacement, redox)",
  "reactants": [exact input formulas preserving duplicates],
  "products": [{"formula": "ProductFormula", "coefficient": 1}, ...],
  "fact": "One-sentence educational explanation of this reaction.",
  "deltaH": number or null
}

Output ONLY the JSON object — no prose, no markdown fences, no comments.`;

  const res = await fetchWithRetry(
    "https://api.fireworks.ai/inference/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FIREWORKS_API_KEY}`
      },
      body: JSON.stringify({
        model: FIREWORKS_MODEL,
        messages: [{ role: "user", content: prompt }]
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`AI reaction prediction failed: ${res.status}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty AI response");

  let parsed;
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error("No JSON object found in AI response");
    }
  }

  // AI said no reaction
  if (parsed.no_reaction || parsed.invalid) return null;

  // Validate minimal structure
  if (!Array.isArray(parsed.reactants) || !Array.isArray(parsed.products) || !parsed.name) {
    console.warn("[AI Predictor] Malformed AI response:", parsed);
    return null;
  }

  // Validate products have required fields
  for (const p of parsed.products) {
    if (!p.formula || typeof p.coefficient !== "number" || p.coefficient <= 0) {
      console.warn("[AI Predictor] Invalid product in AI response:", p);
      return null;
    }
  }

  return {
    reactionCode: `RXN_AI_${Date.now()}`,
    name: parsed.name,
    type: parsed.type || "unknown",
    reactants: parsed.reactants,
    products: parsed.products,
    fact: parsed.fact || "AI-predicted reaction.",
    deltaH: parsed.deltaH != null ? Number(parsed.deltaH) : undefined,
    fromAI: true,
  };
}
