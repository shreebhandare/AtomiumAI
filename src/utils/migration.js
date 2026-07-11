/**
 * migration.js
 * Centralized data schema migration handlers for Atomium AI.
 */

export const CURRENT_VERSIONS = {
  PANEL_LAYOUT: 2,
  MOLECULE_SCHEMA: 1,
  TUTORIAL_STATE: 1,
  USER_PREFERENCES: 1
};

/**
 * Migrate Panel Layout to the current layout version.
 * @param {string|object} saved 
 * @returns {object} Migrated panel layout state
 */
export function migratePanelLayout(saved) {
  if (!saved) return null;
  
  let data = saved;
  if (typeof saved === "string") {
    try {
      data = JSON.parse(saved);
    } catch {
      return null;
    }
  }

  const version = data.version || 1;

  if (version === CURRENT_VERSIONS.PANEL_LAYOUT) {
    return data.layout || data;
  }

  // Example migration from v1 -> v2
  if (version === 1) {
    console.log("Migrating panel layout from v1 to v2...");
    const legacyLayout = data.layout || data;
    // Map legacy structure or augment with new panel defaults
    const migrated = { ...legacyLayout };
    
    // Ensure all mandatory v2 panels are populated
    const requiredPanels = ["canvas", "chat", "inspector", "periodic", "molecules", "notebook", "viewer3d"];
    requiredPanels.forEach(panelId => {
      if (!migrated[panelId]) {
        migrated[panelId] = {
          id: panelId,
          x: 100,
          y: 100,
          width: 400,
          height: 300,
          zIndex: 1,
          active: panelId !== "viewer3d",
          collapsed: false
        };
      }
    });

    return migrated;
  }

  return null;
}

/**
 * Migrate Molecule schemas to the current molecule JSON model.
 * @param {object} molecule 
 * @returns {object} Migrated molecule object
 */
export function migrateMolecule(molecule) {
  if (!molecule) return null;
  const version = molecule.version || 1;

  if (version === CURRENT_VERSIONS.MOLECULE_SCHEMA) {
    return molecule;
  }

  // Perform schema adaptations if version changes in the future
  return molecule;
}

/**
 * Migrate Tutorial State.
 * @param {string|object} saved 
 * @returns {object} Migrated tutorial states
 */
export function migrateTutorialState(saved) {
  if (!saved) return null;
  // Implementation of future tutorial completion schemas
  return saved;
}
