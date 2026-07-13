// ─────────────────────────── AMD DEVELOPER CLOUD CLIENT ───────────────────────────
// Primary LLM provider. Sends a structured prompt to the AMD endpoint and returns
// the parsed text response. Throws on timeout, non-200, or empty response so the
// caller can transparently fall back to Fireworks.
//
// Endpoint: POST { "prompt": "<text>" }  →  { "response": "<text>" }

import { canonicalElementOrder } from "../formulaParser";

const AMD_TIMEOUT_MS = 30_000; // 30 seconds

/**
 * POST a prompt to the AMD Developer Cloud endpoint with a timeout.
 * Retries once on network errors (not on non-200 status codes — those are
 * passed straight back so the caller can decide whether to fall through).
 *
 * @param {string} endpoint  - Full URL from VITE_AMD_API_ENDPOINT
 * @param {string} prompt    - The text prompt to send
 * @returns {Promise<string>} - The raw `response` string from the API
 * @throws  on timeout | network error after retry | non-200 | empty response
 */
export async function callAMDEndpoint(endpoint, prompt) {
  const attempt = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AMD_TIMEOUT_MS);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`AMD endpoint returned ${res.status}`);
      }
      const data = await res.json();
      const text = data?.response;
      if (!text) throw new Error("Empty response from AMD endpoint");
      return text;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === "AbortError") throw new Error("AMD endpoint timed out after 30 s");
      throw err;
    }
  };

  // One automatic retry for transient network/timeout failures only
  try {
    return await attempt();
  } catch (err) {
    // Do not retry explicit HTTP errors — propagate so fallback can handle
    if (err.message.startsWith("AMD endpoint returned")) throw err;
    console.warn("[AMD] First attempt failed, retrying once:", err.message);
    return await attempt();
  }
}

/**
 * Ask the AMD endpoint to generate a compound-blueprint JSON object for the
 * given atom combination. Mirrors the return shape of generateReactionWithFireworks.
 *
 * @param {string}   fp       - Fingerprint string (e.g. "H-H-O")
 * @param {string[]} syms     - Array of element symbols (e.g. ["H","H","O"])
 * @param {string}   endpoint - AMD API endpoint URL
 * @returns {Promise<object|null>} - Parsed compound entry or null if invalid
 */
export async function generateReactionWithAMD(fp, syms, endpoint) {
  const sortedSyms = canonicalElementOrder([...syms]);
  const prompt = `You are generating chemistry reaction data for a browser-based bonding simulation engine.
Output ONLY a single valid JSON object — no prose, no markdown fences, no comments.

The reactants are exactly these atoms: ${sortedSyms.join(", ")}.

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
- "reactants" must be exactly these ${sortedSyms.length} symbols, in this exact order: [${sortedSyms.map((s) => `"${s}"`).join(", ")}].
- Only return this reaction if it is chemically real and well-established. If these atoms do not
  form a known, stable molecule together in one step, return exactly: {"invalid": true}
- HARD LIMIT: never assume more than 10 total atoms.
- SINGLE-STAGE ONLY: no hydrates, crystal water, or molecules requiring an intermediate compound to form first.
- Every reactant index must appear in at least one bond, unless there is only one atom.
- "from"/"to" are indices into "reactants", not symbols.
- Return strictly valid JSON matching the schema.`;

  const raw = await callAMDEndpoint(endpoint, prompt);

  let parsed = null;
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); }
      catch (_) { throw new Error("Malformed AMD reaction JSON"); }
    } else {
      throw new Error("No JSON object found in AMD response");
    }
  }

  if (parsed.invalid) return null;
  if (!Array.isArray(parsed.reactants) || !Array.isArray(parsed.bonds) || !parsed.formula) {
    throw new Error("Malformed AMD reaction object");
  }
  // fromGemini flag used internally by the engine as a marker for AI-generated compounds
  return { ...parsed, fromGemini: true };
}
