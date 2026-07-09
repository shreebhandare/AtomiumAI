import { useState } from "react";
import { getElement } from "../data/elements";
import { fingerprint } from "../chemistry/fingerprint";
import { COMPOUND_BLUEPRINTS, GEMINI_API_KEY, setGeminiApiKey } from "../chemistry/reactionStore";
import { fetchWithRetry } from "../lookup/geminiClient";
import { getCanonicalEquation } from "../chemistry/equationBuilder";

// Upgrade #11.1 (streaming): the model's response is a single structured JSON
// object (see the system prompt below), not free prose, so we can't just dump
// raw chunks into the chat bubble as they arrive. These two helpers do a
// best-effort incremental read of an in-progress JSON buffer: one pulls out
// "type" as soon as it's present, the other walks the (possibly still-open)
// "text" string value char-by-char, honoring escapes, so the chat bubble can
// grow live as tokens stream in instead of popping in all at once at the end.
function extractStreamingType(buffer) {
  const m = buffer.match(/"type"\s*:\s*"(\w+)"/);
  return m ? m[1] : null;
}

function extractStreamingText(buffer) {
  const keyIdx = buffer.indexOf('"text"');
  if (keyIdx === -1) return "";
  const afterKey = buffer.slice(keyIdx + 6);
  const colonIdx = afterKey.indexOf(":");
  if (colonIdx === -1) return "";
  let rest = afterKey.slice(colonIdx + 1).replace(/^\s*/, "");
  if (!rest.startsWith('"')) return "";
  rest = rest.slice(1);

  let out = "";
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i];
    if (ch === "\\") {
      const next = rest[i + 1];
      if (next === undefined) break; // dangling escape at chunk boundary — wait for more data
      if (next === "n") out += "\n";
      else if (next === "t") out += "\t";
      else out += next; // \" \\ \/ etc. — the escaped char itself is the right output
      i++;
      continue;
    }
    if (ch === '"') break; // unescaped closing quote — string is complete
    out += ch;
  }
  return out;
}

