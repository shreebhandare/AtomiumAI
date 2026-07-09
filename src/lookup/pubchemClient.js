// PubChem REST API client. Called when the engine encounters an atom combination
// not present in the local COMPOUND_BLUEPRINTS table. PubChem's API is CORS-enabled, so this
// runs directly from the browser with no server route needed.
import { ELEMENTS } from "../data/elements";
import { canonicalFormulaFromSyms } from "../formulaParser";

// ───────────────────────── PUBCHEM API CLIENT ─────────────────────────

// Option 1: Fast Formula lookup (returns properties directly, including CID)
export async function fetchCompoundPropertiesByFastFormula(formula) {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastformula/${encodeURIComponent(formula)}/property/MolecularFormula,MolecularWeight,IUPACName,CovalentUnitCount,Charge/JSON`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`fastformula lookup failed: ${res.status}`);
  }
  const data = await res.json();
  const props = data?.PropertyTable?.Properties?.[0];
  if (!props || !props.CID) {
    throw new Error(`No properties or CID returned from fastformula`);
  }
  return {
    cid: props.CID,
    MolecularFormula: props.MolecularFormula,
    MolecularWeight: props.MolecularWeight,
    IUPACName: props.IUPACName,
    CovalentUnitCount: props.CovalentUnitCount,
    Charge: props.Charge
  };
}

// Option 2 (Fallback): Formula search with ListKey polling
export async function fetchCIDByFormulaWithPolling(formula) {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/formula/${encodeURIComponent(formula)}/JSON?MaxRecords=1`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Formula search request failed: ${res.status}`);
  }
  const data = await res.json();

  // Case A: Immediate result
  if (data?.PC_Compounds?.[0]?.id?.id?.cid) {
    return data.PC_Compounds[0].id.id.cid;
  }

  // Case B: Asynchronous search (Waiting with ListKey)
  const listkey = data?.Waiting?.ListKey;
  if (!listkey) {
    throw new Error("No CID or ListKey returned in formula search");
  }

  console.log(`[PubChem] Formula search is running asynchronously. ListKey: ${listkey}. Polling...`);

  const pollUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/listkey/${listkey}/cids/JSON`;
  const maxAttempts = 15;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const pollRes = await fetch(pollUrl);
      if (pollRes.ok) {
        const pollData = await pollRes.json();
        const cid = pollData?.IdentifierList?.CID?.[0];
        if (cid) {
          console.log(`[PubChem] Polling succeeded on attempt ${attempt}. Found CID: ${cid}`);
          return cid;
        }
      }
    } catch (err) {
      console.warn(`[PubChem] Polling attempt ${attempt} failed:`, err.message);
    }
  }
  throw new Error(`Formula search timed out after polling for ${maxAttempts} seconds`);
}

// Fetch properties for a given CID
export async function getCompoundPropertiesByCID(cid) {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IUPACName,CovalentUnitCount,Charge/JSON`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Properties lookup by CID failed: ${res.status}`);
  }
  const data = await res.json();
  const props = data?.PropertyTable?.Properties?.[0];
  if (!props) {
    throw new Error("No properties returned for CID");
  }
  return {
    cid,
    MolecularFormula: props.MolecularFormula,
    MolecularWeight: props.MolecularWeight,
    IUPACName: props.IUPACName,
    CovalentUnitCount: props.CovalentUnitCount,
    Charge: props.Charge
  };
}

// ───────────────────────── PUBCHEM COMPOUND RECORD ─────────────────────────
// Fetches the full compound record (atoms + bonds + coordinates) from PubChem.
// This is the AUTHORITATIVE source for molecular connectivity.
// Atomic number → element symbol lookup table
export const ATOMIC_NUM_TO_SYM = {};
ELEMENTS.forEach((el) => { ATOMIC_NUM_TO_SYM[el.z] = el.sym; });

export async function fetchCompoundRecord(cid) {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/JSON`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Compound record fetch failed: ${res.status}`);
  }
  const data = await res.json();
  const compound = data?.PC_Compounds?.[0];
  if (!compound) {
    throw new Error("No compound record returned");
  }

  // Extract atoms: array of { aid, sym }
  const atomAids = compound.atoms?.aid;
  const atomElements = compound.atoms?.element;
  if (!atomAids || !atomElements || atomAids.length !== atomElements.length) {
    throw new Error("Invalid or missing atom data in compound record");
  }
  const atoms = atomAids.map((aid, i) => {
    const sym = ATOMIC_NUM_TO_SYM[atomElements[i]];
    if (!sym) throw new Error(`Unknown atomic number: ${atomElements[i]}`);
    return { aid, sym };
  });

  // Extract bonds: array of { aid1, aid2, order }
  const bondAid1 = compound.bonds?.aid1;
  const bondAid2 = compound.bonds?.aid2;
  const bondOrder = compound.bonds?.order;
  if (!bondAid1 || !bondAid2 || !bondOrder ||
    bondAid1.length !== bondAid2.length || bondAid1.length !== bondOrder.length) {
    throw new Error("Invalid or missing bond data in compound record");
  }
  const bonds = bondAid1.map((a1, i) => ({
    aid1: a1,
    aid2: bondAid2[i],
    order: bondOrder[i],
  }));

  // Extract coordinates if available
  let coords = null;
  const coordBlock = compound.coords?.[0];
  const conformer = coordBlock?.conformers?.[0];
  if (conformer?.x && conformer?.y && conformer?.x.length === atoms.length) {
    coords = atoms.map((atom) => {
      const idx = coordBlock.aid.indexOf(atom.aid);
      if (idx !== -1) {
        return { x: conformer.x[idx], y: -conformer.y[idx] }; // Negate Y so it maps correctly to standard Cartesian visual space
      }
      return null;
    });
    if (coords.some(c => c === null)) {
      coords = null;
    }
  }

  return { atoms, bonds, coords };
}

