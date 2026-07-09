import { getEnabledReactionsFromDB } from "../lookup/reactionRepository";
import { transformDbRowToReaction } from "./reactionAdapter";
import { validateReaction } from "./reactionValidator";
import { clearReactions, registerReaction, setReactionStoreReady } from "./reactionStore";
import { REACTION_SEED_DATA } from "./reactionsSeed";

/**
 * Orchestrator: Fetches database rows, validates structures, registers to store cache,
 * and handles offline seed fallbacks.
 *
 * @returns {Promise<void>}
 */
export async function initializeReactionStore() {
  setReactionStoreReady(false);
  clearReactions();

  try {
    console.log("[Initializer] Connecting to Supabase for reactions...");
    const rawRows = await getEnabledReactionsFromDB();
    let validCount = 0;

    rawRows.forEach((row) => {
      const reactionObj = transformDbRowToReaction(row);
      if (validateReaction(reactionObj)) {
        registerReaction(reactionObj);
        validCount++;
      } else {
        console.warn(`[Initializer] Skipping malformed reaction: ${row.reaction_code || "Unknown"}`);
      }
    });

    console.log(`[Initializer] Initialization complete. Loaded ${validCount}/${rawRows.length} reactions.`);
  } catch (err) {
    console.warn("[Initializer] Database offline or failed. Loading local seed fallback. Error:", err.message);
    
    // Offline Seed Fallback
    let fallbackCount = 0;
    REACTION_SEED_DATA.forEach((entry, idx) => {
      // Backfill human-readable reaction codes for static seed items if missing
      const fallbackEntry = {
        reactionCode: entry.reactionCode || `RXN_SEED_${String(idx + 1).padStart(3, '0')}`,
        ...entry
      };
      if (validateReaction(fallbackEntry)) {
        registerReaction(fallbackEntry);
        fallbackCount++;
      }
    });

    console.log(`[Initializer] Loaded ${fallbackCount} offline local seed fallback reactions.`);
  } finally {
    setReactionStoreReady(true);
  }
}