// Gemini chat assistant: message thread + the async call that turns a natural-
// language request into a parsed reaction and spawns its atoms onto the canvas.
// Takes the handful of canvas primitives it needs to do that spawn.
export function useChatAssistant({ atomsRef, idCounter, clearAll, setCounts, setTempK, setPressureAtm }) {
  const [chatMessages, setChatMessages] = useState([
    { role: "ai", text: "Hi! I'm Gemini. Ask me about elements, bonding, or reactions." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatExpanded, setChatExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Upgrade #11.3: animated waiting indicator while a Gemini request is in flight.
  const [isWaitingForGemini, setIsWaitingForGemini] = useState(false);
  // Reactive copy of the shared GEMINI_API_KEY live binding (Upgrade #11.2):
  // seeded from the .env value, but updatable at runtime via the Settings dialog.
  const [geminiApiKey, setGeminiApiKeyState] = useState(GEMINI_API_KEY || "");

  function updateGeminiApiKey(key) {
    const trimmed = (key || "").trim();
    setGeminiApiKey(trimmed); // updates the shared module binding other lookups read
    setGeminiApiKeyState(trimmed); // triggers a re-render of anything showing the key/badge
  }

  async function sendChatMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((m) => [...m, { role: "user", text }]);
    setChatInput("");

    if (!geminiApiKey) {
      setChatMessages((m) => [...m, { role: "ai", text: "No Gemini API key is set. Click the ⚙️ settings icon above to add one." }]);
      return;
    }
    setIsWaitingForGemini(true);
    // Hoisted so the catch block can clean up a dangling streaming bubble if
    // the connection drops mid-stream, rather than leaving an empty one stuck
    // on screen alongside the error message.
    let liveMessageId = null;
    try {
      // Upgrades #11.4 (real clarification on parse failure) + #11.5
      // (chemistry-only Q&A support): a single call now asks Gemini to pick
      // ONE of four response types itself, rather than always being forced
      // into the reaction-JSON schema. This lets it answer general chemistry
      // questions conversationally, ask a specific clarifying question when
      // it can't pin down exact reactants (instead of us guessing from a
      // JSON-parse failure), and decline non-chemistry questions — all still
      // via one structured, easy-to-parse response.
      const systemInstructionText = `You are ChemLab AI's chemistry assistant, embedded in a reaction simulation canvas. For every user message, decide which ONE of these four response types applies, then respond with ONLY a single valid JSON object matching that type's schema — no markdown code fences, no introductory text, nothing but the raw JSON object.

TYPE "reaction" — the user wants you to simulate, add, or show a specific chemical reaction or compound on the canvas, AND you are confident of the exact reactant elements.
{
  "type": "reaction",
  "name": string,
  "formula": string,
  "reactants": string[],
  "bonds": [{ "from": int, "to": int, "type": "covalent" | "ionic", "order": 1 | 2 | 3 }],
  "minTempK": number,
  "minPressureAtm": number,
  "deltaH": number,
  "fact": string
}
("reactants" is the flat list of element symbols needed, e.g. ["H","H","O"]. "bonds" indices refer to positions in "reactants". minTempK/minPressureAtm are the conditions needed to trigger it in the simulation. deltaH is enthalpy change in kJ/mol. fact is one short interesting fact.)

TYPE "answer" — a general chemistry question: definitions, facts, atomic/molecular properties, comparisons, "why"/"how" questions — anything that isn't a request to spawn something on the canvas.
{ "type": "answer", "text": string }
(Give a real, direct, conversational answer in "text". Plain text, no markdown.)

TYPE "clarify" — the user seems to want a reaction/compound simulated, but you can't confidently determine the exact reactants (unspecified, ambiguous, not a real reaction, or missing a key detail).
{ "type": "clarify", "text": string }
("text" must be ONE specific follow-up question that references what you can already tell from their message — e.g. naming the elements/compound you did understand and asking exactly what's missing or ambiguous. Never a generic "please ask about a valid reaction" message.)

TYPE "off_topic" — the message has nothing to do with chemistry.
{ "type": "off_topic", "text": string }
(Politely decline in "text" and steer the conversation back to chemistry.)

Always return exactly one JSON object of exactly one type — nothing else.`;

      const res = await fetchWithRetry(
        // Upgrade #11.1: streamGenerateContent + alt=sse gives clean
        // line-delimited "data: {...}" events over the same fetch Response,
        // instead of one blocking generateContent call.
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
            systemInstruction: {
              parts: [{ text: systemInstructionText }]
            }
          }),
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

      // rawBuffer accumulates the full candidate text across every streamed
      // chunk — this is what gets parsed as JSON once the stream ends, same
      // as `reply` did in the old single-shot version. liveMessageId/liveType
      // track the chat bubble we're progressively filling in, if any.
      let rawBuffer = "";
      let liveType = null;

      const updateLiveBubble = () => {
        if (!liveType) {
          liveType = extractStreamingType(rawBuffer);
          // Nothing meaningful to stream token-by-token for "reaction" (it's
          // all structured fields, not prose) — keep the waiting indicator
          // for that case and only spawn atoms once the stream completes.
          if (liveType && liveType !== "reaction" && !liveMessageId) {
            liveMessageId = `gemini-stream-${Date.now()}`;
            setChatMessages((m) => [...m, { role: "ai", text: "", id: liveMessageId, streaming: true }]);
          }
        }
        if (liveType && liveType !== "reaction" && liveMessageId) {
          const partial = extractStreamingText(rawBuffer);
          if (partial) {
            setChatMessages((m) => m.map((msg) => (msg.id === liveMessageId ? { ...msg, text: partial } : msg)));
          }
        }
      };

      if (res.body && res.body.getReader) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const events = sseBuffer.split("\n\n");
          sseBuffer = events.pop() || ""; // keep the last (possibly incomplete) event for next read

          for (const evt of events) {
            const line = evt.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            let chunkObj;
            try {
              chunkObj = JSON.parse(payload);
            } catch (_) {
              continue; // ignore any malformed/partial SSE frame
            }
            const deltaText = chunkObj?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!deltaText) continue;
            rawBuffer += deltaText;
            updateLiveBubble();
          }
        }
      } else {
        // Fallback for environments where a streaming body isn't available —
        // behaves like the old single-shot call.
        const data = await res.json();
        rawBuffer = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }

      const reply = rawBuffer.trim();

      // Replaces (or appends, if nothing was streamed live) the final chat
      // bubble with the fully-resolved text, so streaming glitches/escaping
      // quirks never leave a slightly-wrong partial string on screen.
      const finalizeAiMessage = (finalText) => {
        if (liveMessageId) {
          setChatMessages((m) => m.map((msg) => (msg.id === liveMessageId ? { ...msg, text: finalText, streaming: false } : msg)));
        } else {
          setChatMessages((m) => [...m, { role: "ai", text: finalText }]);
        }
      };

      let parsed = null;
      try {
        const cleaned = reply.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch (e) {
        const match = reply.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch (_) { }
        }
      }

      if (parsed?.type === "reaction" && Array.isArray(parsed.reactants) && parsed.reactants.length > 0) {
        const fp = fingerprint(parsed.reactants);
        COMPOUND_BLUEPRINTS[fp] = { ...parsed, fromGemini: true };

        clearAll();
        const radius = 60;
        const count = parsed.reactants.length;
        atomsRef.current = parsed.reactants.map((sym, index) => {
          const angle = (index / count) * Math.PI * 2;
          const el = getElement(sym);
          return {
            id: idCounter.current++,
            sym: sym,
            x: Math.cos(angle) * radius + (Math.random() - 0.5) * 10,
            y: Math.sin(angle) * radius + (Math.random() - 0.5) * 10,
            vx: 0,
            vy: 0,
            shellAngle: Math.random() * Math.PI * 2,
            shells: el ? [...el.shells] : [1],
            instability: 1,
            vibPhase: Math.random() * 10,
          };
        });

        setCounts({ atoms: atomsRef.current.length, bonds: 0 });
        if (parsed.minTempK) setTempK(parsed.minTempK);
        if (parsed.minPressureAtm) setPressureAtm(parsed.minPressureAtm);

        // Cross-cutting: reaction equation single source of truth — the chat
        // never free-texts its own equation formatting, it always goes
        // through the same getCanonicalEquation() the Inspector/diagnostics/
        // reaction-toasts use, so the notation can't drift between surfaces.
        const equation = getCanonicalEquation(parsed);
        finalizeAiMessage(
          equation
            ? `Added it to the canvas: ${equation} — you can start the simulation.`
            : "I have added atoms to the canvas, you can start the simulation."
        );
      } else if ((parsed?.type === "answer" || parsed?.type === "clarify" || parsed?.type === "off_topic") && parsed.text) {
        // Upgrade #11.5: real conversational answers for general chemistry
        // questions, and Upgrade #11.4: a genuine, specific clarifying
        // question (or a polite off-topic decline) instead of a canned line.
        finalizeAiMessage(parsed.text);
      } else if (parsed?.text) {
        // Model returned a recognizable shape but an unexpected/missing type
        // — still show its text rather than discarding a usable reply.
        finalizeAiMessage(parsed.text);
      } else if (reply) {
        // Genuine parse failure (malformed JSON despite instructions) — show
        // whatever Gemini actually wrote instead of a generic canned message;
        // it's very likely still a real, on-topic answer or clarification.
        finalizeAiMessage(reply);
      } else {
        finalizeAiMessage("I couldn't quite understand that — could you mention the specific elements or compound you're asking about?");
      }
    } catch (err) {
      if (liveMessageId) {
        // A partially-streamed bubble is on screen — replace it with the
        // error rather than leaving an empty/half-finished one behind.
        setChatMessages((m) => m.map((msg) => (msg.id === liveMessageId ? { ...msg, text: `Error contacting Gemini: ${err.message}`, streaming: false } : msg)));
      } else {
        setChatMessages((m) => [...m, { role: "ai", text: `Error contacting Gemini: ${err.message}` }]);
      }
    } finally {
      setIsWaitingForGemini(false);
    }
  }

  return {
    chatMessages, chatInput, setChatInput, chatExpanded, setChatExpanded, sendChatMessage, geminiApiKey,
    settingsOpen, setSettingsOpen, updateGeminiApiKey, isWaitingForGemini,
  };
}
