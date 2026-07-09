import { useState } from "react";
import { getElement } from "../data/elements";
import { fingerprint } from "../chemistry/fingerprint";
import { COMPOUND_BLUEPRINTS, FIREWORKS_API_KEY, setFireworksApiKey, FIREWORKS_MODEL, setFireworksModel } from "../chemistry/reactionStore";
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
export function useChatAssistant({ atomsRef, idCounter, clearAll, setCounts, setTempK, setPressureAtm }) {
  const [chatMessages, setChatMessages] = useState([
    { role: "ai", text: "Hi! I'm your AI Assistant. Ask me about elements, bonding, or reactions." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatExpanded, setChatExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);

  // Reactive copies of the shared FIREWORKS live bindings
  const [fireworksApiKey, setFireworksApiKeyState] = useState(FIREWORKS_API_KEY || "");
  const [fireworksModel, setFireworksModelState] = useState(FIREWORKS_MODEL || "accounts/fireworks/models/llama-v3p3-70b-instruct");

  function updateFireworksApiKey(key) {
    const trimmed = (key || "").trim();
    setFireworksApiKey(trimmed);
    setFireworksApiKeyState(trimmed);
  }

  function updateFireworksModel(model) {
    const trimmed = (model || "").trim();
    setFireworksModel(trimmed);
    setFireworksModelState(trimmed);
  }

  async function sendChatMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((m) => [...m, { role: "user", text }]);
    setChatInput("");

    if (!fireworksApiKey) {
      setChatMessages((m) => [...m, { role: "ai", text: "No AI API key is set. Click the ⚙️ settings icon above to add one." }]);
      return;
    }
    setIsWaitingForAI(true);
    let liveMessageId = null;
    try {
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
        "https://api.fireworks.ai/inference/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${fireworksApiKey}`
          },
          body: JSON.stringify({
            model: fireworksModel,
            messages: [
              { role: "system", content: systemInstructionText },
              { role: "user", content: text }
            ],
            stream: true,
            response_format: { type: "json_object" }
          }),
        }
      );
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("AI API Rate Limit Exceeded (429). Please wait a moment before trying again.");
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error("AI API Key Invalid or Unauthorized. Please verify your key in Settings.");
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

        const equation = getCanonicalEquation(parsed);
        finalizeAiMessage(
          equation
            ? `Added it to the canvas: ${equation} — you can start the simulation.`
            : "I have added atoms to the canvas, you can start the simulation."
        );
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
    chatMessages, chatInput, setChatInput, chatExpanded, setChatExpanded, sendChatMessage, fireworksApiKey,
    settingsOpen, setSettingsOpen, updateFireworksApiKey, fireworksModel, updateFireworksModel, isWaitingForAI,
  };
}