export async function tryPubChem(fp, syms) {
  // Build a canonical molecular formula from the symbol list
  const formula = canonicalFormulaFromSyms(syms);

  let props = null;

  // Try Option 1: Fast Formula search first
  try {
    console.log(`[PubChem] Attempting fastformula lookup for: ${formula}`);
    props = await fetchCompoundPropertiesByFastFormula(formula);
    console.log(`[PubChem] fastformula lookup succeeded. CID: ${props.cid}`);
  } catch (err) {
    console.warn(`[PubChem] fastformula lookup failed for ${formula}:`, err.message);
    // Fallback to Option 2: Formula search with polling
    console.log(`[PubChem] Falling back to standard formula search with polling for: ${formula}`);
    const cid = await fetchCIDByFormulaWithPolling(formula);
    props = await getCompoundPropertiesByCID(cid);
  }

  // ── Fetch the AUTHORITATIVE compound record for atom + bond data ──
  let record;
  try {
    record = await fetchCompoundRecord(props.cid);
    console.log(`[PubChem] Compound record fetched. Atoms: ${record.atoms.length}, Bonds: ${record.bonds.length}`);
  } catch (err) {
    console.error(`[PubChem] Failed to fetch compound record for CID ${props.cid}:`, err.message);
    throw new Error(`Structure unavailable for ${formula}: ${err.message}`);
  }

  // ── Validate: PubChem's atoms must match the user's atom symbols exactly ──
  const recordSymCounts = {};
  for (const a of record.atoms) recordSymCounts[a.sym] = (recordSymCounts[a.sym] || 0) + 1;
  const inputSymCounts = {};
  for (const s of syms) inputSymCounts[s] = (inputSymCounts[s] || 0) + 1;

  const symCountsMatch = Object.keys(inputSymCounts).every(
    (k) => recordSymCounts[k] === inputSymCounts[k]
  ) && Object.keys(recordSymCounts).every(
    (k) => inputSymCounts[k] === recordSymCounts[k]
  );

  if (!symCountsMatch) {
    console.error(`[PubChem] Atom count mismatch. Input: ${JSON.stringify(inputSymCounts)}, Record: ${JSON.stringify(recordSymCounts)}`);
    throw new Error(`Structure unavailable: atom counts do not match PubChem record`);
  }

  // ── Build the reactants array in PubChem's atom order (preserving identity) ──
  const reactants = record.atoms.map((a) => a.sym);

  // ── Build aid → index mapping ──
  const aidToIndex = {};
  record.atoms.forEach((a, i) => { aidToIndex[a.aid] = i; });

  // ── Translate PubChem bonds to our bond map using the aidToIndex mapping ──
  // Validation: every aid in every bond must map to exactly one atom
  const bondMap = [];
  for (const b of record.bonds) {
    const fromIdx = aidToIndex[b.aid1];
    const toIdx = aidToIndex[b.aid2];
    if (fromIdx === undefined || toIdx === undefined) {
      console.error(`[PubChem] Bond references invalid atom ID: aid1=${b.aid1}, aid2=${b.aid2}`);
      throw new Error(`Structure unavailable: bond references invalid atom ID`);
    }
    bondMap.push({
      from: fromIdx,
      to: toIdx,
      type: "covalent",
      order: b.order,
    });
  }

  // Fetch a brief description for the fact/fun-fact field
  let description = `${props.IUPACName || formula} — MW: ${props.MolecularWeight} g/mol`;
  try {
    const descRes = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${props.cid}/description/JSON`
    );
    if (descRes.ok) {
      const descData = await descRes.json();
      const descEntry = descData?.InformationList?.Information?.find((i) => i.Description);
      if (descEntry?.Description) description = descEntry.Description.slice(0, 140);
    }
  } catch (_) { /* description fallback already set */ }

  return {
    name: props.IUPACName || formula,
    formula: props.MolecularFormula || formula,
    reactants,      // PubChem's atom order — NOT sorted
    bonds: bondMap,  // directly from PubChem's bond list
    coords: record.coords, // PubChem 2D coordinates
    minTempK: 298,
    minPressureAtm: 1,
    deltaH: null,
    fact: description,
    fromPubChem: true,
    cid: props.cid,
  };
}
