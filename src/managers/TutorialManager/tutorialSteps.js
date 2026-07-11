/**
 * tutorialSteps.js
 * Data-driven tutorial step definitions.
 * Adding or reordering tutorial steps is a data change — no code changes needed.
 */

export const TUTORIAL_STEPS = [
  {
    id: "welcome",
    target: null, // no DOM highlight — full-screen intro card
    title: "Welcome to Atomium AI! 🧪",
    description:
      "This is your AI-powered chemistry sandbox. Build molecules, simulate reactions, and explore chemistry visually. Let's take a quick tour!",
    position: "center",
  },
  {
    id: "periodic-table",
    target: "periodic-table-header",
    title: "Periodic Table",
    description:
      "Search and drag elements from the Periodic Table onto the canvas below, or press Enter to instantly spawn a matched element.",
    position: "top",
  },
  {
    id: "formula-input",
    target: "formula-input-field",
    title: "Formula Input",
    description:
      "Type a chemical formula like H₂O, NaCl, or C₆H₁₂O₆ here to instantly spawn pre-built molecules onto the canvas.",
    position: "right",
  },
  {
    id: "canvas-view-tabs",
    target: "tab-bohr",
    title: "View Modes",
    description:
      "Switch between Bohr (electron shell), 2D (structural bond), and 3D (spatial geometry) visualizations using the tabs above the canvas.",
    position: "bottom",
  },
  {
    id: "canvas-hud",
    target: "hud-start-stop",
    title: "Simulation Controls",
    description:
      "Use these controls to Start or Stop the reaction simulation, Clear the canvas, and reset or fit the viewport zoom.",
    position: "bottom",
  },
  {
    id: "inspector",
    target: null,
    title: "Inspector & Lab Notebook",
    description:
      "Click any atom on the canvas to see its detailed properties here. Your discovered reactions are automatically logged to the Lab Notebook below.",
    position: "right",
  },
  {
    id: "ai-chat",
    target: null,
    title: "AI Chemistry Assistant",
    description:
      "Ask the AI to explain reactions, predict outcomes, or even spawn molecules directly by typing commands like [SPAWN: water]!",
    position: "left",
  },
  {
    id: "complete",
    target: null,
    title: "You're All Set! 🎉",
    description:
      "You know the basics. Start experimenting — drag atoms together, build molecules, and discover reactions. Happy Chemistry!",
    position: "center",
  },
];
