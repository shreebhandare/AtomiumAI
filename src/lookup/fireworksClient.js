// Fireworks AI fallback: used only when PubChem has no record for an atom combination
// and the user has supplied a Fireworks API key.

export async function fetchWithRetry(url, options, maxRetries = 3, initialDelay = 1000) {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 && i < maxRetries - 1) {
        console.warn(`[Fireworks] Rate limit hit (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
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
// the user has supplied a Fireworks API key. Asks Fireworks for a single reaction
// object matching the exact same schema as the static COMPOUND_BLUEPRINTS table.
export async function generateReactionWithFireworks(fp, syms, apiKey, model) {
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
  to form first.
- Every reactant index must appear in at least one bond, unless there is only one atom.
- "from"/"to" are indices into "reactants", not symbols.
- Return strictly valid JSON matching the schema.`;

  const targetModel = model || "accounts/fireworks/models/llama-v3p3-70b-instruct";

  const res = await fetchWithRetry(
    "https://api.fireworks.ai/inference/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
    }
  );

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Fireworks API Rate Limit Exceeded (429). Please wait a moment before trying again.");
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Fireworks API Key Invalid or Unauthorized. Please verify your key in Settings.");
    }
    throw new Error(`Fireworks request failed: ${res.status}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty Fireworks response");

  const cleaned = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  if (parsed.invalid) return null;
  if (!Array.isArray(parsed.reactants) || !Array.isArray(parsed.bonds) || !parsed.formula) {
    throw new Error("Malformed Fireworks reaction object");
  }

  return { ...parsed, fromGemini: true }; // Keep 'fromGemini' property name if used internally by the engine as a flag for AI-generated compound
}
