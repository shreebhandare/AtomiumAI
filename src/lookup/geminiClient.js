// Gemini AI fallback: used only when PubChem has no record for an atom combination
// and the user has supplied a Gemini API key.

export async function fetchWithRetry(url, options, maxRetries = 3, initialDelay = 1000) {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 && i < maxRetries - 1) {
        console.warn(`[Gemini] Rate limit hit (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      return res;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  return fetch(url, options);
}

// Fallback used only when PubChem has no record for this atom combination AND
// the user has supplied a Gemini API key. Asks Gemini for a single reaction
// object matching the exact same schema as the static COMPOUND_BLUEPRINTS table, capped
// at 10 atoms and restricted to single-stage (non-hydrate, non-intermediate) reactions.
export async function generateReactionWithGemini(fp, syms, apiKey) {
  const prompt = `You are generating chemistry reaction data for a browser-based bonding simulation engine.
Output ONLY a single valid JSON object — no prose, no markdown fences, no comments.

The reactants are exactly these atoms (you choose their order in "reactants"): ${syms.join(", ")}.

SCHEMA (strict):
{
  "name": string,
  "formula": string,
  "reactants": string[],
  "bonds": [{ "from": int, "to": int, "type": "covalent" | "ionic", "order": 1 | 2 | 3 }],
  "minTempK": number,
  "minPressureAtm": number,
  "deltaH": number,
  "fact": string
}

RULES:
- "reactants" must be exactly these ${syms.length} symbols, in any order: [${syms.map((s) => `"${s}"`).join(", ")}].
- Only return this reaction if it is chemically real and well-established. If these atoms do not
  form a known, stable molecule together in one step, return exactly: {"invalid": true}
- HARD LIMIT: never assume more than 10 total atoms.
- SINGLE-STAGE ONLY: no hydrates, crystal water, or molecules requiring an intermediate compound
  to form first (this request always satisfies that — just don't fabricate a multi-step pathway).
- Every reactant index must appear in at least one bond, unless there is only one atom.
- "from"/"to" are indices into "reactants", not symbols.
- Return strictly valid JSON, no trailing commas, no explanation text.`;

  const res = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Gemini API Rate Limit Exceeded (429). Please wait a moment before trying again.");
    }
    if (res.status === 403) {
      throw new Error("Gemini API Key Invalid or Unauthorized (403). Please verify your key in Settings.");
    }
    throw new Error(`Gemini request failed: ${res.status}`);
  }
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Empty Gemini response");
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (parsed.invalid) return null;
  if (!Array.isArray(parsed.reactants) || !Array.isArray(parsed.bonds) || !parsed.formula) {
    throw new Error("Malformed Gemini reaction object");
  }
  return { ...parsed, fromGemini: true };
}

// Single dispatcher used by the engine: static table already checked by the caller.
