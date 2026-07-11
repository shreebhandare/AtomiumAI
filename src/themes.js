// ─────────────────────────────────────────────────────────────────────────────
// ChemLabAI — App Themes
// Edit the color values below to customize how each theme looks.
//
// Available themes: light | dawn | dark | grey | ocean
//
// Every theme must define these slots:
//   bgApp            → main canvas / app background
//   bgPanel          → sidebar / panel / drawer background
//   bgCard           → card & floating surface background
//   bgHover          → hover-state background tint
//   bgHeader         → top header bar background
//   textPrimary      → main body text
//   textSecondary    → secondary / label text
//   textMuted        → placeholder / disabled / muted text
//   border           → default divider & border color
//   borderAccent     → highlighted / focused border color
//   btnBg            → button background (resting)
//   btnHover         → button background (hovered)
//   btnBorder        → button border color
//   btnText          → button label color
//   scrollTrack      → scrollbar track
//   scrollThumb      → scrollbar thumb (resting)
//   scrollThumbHover → scrollbar thumb (hovered)
// ─────────────────────────────────────────────────────────────────────────────

export const APP_THEMES = {

  // ── Light ──────────────────────────────────────────────────────────────────
  light: {
    bgApp: "#e8ecf1",
    bgPanel: "#ffffff",
    bgCard: "#f6f8fa",
    bgHover: "#eef1f5",
    bgHeader: "#ffffff",

    textPrimary: "#0d1321",
    textSecondary: "#4b5768",
    textMuted: "#8a95a5",

    border: "#e3e7ed",
    borderAccent: "#3b5bdb",

    btnBg: "#ffffff",
    btnHover: "#eef1f5",
    btnBorder: "#d7dce4",
    btnText: "#1f2937",

    scrollTrack: "#f0f2f5",
    scrollThumb: "#c7cdd6",
    scrollThumbHover: "#a3abb8",
  },

  // ── Dawn (warm sepia) ──────────────────────────────────────────────────────
  dawn: {
    bgApp: "#ecdfc7",
    bgPanel: "#f7f0e6",
    bgCard: "#f0e5d4",
    bgHover: "#e8d9c2",
    bgHeader: "#f7f0e6",

    textPrimary: "#2e2113",
    textSecondary: "#6b5539",
    textMuted: "#9c8768",

    border: "#e2cfad",
    borderAccent: "#b8843a",

    btnBg: "#f7f0e6",
    btnHover: "#ecdfc7",
    btnBorder: "#dcc59d",
    btnText: "#2e2113",

    scrollTrack: "#f0e5d4",
    scrollThumb: "#d3bd97",
    scrollThumbHover: "#b89f72",
  },

  // ── Dark (navy) ────────────────────────────────────────────────────────────
  dark: {
    bgApp: "#070a11",
    bgPanel: "#0e1420",
    bgCard: "#161d2c",
    bgHover: "#1f293b",
    bgHeader: "#0e1420",

    textPrimary: "#eef1f6",
    textSecondary: "#9aa5b8",
    textMuted: "#5d6a80",

    border: "#232c3f",
    borderAccent: "#5b7fff",

    btnBg: "#161d2c",
    btnHover: "#1f293b",
    btnBorder: "#2b3549",
    btnText: "#dde3ee",

    scrollTrack: "#131a27",
    scrollThumb: "#2b3549",
    scrollThumbHover: "#3c4863",
  },

  // ── Grey (zinc / charcoal) ─────────────────────────────────────────────────
  grey: {
    bgApp: "#161618",
    bgPanel: "#212124",
    bgCard: "#28282c",
    bgHover: "#333338",
    bgHeader: "#212124",

    textPrimary: "#f2f2f3",
    textSecondary: "#a8a8ae",
    textMuted: "#707076",

    border: "#37373c",
    borderAccent: "#7c8cf8",

    btnBg: "#28282c",
    btnHover: "#333338",
    btnBorder: "#414147",
    btnText: "#e8e8ea",

    scrollTrack: "#28282c",
    scrollThumb: "#454549",
    scrollThumbHover: "#5a5a60",
  },

  // ── Ocean (cool blue) ──────────────────────────────────────────────────────
  ocean: {
    bgApp: "#e2e9f2",
    bgPanel: "#f7fafd",
    bgCard: "#eef3f9",
    bgHover: "#e5ecf5",
    bgHeader: "#f7fafd",

    textPrimary: "#0f1f38",
    textSecondary: "#3f5578",
    textMuted: "#8296b3",

    border: "#d7e1ee",
    borderAccent: "#2563eb",

    btnBg: "#f7fafd",
    btnHover: "#e5ecf5",
    btnBorder: "#c7d5e6",
    btnText: "#1e3a5f",

    scrollTrack: "#eef3f9",
    scrollThumb: "#c2d0e2",
    scrollThumbHover: "#9fb3cc",
  },

};

/**
 * Returns the color map for the given theme key.
 * Falls back to `light` if the key is unknown.
 *
 * @param {string} themeKey
 * @returns {typeof APP_THEMES.light}
 */
export function getTheme(themeKey) {
  return APP_THEMES[themeKey] ?? APP_THEMES.light;
}