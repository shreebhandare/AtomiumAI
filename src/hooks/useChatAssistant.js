import { useState } from "react";
import { getElement } from "../data/elements";
import { fingerprint } from "../chemistry/fingerprint";
import { COMPOUND_BLUEPRINTS, FIREWORKS_API_KEY, FIREWORKS_MODEL } from "../chemistry/reactionStore";
import { fetchWithRetry } from "../lookup/fireworksClient";
import { getCanonicalEquation } from "../chemistry/equationBuilder";

// Incremental JSON reader helpers to extract type and text from raw buffer
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
      if (next === undefined) break; // dangling escape at chunk boundary
      if (next === "n") out += "\n";
      else if (next === "t") out += "\t";
      else out += next;
      i++;
      continue;
    }
    if (ch === '"') break; // closing quote
    out += ch;
  }
  return out;
}

// AI chat assistant: message thread + the async call that turns a natural-
// language request into a parsed reaction and spawns its atoms onto the canvas.
export function useChatAssistant({
  atomsRef,
  idCounter,
  clearAll,
  setCounts,
  setTempK,
  setPressureAtm,
  pushUndoSnapshot,
  selectedAtom,
  selectedMolecule,
  currentMolecules,
  reactionEquation,
  experimentHistory,
}) {
  const [chatMessages, setChatMessages] = useState([
    { role: "ai", text: "Hi! I'm your AI Assistant. Ask me about elements, bonding, or reactions." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatExpanded, setChatExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);

  async function sendChatMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((m) => [...m, { role: "user", text }]);
    setChatInput("");

    if (!FIREWORKS_API_KEY) {
      setChatMessages((m) => [...m, { role: "ai", text: "No AI API key configured. Add VITE_FIREWORKS_API_KEY to your .env file." }]);
      return;
    }
    if (!FIREWORKS_MODEL) {
      setChatMessages((m) => [...m, { role: "ai", text: "No AI model configured. Add VITE_FIREWORKS_MODEL to your .env file." }]);
      return;
    }
    setIsWaitingForAI(true);
    let liveMessageId = null;
    try {
      const canvasState = {
        molecules: currentMolecules || [],
        atoms: (atomsRef.current || []).map(a => ({ symbol: a.sym, id: a.id })),
        selected: selectedAtom
          ? { atom: selectedAtom.sym, id: selectedAtom.id }
          : (selectedMolecule ? { molecule: selectedMolecule.formula || selectedMolecule.name } : null),
        reactionEquation: typeof reactionEquation === "string" ? reactionEquation : (reactionEquation?.entry?.name || ""),
        recentExperiments: (experimentHistory || []).slice(-5).map(e => ({ name: e.name, reactants: e.reactants, products: e.products })),
      };

      const systemInstructionText = `You are Atomium's chemistry assistant, embedded in a reaction simulation canvas.
For every user message, decide which ONE of the response types applies, then respond with ONLY a single valid JSON object matching that type's schema — no markdown code fences, no introductory text, nothing but the raw JSON object.

CAPABILITIES:
- Answer chemistry questions (facts, definitions, atomic properties, comparisons).
- Suggest/simulate reactions by clearing the canvas and placing reactants (using the "reaction" type).
- Spawn/add individual atoms to the existing canvas without clearing (using the "spawn_atoms" type).
- Inspect and discuss the current state of the canvas, which will be provided to you in structured JSON.

RESPONSE TYPES:

TYPE "reaction" — the user wants to simulate or show a specific reaction or compound from scratch, and you are confident of the reactants.
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
("reactants" is the flat list of element symbols needed. "bonds" indices refer to positions in "reactants". minTempK/minPressureAtm are the conditions. deltaH is enthalpy change in kJ/mol. fact is an interesting fact.)

TYPE "spawn_atoms" — the user wants to add/spawn specific raw atoms to the existing canvas without clearing it (e.g. "add a hydrogen atom" or "spawn H H O").
{
  "type": "spawn_atoms",
  "atoms": string[],
  "text": string
}
("atoms" is the flat list of symbols to spawn, e.g. ["H", "H", "O"]. "text" is a message confirming what was added.)

TYPE "answer" — a general chemistry question or a question about the current canvas state.
{ "type": "answer", "text": string }
(Give a real, direct, conversational answer in "text". Plain text, no markdown. Answer questions about the canvas state accurately based on the provided CANVAS_STATE.)

TYPE "clarify" — the user seems to want a reaction or atoms simulated/added, but you cannot confidently determine the reactants or symbols.
{ "type": "clarify", "text": string }
("text" must be a specific follow-up question.)

TYPE "off_topic" — the message has nothing to do with chemistry.
{ "type": "off_topic", "text": string }

CURRENT CANVAS STATE (JSON):
${JSON.stringify(canvasState, null, 2)}

Always return exactly one JSON object of exactly one type — nothing else.`;

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
            messages: [
              { role: "system", content: systemInstructionText },
              { role: "user", content: text }
            ],
            stream: true
          }),
        }
      );
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("AI API Rate Limit Exceeded (429). Please wait a moment before trying again.");
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error("AI API Key Invalid or Unauthorized. Please verify VITE_FIREWORKS_API_KEY in your .env file.");
        }
        throw new Error(`AI request failed: ${res.status}`);
      }

      let rawBuffer = "";
      let liveType = null;

      const updateLiveBubble = () => {
        if (!liveType) {
          liveType = extractStreamingType(rawBuffer);
          if (liveType && liveType !== "reaction" && !liveMessageId) {
            liveMessageId = `ai-stream-${Date.now()}`;
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
          sseBuffer = events.pop() || "";

          for (const evt of events) {
            const line = evt.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            let chunkObj;
            try {
              chunkObj = JSON.parse(payload);
            } catch (_) {
              continue;
            }
            const deltaText = chunkObj?.choices?.[0]?.delta?.content;
            if (!deltaText) continue;
            rawBuffer += deltaText;
            updateLiveBubble();
          }
        }
      } else {
        const data = await res.json();
        rawBuffer = data?.choices?.[0]?.message?.content || "";
      }

      const reply = rawBuffer.trim();

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
        COMPOUND_BLUEPRINTS[fp] = { ...parsed, fromAtomiumAI: true };

        if (typeof pushUndoSnapshot === "function") pushUndoSnapshot();
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

        const equation = getCanonicalEquation(parsed);
        finalizeAiMessage(
          equation
            ? `Added it to the canvas: ${equation} — you can start the simulation.`
            : "I have added atoms to the canvas, you can start the simulation."
        );
      } else if (parsed?.type === "spawn_atoms" && Array.isArray(parsed.atoms) && parsed.atoms.length > 0) {
        if (typeof pushUndoSnapshot === "function") pushUndoSnapshot();
        const radius = 60;
        const count = parsed.atoms.length;
        const newAtoms = parsed.atoms.map((sym, index) => {
          const angle = (index / count) * Math.PI * 2;
          const el = getElement(sym);
          return {
            id: idCounter.current++,
            sym: sym,
            x: Math.cos(angle) * radius + (Math.random() - 0.5) * 15,
            y: Math.sin(angle) * radius + (Math.random() - 0.5) * 15,
            vx: 0,
            vy: 0,
            shellAngle: Math.random() * Math.PI * 2,
            shells: el ? [...el.shells] : [1],
            instability: 1,
            vibPhase: Math.random() * 10,
          };
        });
        atomsRef.current = [...atomsRef.current, ...newAtoms];
        setCounts({ atoms: atomsRef.current.length, bonds: 0 }); // bonds will be recomputed by the physics engine

        finalizeAiMessage(parsed.text || `Spawned: ${parsed.atoms.join(", ")}`);
      } else if ((parsed?.type === "answer" || parsed?.type === "clarify" || parsed?.type === "off_topic") && parsed.text) {
        finalizeAiMessage(parsed.text);
      } else if (parsed?.text) {
        finalizeAiMessage(parsed.text);
      } else if (reply) {
        finalizeAiMessage(reply);
      } else {
        finalizeAiMessage("I couldn't quite understand that — could you mention the specific elements or compound you're asking about?");
      }
    } catch (err) {
      if (liveMessageId) {
        setChatMessages((m) => m.map((msg) => (msg.id === liveMessageId ? { ...msg, text: `Error contacting AI: ${err.message}`, streaming: false } : msg)));
      } else {
        setChatMessages((m) => [...m, { role: "ai", text: `Error contacting AI: ${err.message}` }]);
      }
    } finally {
      setIsWaitingForAI(false);
    }
  }

  return {
    chatMessages, chatInput, setChatInput, chatExpanded, setChatExpanded, sendChatMessage,
    settingsOpen, setSettingsOpen, isWaitingForAI,
  };
}
