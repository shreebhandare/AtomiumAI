# ⚗️ ChemLab AI

> **An AI-powered, browser-based chemistry laboratory** — drag, drop, and react elements on an infinite canvas, powered by Gemini AI, PubChem, and real-time 3D molecular visualization.

---

## ✨ Features

### 🧪 Interactive Canvas Lab
- **Drag-and-drop atoms** from a full periodic table palette onto an infinite zoomable canvas
- **Draw bonds** between atoms by connecting them, then hit **▶ Start** to trigger real chemical reactions
- **Formula spawning** — type `H2O`, `BaCl2`, `Ca(OH)2` and watch a complete molecule appear, atom-by-atom

### 🤖 AI Assistant
- **Built-in chat panel** powered by Fireworks AI for chemistry Q&A and reaction explanations
- **AI-explained reactions** — every experiment result includes a plain-English chemical explanation
- **Streaming responses** with a live cursor indicator

### 🔬 Molecule Visualization
Switch between three rendering modes from the top bar:
| Mode | Description |
|------|-------------|
| **Bohr Model** | Classical shell-based atomic diagram with animated electrons |
| **Simple 2D** | Structural bond-line diagram — Lewis structure style |
| **3D Model** | Real 3D PubChem/3Dmol rendered molecule with spin controls |

### 🧬 Reaction Engine
- **Offline reaction database** — 300+ pre-loaded chemical reactions
- **PubChem live lookup** — if a combination is not in the local database, it queries PubChem in real time
- **Fireworks AI fallback** — unrecognised reactions are resolved by Fireworks and cached for the session
- **Reaction toasts** — floating animated toast notifications show what's forming

### 📓 Lab Notebook
- **Current Experiment** shows the molecules currently on canvas
- **Experiment History** tracks every reaction run with reactants, products, and hazard classification (Safe / Caution / Hazardous)

### 🎨 App Themes
Four switchable palettes available from **Settings → App Theme**:
| Theme | Description |
|-------|-------------|
| **Light** | Clean white workspace |
| **Dawn** | Warm peach-amber sunrise |
| **Dark** | Deep space navy lab |
| **Grey** | Industrial steel monochrome |

Themes persist across sessions via `localStorage`.

### 🗂️ Collapsible Periodic Table
The periodic table drawer slides open from the bottom of the canvas — collapse it for maximum workspace, expand it to browse and drag elements.

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- A [Fireworks AI API key](https://fireworks.ai/) *(optional — the app works without it using PubChem)*

### Installation

```bash
git clone https://github.com/shreebhandare/ChemLab.git
cd ChemLab
npm install
```

### Configuration

Create a `.env` file in the project root:

```env
VITE_FIREWORKS_API_KEY=your_fireworks_api_key_here
VITE_FIREWORKS_MODEL=accounts/fireworks/models/llama-v3p3-70b-instruct   # optional
VITE_SUPABASE_URL=your_supabase_url          # optional — for persistence
VITE_SUPABASE_ANON_KEY=your_supabase_key     # optional
```

> The app runs fully without the Supabase keys. Fireworks key enables the AI chat panel and AI-explained reactions.

### Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production build

```bash
npm run build
npm run preview
```

---

## 🏗️ Architecture

```
src/
├── ChemLabCanvas.jsx        # Root — state, theme engine, layout orchestration
├── Molecule3DViewer.jsx     # 3Dmol.js wrapper for 3D molecular viewer
├── layoutEngine.js          # Auto-layout algorithm for spawned molecules
├── formulaParser.js         # Parses chemical formulas (H2O -> [H, H, O])
├── supabase.js              # Supabase client setup
│
├── components/
│   ├── Header/              # HeaderBar — top nav, visualization tabs, settings modal
│   ├── Canvas/              # CanvasStage — HTML5 canvas, zoom, pan, drag
│   ├── Inspector/           # InspectorSidebar — atom inspector, lab notebook
│   ├── ChatAssistant/       # ChatPanel — AI streaming chat
│   ├── PeriodicTable/       # PeriodicTablePalette — collapsible element browser
│   ├── FormulaInput/        # Formula text input with live validation
│   ├── ReactionsBar/        # Equation bar at bottom of canvas
│   ├── Legend/              # Simple mode bond notation legend
│   └── Tooltip/             # Element hover tooltip
│
├── chemistry/               # Reaction database, bond rules, hazard data
├── data/                    # Element definitions (118 elements, shells, EN, mass)
├── hooks/                   # useChatAssistant, useLiveRef
├── lookup/                  # PubChem & Fireworks API lookup helpers
├── render/                  # Canvas draw functions (atoms, bonds, formulas)
└── features/                # Feature-specific logic (Bohr, simple mode)
```

---

## 🧑‍🔬 How to Use

1. **Add atoms** — drag from the periodic table, or type a formula like `NaCl` and click Spawn
2. **Connect atoms** — click an atom, then click another to form a bond
3. **React** — click **▶ Start** to trigger the reaction engine
4. **Inspect** — click any atom to see its properties in the Inspector sidebar
5. **Ask AI** — use the AI chat panel on the right to ask chemistry questions
6. **Switch modes** — use **Bohr / Simple 2D / 3D** tabs in the top bar to change visualization
7. **Change theme** — click ⚙ Settings → App Theme to pick Light, Dawn, Dark, or Grey

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| UI Framework | React 18 + Vite |
| Canvas Rendering | HTML5 Canvas 2D API |
| 3D Molecules | 3Dmol.js |
| AI Chat | Fireworks AI (streaming) |
| Chemistry Data | PubChem REST API |
| Backend / DB | Supabase (optional) |
| Fonts | Space Grotesk + Space Mono (Google Fonts) |
| Styling | Vanilla CSS-in-JS with dynamic CSS variables |

---

## 📜 License

MIT © [Shrikant Bhandare](https://github.com/shreebhandare)
