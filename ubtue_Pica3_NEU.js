{
	"translatorID": "148b1202-432a-42f3-b1f6-beeb963ee18f",
	"label": "ubtue_Pica3_NEU",
	"creator": "Philipp Zumstein, Timotheus Kim, Mario Trojan, Madeeswaran Kannan, Johannes Ruscheinski, Helena Nebel",
	"target": "txt",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 2,
	"lastUpdated": "2026-04-28 20:07:30"
}

/*
 ***** BEGIN LICENSE BLOCK *****
  Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.
  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.
  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.
  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see http://www.gnu.org/licenses/.
 ***** END LICENSE BLOCK *****
 */

/* ===========================================================================================
   A. OVERVIEW
   -------------------------------------------------------------------------------------------
   This translator exports Zotero items to PICA3 blocks for WinIBW (K10plus). During export it
   can enrich author 30xx fields by linking them to K10plus PPNs via a GND-based workflow.

   High-level flow per item:
   1) performExport()
	  - Iterates items, builds PICA fields, and for each author slot (3000/3010...):
		(a) Pre-seed 30xx with the personal name (and optional ORCID), using a temporary marker
			" ##NNN##" so it can be overwritten in-place later.
		(b) Build a GND candidate list via reconcile.gnd.network (Reconciliation Service API).
			IMPORTANT: We do NOT require reconciliation to yield a single unique match.
			We only use reconciliation to generate a ranked candidate set.
		(c) Candidate list selection depends on SSG:
			- If SSG is SSG0 or SSG1 or SSG 0$a1:
				* apply STRICT profession whitelist filtering via reconcile "extend="
				* forward all filtered GND candidates (capped) to SRU->unAPI
			- If NOT SSG0/SSG1 (e.g., NABZ, 2,1, empty, other):
				* do NOT use profession hints/filters
				* forward Top-N (e.g., Top-3) ranked GND candidates to SRU->unAPI
		(d) For each forwarded GND candidate, resolve GND → K10plus PPN via SRU
			(query pica.nid=<GND>). Collect PPN candidates across all GNDs.
			Apply the PPN blocklist (PPN-Lookup-False-Positive.map) before validation.
		(e) unAPI final validation (decides uniqueness):
			For each remaining PPN candidate, fetch the person record via unAPI (format=pp) and validate:
			  - 028A strict name match (surname + given name, normalized)
			  - 060R temporal plausibility guard:
				  reject if 060R has $b (end-of-timespan),
				  accept strong if 060R$a >= threshold (default 1930) OR 060R$d indicates 20/21 century,
				  accept weak if 060R missing (only if final unique).
			Only if EXACTLY ONE PPN passes unAPI validation do we overwrite the 30xx marker to:
			  !PPN!$BVerfasserIn$4aut
			Otherwise we keep the original personal name in 30xx.

   Concurrency model & final write:
   - Network requests are asynchronous (reconcile queries, reconcile extend, SRU, unAPI).
   - runningThreadCount (RTC) is incremented when an async branch starts and decremented when it
	 finishes. Only when RTC reaches 0 do we flush all buffered output via WriteItems().
   - itemsOutputCache buffers per-item output lines. We never reorder 30xx markers; we overwrite
	 the pre-seeded marker line in-place when a PPN is accepted.

   Safety/invariants:
   - threadParams is frozen per author slot so callbacks update the correct marker (printIndex).
   - SRU fan-out must be guarded against double-callback situations (rare late error/success);
	 we count each SRU request only once and ignore late callbacks.
=========================================================================================== */

/* =============================================================================================================== */
/* B. MAPPING TABLES & GLOBAL CONFIG                                                                               */
/* =============================================================================================================== */

var issn_to_language_code = {};
var issn_to_license = {};
var issn_to_physical_form = {};
var issn_to_ssg_zotkat = {};
var issn_to_superior_ppn = {};
var issn_to_volume = {};
var language_to_language_code = {};
var notes_to_ixtheo_notations = {};
var journal_title_to_ppn = {};
var publication_title_to_physical_form = {};
var issn_to_institution = {};
var issn_to_collection_code = {};

// Profession maps (team-editable) — used as a STRICT whitelist for candidate filtering (SSG0/SSG1)
//   - profession_for_lookup_zotkat.map      → SSG=1 profession allow-list
//   - profession_for_lookup_ssg0_zotkat.map → SSG=0 profession allow-list
//
// Map format: key = human label (e.g., "Theologe"), value = comma-separated GND profession IDs
// (either full URIs "https://d-nb.info/gnd/..." or short IDs like "4059756-8").
//
// IMPORTANT (current pipeline):
// - Reconciliation is used ONLY to generate a ranked candidate list (not to decide uniqueness).
// - If SSG is SSG0 or SSG1, we enforce profession constraints STRICTLY via reconcile "extend="
//   (professionOrOccupation must intersect the whitelist) and forward the filtered candidates to SRU->unAPI.
// - If NOT SSG0/SSG1 (e.g., NABZ, 2,1, empty, other), we skip profession filtering and forward Top-N
//   candidates to SRU->unAPI.
// - Final uniqueness is decided later by unAPI validation (028A name + 060R temporal guard).
var profession_to_gndids = new Map();      // SSG=1 allow-list map (label → ids)
var profession_to_gndids_ssg0 = new Map(); // SSG=0 allow-list map (label → ids)

// PPN blocklist (false positives):
// Initialized empty and replaced at startup from "PPN-Lookup-False-Positive.map" (Map keys = PPN).
// If SRU returns a PPN in this blocklist, we keep/revert to the personal name instead of linking.
var ppn_false_positive = new Map();

// Repository base URL (kept empty; URLs below are absolute). The value can be used as an optional prefix.
var zts_enhancement_repo_url = '';
var downloaded_map_files = 0;
// Map file count guard: adjust when adding/removing a URL in doExport().
// map = 15 total.
var max_map_files = 15;

// Mapping JournalTitle>Language (fallback examples)
var journal_title_to_language_code = {
  "Oriens Christianus": "ger",
  "Ephemerides Theologicae Lovanienses": "fre",
  "Science et Esprit": "fre",
}

/* Defaults & flags used when no map data applies */
var defaultSsgNummer = undefined;
var defaultLanguage = "eng";
var cataloguingStatus = "n"; // 0500 Position 3
var cataloguingStatusO = "n";// 0500 Position 3

/* =============================================================================================================== */
/* C. MAP LOADER: populateISSNMaps                                                                                 */
/* =============================================================================================================== */

function populateISSNMaps(mapData, url) {
  var mapFilename = url.substr(url.lastIndexOf("/") + 1);
  var temp = new Map();
  var lines = mapData.split('\n');

  for (i in lines) {
	var line = lines[i].split("#")[0].trim();
	if (line.length < 2) continue;

	var elements = line.split("=");
	if (elements.length != 2) {
	  Z.debug("Line " + i + " in map file " + mapFilename + " has too many/few splits (" + elements.length + ")");
	  Z.debug("Invalid line: " + line);
	  continue;
	}

	switch (mapFilename) {
	  case "notes_to_ixtheo_notations.map":
	  case "ISSN_to_superior_ppn.map":
		temp.set(elements[0], "!" + elements[1] + "!");
		break;
	  default:
		temp.set(elements[0], elements[1]);
	}
  }

  if (temp.size == 0) {
	throw "Empty map file! This is unexpected";
  }
  Z.debug(temp)

  switch (mapFilename) {
	case "ISSN_to_language_code.map":
	  issn_to_language_code = temp;
	  break;
	case "ISSN_to_licence.map":
	  issn_to_license = temp;
	  break;
	case "ISSN_to_physical_form.map":
	  issn_to_physical_form = temp;
	  Z.debug("physical form");
	  break;
	case "ISSN_to_SSG_zotkat.map":
	  issn_to_ssg_zotkat = temp;
	  break;
	case "ISSN_to_superior_ppn.map":
	  issn_to_superior_ppn = temp;
	  break;
	case "ISSN_to_volume.map":
	  issn_to_volume = temp;
	  break;
	case "language_to_language_code.map":
	  language_to_language_code = temp;
	  break;
	case "notes_to_ixtheo_notations.map":
	  notes_to_ixtheo_notations = temp;
	  break;
	case "journal_title_to_ppn.map":
	  journal_title_to_ppn = temp;
	  break;
	case "publication_title_to_physical_form.map":
	  publication_title_to_physical_form = temp;
	  break;
	case "ISSN_to_Sammlungscode_zotkat.map":
	  issn_to_collection_code = temp;
	  break;
	case "ISSN_to_Institution_zotkat.map":
	  issn_to_institution = temp;
	  break;
	case "profession_for_lookup_zotkat.map":
	  profession_to_gndids = temp;
	  break;
	case "profession_for_lookup_ssg0_zotkat.map":
	  profession_to_gndids_ssg0 = temp;
	  break;
	case "PPN-Lookup-False-Positive.map":
	  ppn_false_positive = temp;
	  break;
	default:
	  throw "Unknown map file: " + mapFilename;
  }
  downloaded_map_files += 1;
}

/* =============================================================================================================== */
/* D. ASYNC + OUTPUT INFRASTRUCTURE                                                                                */
/* =============================================================================================================== */

var runningThreadCount = 1;  // Start at 1 to keep the pipeline open until performExport() schedules everything.
var currentItemId = -1;
var itemsOutputCache = []
var authorMapping = {};      // used to stash per-author data (e.g., ORCID) by key "<itemId>:<printIndex>"
var _ppnLookupState = Object.create(null);  // key = "<itemId>:<printIndex>" -> "inflight" | "done" | "failed"
var _sruOutstanding = Object.create(null);  // key guard for SRU inflight -> ensure we close the thread once
var _finalExportLogged = false;

function _bump(delta, why) {
  runningThreadCount += delta;
  Z.debug("[RTC] now=" + runningThreadCount + "  " + (delta > 0 ? "++" : "--") + "  " + why);
}

function finishIfIdle() {
  if (runningThreadCount === 0 && !_finalExportLogged) {
	WriteItems();
	Z.debug("Done exporting item(s)!");
	_finalExportLogged = true;
  }
}

/* =============================================================================================================== */
/* E. LOW-LEVEL UTILITIES                                                                                          */
/* =============================================================================================================== */

// Add 8910 once per identical payload (per item)
// Dedupes audit notes because multiple async branches may try to append the same 8910.
function addOnce8910(itemId, payload) {
  var line = "\n8910 " + payload;
  var buf = itemsOutputCache[itemId] || [];
  for (var i = 0; i < buf.length; i++) {
	if (buf[i] === line) return; // already present → do nothing
  }
  buf.push(line);
  itemsOutputCache[itemId] = buf; // defensive in case the array wasn't set
}

function EscapeNonASCIICharacters(unescaped_string) {
  let escaped_string = "";
  const length = unescaped_string.length;
  for (var i = 0; i < length; ++i) {
	const char_code = unescaped_string.charCodeAt(i);
	if (char_code < 128) {
	  escaped_string += unescaped_string[i];
	} else {
	  escaped_string += "\\u" + ("00" + char_code.toString(16)).substr(-4);
	}
  }
  return escaped_string;
}

// addLine() is a generic output sanitizer:
// - normalizes quotes,
// - strips known internal markers,
// - does minor cleanup of common URL/artifact patterns.
//
// IMPORTANT: Because this applies global replacements, do not rely on addLine() to filter semantic
// control tags (e.g., RezensionstagPica). Filter such tags before calling addLine() (see 5520 loop).

function addLine(itemid, code, value) {
  if (value == undefined) {
	value = "Für Feld " + code.replace(/\n/, '') + " wurde kein Eintrag hinterlegt";
	code = '\nxxxx';
  }
  var line = code + " " + value.trim()
	.replace(/"/g, '\\"').replace(/“/g, '\\"').replace(/”/g, '\\"').replace(/„/g, '\\"')
	.replace('RezensionstagPica', '').replace(/\t/g, '')
	.replace(/\|s\|peer\s?reviewed?/i, '|f|Peer reviewed')
	.replace(/\|s\|book\s+reviews?/i, '|f|Book Review')
	.replace('|f|Book Reviews, Book Review', '|f|Book Review')
	.replace('https://doi.org/https://doi.org/', 'https://doi.org/')
	.replace(/@\s/, '@')
	.replace('abs1:', '')
	.replace('doi:https://doi.org/', '')
	.replace('handle:https://hdl.handle.net/', '');
  itemsOutputCache[itemid].push(line);
}

/* =============================================================================================================== */
/* F. ORCID HELPERS                                                                                                */
/* =============================================================================================================== */

function createNoteAuthorsToOrcidsMap(item) {
  if (!item.notes) return new Map();
  const map = new Map();
  for (const entry of item.notes) {
	const note = (entry && entry.note) ? String(entry.note) : "";
	if (!note.toLowerCase().startsWith("orcid:")) continue;

	// Split "orcid:ID|Surname, Forename"
	const raw = note.replace(/^orcid:/i, "");
	const parts = raw.split("|");
	if (parts.length < 2) continue;

	const orcid = parts[0].trim();
	// Basic ORCID format check (final char may be digit or X/x)
	if (!/\b\d{4}-\d{4}-\d{4}-\d{3}(?:\d|x)\b/i.test(orcid)) continue;

	const authorString = parts[1].trim();   // "Surname, Forename"
	const creatorObj = ZU.cleanAuthor(authorString);
	// Use a canonical JSON of the creator (without creatorType) as key
	map.set(JSON.stringify(creatorObj), orcid);
  }
  return map;
}

function getAuthorOrcid(creator, noteAuthorsToOrcids) {
  if (!creator) return undefined;
  const keyObj = Object.assign({}, creator);
  delete keyObj.creatorType;
  return noteAuthorsToOrcids.get(JSON.stringify(keyObj));
}

/* =============================================================================================================== */
/* G. 30xx MUTATORS                                                                                                */
/* =============================================================================================================== */


function updateAuthorLineToPPN(itemId, code, printIndex, ppn) {
  const payload = "!" + ppn + "!" + "$BVerfasserIn$4aut";
  const markerBackslash = code + ' ##' + printIndex + '##';
  const markerNewline = markerBackslash.replace(/\\n/, "\n");

  const buf = itemsOutputCache[itemId] || [];
  for (let k = 0; k < buf.length; k++) {
	const line = buf[k];
	if (line.startsWith(markerBackslash + " ") || line.startsWith(markerNewline + " ")) {
	  buf[k] = (line.startsWith(markerBackslash) ? markerBackslash : markerNewline) + " " + payload;
	  return true;
	}
  }
  // strict: DO NOT push a new 30xx if we cannot find the marker
  Z.debug(`[WARN] 30xx marker not found for itemId=${itemId} printIndex=${printIndex} (skipping overwrite to PPN=${ppn})`);
  return false;
}

function updateAuthorLineToName(itemId, code, printIndex, authorName) {
  const _key = itemId + ":" + printIndex;
  const _orcid = authorMapping && authorMapping[_key];
  const payload = _orcid
	? (authorName + "$iorcid$j" + _orcid + "$BVerfasserIn$4aut")
	: (authorName + "$BVerfasserIn$4aut");

  const markerBackslash = code + ' ##' + printIndex + '##';
  const markerNewline = markerBackslash.replace(/\\n/, "\n");

  const buf = itemsOutputCache[itemId] || [];
  for (let k = 0; k < buf.length; k++) {
	const line = buf[k];
	if (line.startsWith(markerBackslash + " ") || line.startsWith(markerNewline + " ")) {
	  buf[k] = (line.startsWith(markerBackslash) ? markerBackslash : markerNewline) + " " + payload;
	  return true;
	}
  }
  Z.debug(`[WARN] 30xx marker not found (revert-to-Name) for itemId=${itemId} printIndex=${printIndex} (skipping)`);
  return false;
}

/* =============================================================================================================== */
/* H. gnd reconcile service HELPERS                                                                                */
/* =============================================================================================================== */

function _normalizePreferredName(name) { return String(name || '').trim(); }

function _toAscii(s) {
  try {
	return String(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, '');
  } catch (e) {
	return String(s);
  }
}

function buildNameQueries(authorName) {
  // Reconciliation expects the plain label to match, not a fielded ES query.
  const s = _normalizePreferredName(authorName); // e.g., "Schramke, Mona"
  return [{ label: "q", q: s }];
}

function _allGndIdsFromMap(mapObj) {
  const ids = [];
  try {
	if (mapObj && typeof mapObj.forEach === "function") {
	  mapObj.forEach(function (val /*, key */) {
		String(val)
		  .split(/\s*,\s*|\s*;\s*|\s*\|\s*/)
		  .forEach(u => { if (u) ids.push(u); });
	  });
	}
  } catch (e) { /* ignore */ }
  return Array.from(new Set(ids));
}

// The profession maps may contain either full URIs (https://d-nb.info/gnd/...) or short IDs
// (e.g., 4059756-8). normalizeGndId() standardizes both formats to the short ID used in
// reconcile.gnd.network "extend" responses.
function _allProfessionUrisFromMapValues(mapObj) {
  const uris = [];
  try {
	if (mapObj && typeof mapObj.forEach === "function") {
	  mapObj.forEach(function (val /*, key */) {
		String(val)
		  .split(/\s*,\s*|\s*;\s*|\s*\|\s*/)
		  .forEach(u => { if (u) uris.push(u); });
	  });
	}
  } catch (e) { /* ignore */ }
  return Array.from(new Set(uris));
}

function normalizeGndId(x) {
  // Accept either short IDs like "4059756-8" or full URIs like "https://d-nb.info/gnd/4059756-8"
  return String(x || "")
	.trim()
	.replace(/^https?:\/\/d-nb\.info\/gnd\//i, "");
}
/* ===========================================================================================
   GND RECONCILIATION (reconcile.gnd.network)
   -------------------------------------------------------------------------------------------
   We use https://reconcile.gnd.network to obtain a ranked set of candidate GND identifiers for
   an author name string. The service follows the OpenRefine / Reconciliation Service API model.

   IMPORTANT CHANGE vs older versions of this translator:
   - We do NOT require reconciliation to return a unique match.
   - Reconciliation only provides candidate generation (ranked list).
   - Final uniqueness is decided later by SRU (PPN expansion) + unAPI validation.

   (A) Candidate retrieval ("queries=" POST)
	   Request (form field "queries"):
		 {
		   "q1": {
			 "query": "Lastname, Firstname",
			 "type": "DifferentiatedPerson",
			 "properties": [
			   { "pid": "professionOrOccupation", "v": { "id": "4059756-8" } }
			 ]
		   }
		 }

	   Notes:
	   - query: main label to match (our authorName string)
	   - type: restrict candidates to a class (we use DifferentiatedPerson)
	   - properties: optional hints (may influence ranking; not guaranteed strict)

   (B) Data Extension ("extend=" POST) - STRICT profession whitelist enforcement (SSG0/SSG1 only)
	   We do NOT trust profession hints from (A) as strict filters. If profession filtering is enabled,
	   we explicitly fetch authoritative professions via "extend=" and filter candidates by a whitelist.

	   Request (form field "extend"):
		 {
		   "ids": ["<cand1>", "<cand2>", ...],
		   "properties": [ { "id": "professionOrOccupation" } ]
		 }

	   Result:
	   - For SSG0/SSG1: keep all candidates that intersect the whitelist (capped to maxWithProfession)
	   - For non-SSG0/SSG1: skip extension filtering and forward Top-N ranked candidates (maxNoProfession)

   Output of reconcile step in this translator:
   - Array of GND candidate IDs (not a single selected ID)
   - This list is forwarded to SRU->unAPI for final decision.
=========================================================================================== */

function reconcileExtend(ids, propertyIds, onSuccess, onError) {
  try {
	const endpoint = "https://reconcile.gnd.network";
	const extendObj = {
	  ids: (ids || []).map(String),
	  properties: (propertyIds || []).map(id => ({ id: id }))
	};
	const payload = "extend=" + encodeURIComponent(JSON.stringify(extendObj));

	ZU.doPost(
	  endpoint,
	  payload,
	  function (text) {
		try {
		  const data = JSON.parse(text);
		  return onSuccess(data);
		} catch (e) {
		  return onError(e);
		}
	  },
	  function (e) { onError(e || new Error("extend request failed")); },
	  { "Content-Type": "application/x-www-form-urlencoded" }
	);
  } catch (e) {
	onError(e);
  }
}

function candidateHasAnyProfessionViaExtend(candidateId, profSet, onYes, onNo) {
  // candidateId: string like "1028581203"
  // profSet: Set of normalized profession IDs like "4059756-8"
  const cid = String(candidateId || "").trim();
  if (!cid || !profSet || profSet.size === 0) return onNo();

  reconcileExtend(
	[cid],
	["professionOrOccupation"],
	function (ext) {
	  try {
		const rows = ext && ext.rows ? ext.rows : {};
		const row = rows[cid];
		if (!row) return onNo();

		const po = row.professionOrOccupation;
		const arr = Array.isArray(po) ? po : [];

		const candProfIds = arr
		  .map(o => normalizeGndId(o && o.id))
		  .filter(Boolean);

		const ok = candProfIds.some(pid => profSet.has(pid));
		return ok ? onYes() : onNo();
	  } catch (e) {
		Z.debug("candidateHasAnyProfessionViaExtend error: " + e);
		return onNo();
	  }
	},
	function (e) {
	  Z.debug("candidateHasAnyProfessionViaExtend extend error: " + e);
	  return onNo();
	}
  );
}

function reconcileCandidates(authorName, profileOpts, onDone, onError) {
  try {
	const endpoint = "https://reconcile.gnd.network";
	const typeId = (profileOpts && profileOpts.typeId) || "DifferentiatedPerson";
	const profUris = (profileOpts && Array.isArray(profileOpts.professionUris)) ? profileOpts.professionUris : [];
	const maxNoProf = (profileOpts && profileOpts.maxCandidatesNoProfession) || 3;
	const maxWithProf = (profileOpts && profileOpts.maxCandidatesWithProfession) || 10;

	// Normalize profession IDs to short ids (extend returns short ids)
	const profSet = new Set(profUris.map(normalizeGndId).filter(Boolean));

	// still send profession hints (harmless)
	const props = Array.from(profSet).slice(0, 20).map(id => ({ pid: "professionOrOccupation", v: { id: id } }));
	const q = { q1: { query: authorName, type: typeId, properties: props } };
	const payload = "queries=" + encodeURIComponent(JSON.stringify(q));

	Z.debug("reconcileCandidates call: " + endpoint + " payload=" + JSON.stringify(q));

	ZU.doPost(
	  endpoint,
	  payload,
	  function (text) {
		let res = [];
		try {
		  const data = JSON.parse(text);
		  res = (data && data.q1 && Array.isArray(data.q1.result)) ? data.q1.result : [];
		} catch (e) {
		  return onError(e);
		}
		if (!res.length) return onDone([]);

		// Prefer persons (DifferentiatedPerson) but keep order as returned (ranked)
		const personRes = res.filter(c => {
		  const t = (c && Array.isArray(c.type)) ? c.type : [];
		  return t.some(x => (x && x.id) === "DifferentiatedPerson");
		});

		// If no profession filter is requested: return top N candidates (persons preferred)
		if (profSet.size === 0) {
		  const baseList = personRes.length ? personRes : res;
		  const ids = baseList.map(c => String(c && c.id || "")).filter(Boolean).slice(0, maxNoProf);
		  return onDone(ids);
		}

		// Profession filter requested: extend all candidate ids, keep those that intersect whitelist
		const candIds = (personRes.length ? personRes : res)
		  .map(c => String(c && c.id || ""))
		  .filter(Boolean);

		return reconcileExtend(
		  candIds,
		  ["professionOrOccupation"],
		  function (ext) {
			try {
			  const rows = ext && ext.rows ? ext.rows : {};
			  const keep = [];

			  for (const cid of candIds) {
				const row = rows[cid];
				if (!row) continue;

				const po = row.professionOrOccupation;
				const arr = Array.isArray(po) ? po : [];
				const candProfIds = arr.map(o => normalizeGndId(o && o.id)).filter(Boolean);

				if (candProfIds.some(pid => profSet.has(pid))) {
				  keep.push(cid);
				}
			  }

			  Z.debug("reconcileCandidates profession filter: kept=" + keep.length + " of " + candIds.length);
			  return onDone(keep.slice(0, maxWithProf));
			} catch (e) {
			  return onError(e);
			}
		  },
		  function (e) { return onError(e || new Error("extend failed")); }
		);
	  },
	  function (e) { onError(e || new Error("Reconciliation request failed")); },
	  { "Content-Type": "application/x-www-form-urlencoded" }
	);
  } catch (e) {
	onError(e);
  }
}

function processGndCandidatesToUniquePpn(gndCandidates, threadParams, finalizeReconcile) {
  const itemId = threadParams.currentItemId;
  const printIndex = threadParams.printIndex;
  const code = threadParams.code;
  const authorName = threadParams.authorName;

  const gnds = (gndCandidates || []).map(String).filter(Boolean);
  if (!gnds.length) {
	updateAuthorLineToName(itemId, code, printIndex, authorName);
	return finalizeReconcile("reconcile:done (no-gnd-candidates) auth=" + authorName);
  }

  // 1) SRU phase: collect PPNs from ALL GND candidates
  const ppnSet = new Set();
  let pending = gnds.length;

  function finishSruPhase() {
	// apply blocklist + dedup
	const ppns = Array.from(ppnSet).filter(ppn => !(ppn_false_positive && ppn_false_positive.has(ppn)));

	if (!ppns.length) {
	  updateAuthorLineToName(itemId, code, printIndex, authorName);
	  return finalizeReconcile("reconcile:done (no-ppn-after-sru) auth=" + authorName);
	}

	// 2) unAPI phase: validate all PPNs; accept only if exactly 1 ok
	const ok = [];
	let i = 0;

	function nextPpn() {
	  if (i >= ppns.length) {
		if (ok.length === 1) {
		  const chosen = ok[0];
		  updateAuthorLineToPPN(itemId, code, printIndex, chosen.ppn);

		  addOnce8910(
			itemId,
			"$aixzom$bVerfasserIn in der Zoterovorlage [" + authorName + "] einer PPN " + chosen.ppn + " maschinell zugeordnet"
		  );

		  if (chosen.review) {
			addOnce8910(
			  itemId,
			  "$aixzom$bPPN " + chosen.ppn + " automatisch zugeordnet, aber 060R fehlt – bitte prüfen"
			);
		  }

		  return finalizeReconcile("reconcile:done (unique-after-unapi) auth=" + authorName);
		}

		updateAuthorLineToName(itemId, code, printIndex, authorName);
		return finalizeReconcile("reconcile:done (not-unique-after-unapi ok=" + ok.length + ") auth=" + authorName);
	  }

	  const ppn = ppns[i++];
	  verifyPpnByUnapi028Aand060R(ppn, authorName, 1930, function (ver) {
		if (ver && ver.ok) {
		  ok.push({
			ppn: ppn,
			strength: ver.strength || "strong",
			review: !!ver.review,
			reviewReason: ver.reviewReason
		  });
		}
		nextPpn();
	  });
	}

	nextPpn();
  }

  // Launch SRU lookups for each GND (ONE-SHOT per request)
	gnds.forEach(function (gnd) {
	let finishedThisGnd = false;

	function finishOnce() {
		if (finishedThisGnd) return;
		finishedThisGnd = true;
		pending -= 1;
		if (pending === 0) finishSruPhase();
	}

	lookupTitlePPNFromOpacByGND(
		gnd,
		function (ppnList) {
		if (finishedThisGnd) return; // ignore late success
		const list = Array.isArray(ppnList) ? ppnList : [];
		list.forEach(function (p) { if (p) ppnSet.add(String(p)); });
		finishOnce();
		},
		function (_err) {
		if (finishedThisGnd) return; // ignore late error
		finishOnce();
		}
	);
	});
}

/* =============================================================================================================== */
/* SSG CLASSIFICATION / SSG-KLASSIFIKATION                                                                          */
/* =============================================================================================================== */
/*
  EN: Normalize and classify SSG values from maps. Variants may include "0$a1", "2,1", "NABZ", etc.
      We treat:
        - SSG0: "0" and "0..." (e.g. "0$a1")
        - SSG1: only exact "1"
        - NONE: everything else (including "NABZ" and "2,1")
*/

function classifySsgField(SsgField) {
  const s = String(SsgField || "").trim().toUpperCase();

  // leer/undefiniert
  if (!s) return "NONE";

  // Sonderfälle wie NABZ immer "NONE"
  if (s.includes("NABZ")) return "NONE";

  // SSG0: "0" oder "0$a1" oder allgemein "0..." (z.B. "0$a1")
  // (wenn du noch andere 0-Varianten erwartest, ist startsWith("0") korrekt)
  if (s === "0" || s.startsWith("0$") || s.startsWith("0")) return "SSG0";

  // SSG1: nur wenn es wirklich exakt "1" ist
  // (wichtig: "2,1" soll NICHT als SSG1 zählen)
  if (s === "1") return "SSG1";

  // alles andere (z.B. "2,1", "2", "krimdok", etc.)
  return "NONE";
}
/* =============================================================================================================== */
/* I. SRU HELPER                                                                                                   */
/* =============================================================================================================== */

function lookupTitlePPNFromOpacByGND(gndEitherForm, onSuccess, onError) {
  try {
	if (!gndEitherForm) return onSuccess([]);

	let nid = String(gndEitherForm).trim()
	  .replace(/^https?:\/\/(www\.)?d-nb\.info\/gnd\//i, '')
	  .replace(/-/g, '');
	if (!/^[0-9]+X?$/i.test(nid)) return onSuccess([]);

	const base = "https://sru.k10plus.de/opac-de-627";
	const cql  = "pica.nid=" + nid; // titles linked to this GND
	const url  = base
	  + "?version=1.2&operation=searchRetrieve"
	  + "&maximumRecords=10&recordSchema=picaxml"
	  + "&query=" + encodeURIComponent(cql);
		Z.debug("[SRU] url=" + url + "  (gnd=" + gndEitherForm + ", nid=" + nid + ", cql=" + cql + ")");
	
	ZU.doGet(
	  url,
	  function (xml) {
		try {
		  // Normalize: works whether response was HTML-escaped or plain XML
		  xml = xml.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

		  // Split into records
		  const recs = xml.match(/<record[^>]*>[\s\S]*?<\/record>/gi) || [];
		  const candidates = [];

		  for (const rec of recs) {
			const blocks = rec.match(/<datafield[^>]*tag="028[AC]"[^>]*>[\s\S]*?<\/datafield>/gi) || [];
			for (const b of blocks) {
			  const hasThisNID = new RegExp(
				`<subfield[^>]*code="7"[^>]*>\\s*[^<>]*gnd/${nid}\\s*<\\/subfield>`,
				'i'
			  ).test(b);
			  if (!hasThisNID) continue;

			  const m9 = b.match(/<subfield[^>]*code="9"[^>]*>([^<]+)<\/subfield>/i);
				
			  if (m9) {
				const ppn = String(m9[1] || "").trim();
				if (ppn) candidates.push(ppn);
			  }
			}
		  }

		  // De-duplicate, preserve order
		  const seen = new Set();
		  const uniq = candidates.filter(p => (seen.has(p) ? false : (seen.add(p), true)));

		  Z.debug("KXP SRU 028[AC]$9 candidates => " + JSON.stringify(uniq) + " (nid=" + nid + ")");
		  onSuccess(uniq);
		} catch (e) {
		  onError(e);
		}
	  },
	  function (err) {
		onError(err || new Error("SRU request failed"));
	  }
	);
  } catch (e) {
	onError(e);
  }
}

/* =============================================================================================================== */
/* J. unAPI PERSON VALIDATION (K10plus pp format) / unAPI-PERSONENVALIDIERUNG                                         */
/* =============================================================================================================== */
/*
  EN:
  - unAPI provides person records in "pp" (plain-text, line-based PICA).
  - We validate candidate PPNs by:
      1) Strict name check using 028A ($a surname, $d given name)
      2) Temporal plausibility guard using 060R (time span / century)
  - Final uniqueness in the pipeline is decided after unAPI: only if exactly ONE candidate passes.

  DE:
  - unAPI liefert Personensätze im Format "pp" (Text, zeilenbasiert, PICA).
  - Validierung von PPN-Kandidaten über:
      1) striktes Namensmatching (028A)
      2) Zeit-/Plausibilitätsprüfung (060R)
*/

/**
 * Build unAPI URL for a given PPN (person record, format=pp).
 *
 * NOTE:
 * - This is an HTTP URL; use "&format=pp" (NOT the HTML escaped "&amp;format=pp").
 * - We URL-encode the full "id=" parameter.
 */
function buildUnapiUrlForPpn(ppn) {
  const id = "opac-de-627!xpn=online:ppn:" + String(ppn || "").trim();
  return "https://unapi.k10plus.de/?id=" + encodeURIComponent(id) + "&format=pp";
}

/**
 * Token normalizer used for strict name matching:
 * - lowercase, remove diacritics, normalize whitespace
 * - keep letters, digits, spaces and hyphens
 */
function _normToken(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, " ");
}

/**
 * Parse 028A name variants from unAPI "pp" output.
 * 028A subfields:
 * - $a / ƒa : surname
 * - $d / ƒd : given name
 *
 * Returns array of normalized variants: [{surname:"...", given:"..."}]
 */
function parse028AFromPp(ppText) {
  const text = String(ppText || "");
  const lines = text.split(/\r?\n/);
  const variants = [];

  function extractSubfields(line, code) {
    const re = new RegExp(`[\\$ƒ]${code}([^\\$ƒ]*)`, "g");
    const out = [];
    let m;
    while ((m = re.exec(line)) !== null) out.push((m[1] || "").trim());
    return out;
  }

  for (const raw of lines) {
    const line = String(raw || "");
    if (!line.startsWith("028A")) continue;

    const surs = extractSubfields(line, "a");
    const giv  = extractSubfields(line, "d");

    for (const s of surs) {
      if (giv.length) {
        for (const g of giv) variants.push({ surname: _normToken(s), given: _normToken(g) });
      } else {
        variants.push({ surname: _normToken(s), given: "" });
      }
    }
  }
  return variants;
}

/**
 * Parse 060R temporal information from unAPI "pp" output.
 *
 * Subfields (heuristics used by this translator):
 * - 060R $a / ƒa : begin of timespan (often a year like 1978, 1959, ...)
 * - 060R $b / ƒb : end of timespan   (if present -> reject; typically historical/deceased)
 * - 060R $d / ƒd : century notation  (accept if indicates 20th/21st century)
 *
 * Returns:
 * {
 *   has060R: boolean,
 *   hasB: boolean,
 *   yearsA: number[],
 *   hasCentury20or21: boolean
 * }
 */
function parse060RFromPp(ppText) {
  const text = String(ppText || "");
  const lines = text.split(/\r?\n/);

  let has060R = false;
  let hasB = false;
  const yearsA = [];
  let hasCentury20or21 = false;

  function extractSubfields(line, code) {
    const re = new RegExp(`[\\$ƒ]${code}([^\\$ƒ]*)`, "g");
    const out = [];
    let m;
    while ((m = re.exec(line)) !== null) out.push((m[1] || "").trim());
    return out;
  }

  function chunkHas20or21Century(chunk) {
    const s = String(chunk || "");
    return /(^|[^\d])(20|21)(?!\d)/.test(s);
  }

  for (const raw of lines) {
    const line = String(raw || "");
    if (!line.startsWith("060R")) continue;

    has060R = true;

    if (extractSubfields(line, "b").length > 0) hasB = true;

    for (const chunk of extractSubfields(line, "a")) {
      const m = String(chunk).match(/(\d{4})/);
      if (m) yearsA.push(parseInt(m[1], 10));
    }

    for (const chunk of extractSubfields(line, "d")) {
      if (chunkHas20or21Century(chunk)) hasCentury20or21 = true;
    }
  }

  return { has060R, hasB, yearsA, hasCentury20or21 };
}

/**
 * Strict name match:
 * - Input is expected as "Surname, Given"
 * - We require exact normalized match of BOTH surname and full given name.
 */
function strictNameMatches(authorNameSurnameCommaGiven, variants028A) {
  const parts = String(authorNameSurnameCommaGiven || "").split(",");
  const inSurname = _normToken(parts[0] || "");
  const inGiven   = _normToken((parts[1] || "").trim());

  if (!inSurname || !inGiven) return false;

  for (const v of (variants028A || [])) {
    if (!v) continue;
    if (v.surname !== inSurname) continue;
    if ((v.given || "") === inGiven) return true;
  }
  return false;
}

/**
 * Validate a candidate PPN via unAPI using:
 * - 028A strict name match
 * - 060R temporal plausibility guard
 *
 * Result object:
 * - ok:true,  strength:"strong" : name ok + temporal evidence ok
 * - ok:true,  strength:"weak"   : name ok + 060R missing (accept but mark for review)
 * - ok:false                   : reject (name mismatch, old/historic, request/parse error, etc.)
 */
function verifyPpnByUnapi028Aand060R(ppn, authorName, minYear, onResult) {
  const _ppn = String(ppn || "").trim();
  if (!_ppn) return onResult({ ok: false, reason: "no-ppn" });

  let done = false;
  function once(obj) { if (done) return; done = true; onResult(obj); }

  const threshold = (minYear == null) ? 1930 : Number(minYear);
  const url = buildUnapiUrlForPpn(_ppn);

  ZU.doGet(
    url,
    function (ppText) {
      try {
        const v028 = parse028AFromPp(ppText);
        const nameOk = strictNameMatches(authorName, v028);
        if (!nameOk) return once({ ok: false, reason: "name-mismatch" });

        const info = parse060RFromPp(ppText);

        if (!info.has060R) return once({ ok: true, strength: "weak", review: true, reviewReason: "060R_MISSING" });
        if (info.hasB) return once({ ok: false, reason: "060R-has-b" });

        let maxA = null;
        if (info.yearsA && info.yearsA.length) maxA = Math.max.apply(null, info.yearsA);
        if (maxA != null && maxA >= threshold) return once({ ok: true, strength: "strong", maxA: maxA });

        if (info.hasCentury20or21) return once({ ok: true, strength: "strong", byCentury: true });

        return once({ ok: false, reason: "060R-too-old-or-unknown" });
      } catch (e) {
        return once({ ok: false, reason: "parse-error:" + e });
      }
    },
    function (err) {
      return once({ ok: false, reason: "unapi-failed:" + (err || "unknown") });
    }
  );
}

/* =============================================================================================================== */
/* K. WRITE-OUT (FINAL FLUSH)                                                                                       */
/* =============================================================================================================== */

function WriteItems() {
  var batchUpload = false;
  if (itemsOutputCache.length > 1) batchUpload = true;

  itemsOutputCache.forEach(function (element, index) {
	let errorString = "";
	// 1) DO NOT SORT – keep the order we built during export
	// element.sort();   <-- remove this line

	var cleanElement = [];
	for (let line of element) {
	  // strip the temporary " ##NNN##" markers from 30xx lines
	  let toDelete = line.match(/30\d{2}( ##\d{3}##)/);
	  if (toDelete != null) {
		line = line.replace(toDelete[1], '');
	  }

	  // un-prefix accidental "\nZ" to "\n" (defensive cleanup)
	  line = line.replace(/^\nZ/, '\n');

	  // collect error messages (xxxx placeholder lines)
	  if (line.match(/\nxxxx /) != null) {
		errorString += line.substring(7) + '\n';
	  }

	  cleanElement.push(line);
	}

	if (batchUpload) {
	  // Join all lines into one payload
	  let writeString = cleanElement.join("");

	  // 2) Make \uXXXX visible and turn REAL newlines into LITERAL "\n" for a single-line JS string
	  writeString = EscapeNonASCIICharacters(writeString)
		.replace(/\r?\n/g, '\\n');

	  // 3) Emit one WinIBW block per item, with EXACTLY two blank lines after it
	  if (errorString !== "") {
		Zotero.write(
		  'application.activeWindow.command("e", false);\n' +
		  'application.activeWindow.title.insertText("' + writeString + '");'
		);
		Zotero.write(
		  "application.messageBox('Fehler beim Export aus Zotero', '" +
		  errorString.replace(/'/g, "\\'") + "', 'error-icon')"
		);
		Zotero.write('\n\n'); // two blank lines
	  } else {
		Zotero.write(
		  'application.activeWindow.command("e", false);\n' +
		  'application.activeWindow.title.insertText("' + writeString + '");\n' +
		  'application.activeWindow.pressButton("Enter");\n\n'
		); // "\n\n" already gives you two blank lines
	  }

	  // 4) Do NOT write an extra "\n" between items (would create 3 blank lines)
	  // if (index > 0) { Zotero.write("\n"); }  <-- remove this
	} else {
	  // Single‑item export stays as before (raw PICA with real newlines)
	  var elementString = cleanElement.join("");
	  elementString = elementString.replace(/\n/g, '\n').replace(/\\"/g, '"');
	  Zotero.write(elementString);
	}
  });
}

/* =============================================================================================================== */
/* L. MAIN EXPORT PIPELINE                                                                                          */
/* =============================================================================================================== */

function performExport() {
  _finalExportLogged = false;
  Z.debug("Begin exporting item(s)!");

  var item;
  while ((item = Zotero.nextItem())) {
	currentItemId++;
	itemsOutputCache[currentItemId] = [];

	var physicalForm = "";//0500 Position 1
	var licenceField = ""; // 0500 Position 4 only for Open Access Items
	var SsgField = "";
	var superiorPPN = "";
	var journalTitlePPN = "";
	var issn_to_language = "";
	var institution_retrieve_sign = "";
	var collection_code = "";
	var retrieve_sign = "";

	if (!item.ISSN) item.ISSN = "";
	if (item.ISSN.match(/^\d+/)) item.ISSN = ZU.cleanISSN(item.ISSN);

	// Enrich items based on their ISSN (or publication title) through the loaded maps.
	// These maps drive language, physical form (A/O), SSG codes, superior PPN, etc.
	if (issn_to_language_code.get(item.ISSN) !== undefined) {
	  item.language = issn_to_language_code.get(item.ISSN);
	  Z.debug("Found lang:" + item.language);
	}
	if (language_to_language_code.get(item.ISSN) !== undefined) {
	  item.language = language_to_language_code.get(item.ISSN);
	  Z.debug("Found lang:" + item.language);
	}
	if (issn_to_ssg_zotkat.get(item.ISSN) !== undefined) {
	  SsgField = issn_to_ssg_zotkat.get(item.ISSN);
	}
	if (issn_to_ssg_zotkat.get(item.ISBN) !== undefined) {
	  SsgField = issn_to_ssg_zotkat.get(item.ISBN);
	}
	if (issn_to_ssg_zotkat.get(item.ISSN) !== undefined) {
	  SsgField = issn_to_ssg_zotkat.get(item.ISSN);
	}
	if (!item.volume && issn_to_volume.get(item.ISSN) !== undefined) {
	  item.volume = issn_to_volume.get(item.ISSN) + item.volume;
	  Z.debug("Found volume:" + item.volume);
	}
	if (issn_to_physical_form.get(item.ISSN) !== undefined) {
	  physicalForm = issn_to_physical_form.get(item.ISSN);
	  Z.debug("Found physicalForm:" + physicalForm);
	}
	if (issn_to_physical_form.get(item.ISBN) !== undefined) {
	  physicalForm = issn_to_physical_form.get(item.ISBN);
	  Z.debug("Found physicalForm:" + physicalForm);
	}
	if (issn_to_license.get(item.ISSN) !== undefined) {
	  licenceField = issn_to_license.get(item.ISSN);
	  Z.debug("Found license:" + licenceField);
	}
	if (issn_to_superior_ppn.get(item.ISSN) !== undefined) {
	  superiorPPN = issn_to_superior_ppn.get(item.ISSN);
	  Z.debug("Found superiorPPN:" + superiorPPN);
	}
	if (issn_to_superior_ppn.get(item.ISBN) !== undefined) {
	  superiorPPN = issn_to_superior_ppn.get(item.ISBN);
	  Z.debug("Found superiorPPN:" + superiorPPN);
	}
	if (journal_title_to_ppn.get(item.publicationTitle) !== undefined) {
	  journalTitlePPN = journal_title_to_ppn.get(item.publicationTitle);
	  Z.debug("Found journalTitlePPN:" + journalTitlePPN);
	}
	if (publication_title_to_physical_form.get(item.publicationTitle) !== undefined) {
	  physicalForm = publication_title_to_physical_form.get(item.publicationTitle);
	  Z.debug("Found journalTitlePPN:" + physicalForm);
	}
	if (issn_to_collection_code.get(item.ISSN) != undefined) {
	  collection_code = issn_to_collection_code.get(item.ISSN);
	  Z.debug("Found Collection code:" + collection_code);
	}
	if (issn_to_institution.get(item.ISSN) != undefined) {
	  institution_retrieve_sign = issn_to_institution.get(item.ISSN);
	  Z.debug("Found Institution:" + institution_retrieve_sign);
	}

	var article = false;
	switch (item.itemType) {
	  case "journalArticle":
	  case "bookSection":
	  case "magazineArticle":
	  case "newspaperArticle":
	  case "encyclopediaArticle":
		article = true;
		break;
	}

	// 0500 (physical form + cataloguing status)
	switch (true) {
	  case physicalForm === "A":
		addLine(currentItemId, '\n0500', physicalForm + "s" + cataloguingStatus);
		break;
	  case physicalForm === "O" && licenceField === "l":
		addLine(currentItemId, '\n0500', physicalForm + "s" + cataloguingStatus);
		break;
	  case physicalForm === "O" && licenceField === "kw":
		addLine(currentItemId, '\n0500', physicalForm + "s" + cataloguingStatus);
		break;
	  default:
		addLine(currentItemId, '\n0500', physicalForm + "s" + cataloguingStatus);
	}
	// 0501/0502/0503 material codes
	addLine(currentItemId, "\n0501", "Text$btxt");
	switch (physicalForm) {
	  case "A":
		addLine(currentItemId, "\n0502", "ohne Hilfsmittel zu benutzen$bn");
		break;
	  case "O":
		addLine(currentItemId, "\n0502", "Computermedien$bc");
		break;
	  default:
		addLine(currentItemId, "\n0502", "Computermedien$bc");
	}
	switch (physicalForm) {
	  case "A":
		addLine(currentItemId, "\n0503", "Band$bnc");
		break;
	  case "O":
		addLine(currentItemId, "\n0503", "Online-Ressource$bcr");
		break;
	  default:
		addLine(currentItemId, "\n0503", "Online-Ressource$bcr");
	}

	if (collection_code != "") {
	  addLine(currentItemId, "\n0575", collection_code);
	}
	// 1100 (year)
	var date = Zotero.Utilities.strToDate(item.date);
	if (date.year !== undefined) {
	  addLine(currentItemId, "\n1100", date.year.toString());
	}

	// 1131 (RezensionstagPica / Book reviews marker)
	for (i = 0; i < item.tags.length; i++) {
	  if (item.tags[i].tag.match(/RezensionstagPica|Book\s?reviews?/gi)) {
		addLine(currentItemId, "\n1131", "!106186019!");
	  }
	}

	// Move local URLs to 7133 if needed; adjust for tojs DOI handling.
	var localURL = "";
	if (item.url && item.url.match(/redi-bw.de/) && physicalForm === "O") {
	  localURL = "\n7133 " + item.url + "$xH$3Volltext$4ZZ$534";
	  item.url = null;
	}
	if (item.DOI && institution_retrieve_sign == "tojs") {
	  localURL = "\n7133 " + "https://doi.org/" + item.DOI;
	  item.url = null;
	}

	var localURL = "";		
	if (item.url && item.url.match(/research.ebsco.com/) && physicalForm === "O") {
		localURL = "\\n7133 " + item.url + "$xH$3Volltext$4ZZ$534";
		item.url = null;		
	}
	if (item.DOI && institution_retrieve_sign == "zojs") {
		localURL = "\\n7133 " + "https://doi.org/" + item.DOI;
		item.url = null;
	}

	//1140 Veröffentlichungsart und Inhalt
	if (['3052-685X'].includes(item.ISSN)) {
		addLine(currentItemId, "\n1140", "uwlx");
	}

	// 1500 (language code)
	if (item.itemType == "journalArticle") {
	  if (language_to_language_code.get(item.language)) {
		item.language = language_to_language_code.get(item.language);
	  }
	  addLine(currentItemId, "\n1500", item.language);
	} else if (item.itemType == "bookSection") {
	  item.language = issn_to_language_code.get(item.ISBN);
	  addLine(currentItemId, "\n1500", item.language);
	} else {
	  item.language = issn_to_language_code.get(item.language);
	  addLine(currentItemId, "\n1500", item.language);
	}

	// 1505 (RDA)
	addLine(currentItemId, "\n1505", "$erda");

	// Titel / Sortierzeichen
	var titleStatement = "";
	if (item.shortTitle == "journalArticle") {
	  titleStatement += item.shortTitle;
	  if (item.title && item.title.length > item.shortTitle.length) {
		titleStatement += ZU.unescapeHTML(item.title.substr(item.shortTitle.length));
	  }
	} else {
	  titleStatement += item.title;
	}
	if (item.language == "ger" || !item.language) {
	  titleStatement = titleStatement.replace(/^(Der|Die|Das|Des|Dem|Den|Ein|Eines|Einem|Eine|Einen|Einer) ([^@])/i, "$1 @$2");
	  titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])(Der|Die|Das|Des|Dem|Den|Ein|Eines|Einem|Eine|Einen|Einer) ([^@])/i, "„$2 @$3");
	}
	if (item.language == "eng" || !item.language) {
	  titleStatement = titleStatement.replace(/^(The|A|An) ([^@])/i, "$1 @$2");
	  titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])(The|A|An) ([^@])/i, "„$2 @$3");
	}
	if (item.language == "fre" || !item.language) {
	  titleStatement = titleStatement.replace(/^(Le|La|Les|Des|Un|Une) ([^@])/i, "$1 @$2");
	  titleStatement = titleStatement.replace(/^L'\s?([^@])/i, "L' @$1").replace(/^L’\s?([^@])/i, "L' @$1");
	  titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])(Le|La|Les|Des|Un|Une) ([^@])/i, "„$2 @$3");
	  titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])L'\s?([^@])/i, "„L' @$2").replace(/^([\u201e]|[\u201d]|[\u201c])L’\s?([^@])/i, "„L' @$2");
	}
	if (item.language == "ita" || !item.language) {
	  titleStatement = titleStatement.replace(/^(La|Le|Lo|Gli|I|Il|Un|Una|Uno) ([^@])/i, "$1 @$2");
	  titleStatement = titleStatement.replace(/^L'\s?([^@])/i, "L' @$1").replace(/^L’\s?([^@])/i, "L' @$1");
	  titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])(La|Le|Lo|Gli|I|Il|Un|Una|Uno) ([^@])/i, "„$2 @$3");
	  titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])L'\s?([^@])/i, "„L' @$2").replace(/^([\u201e]|[\u201d]|[\u201c])L’\s?([^@])/i, "„L' @$2");
	}
	if (item.language == "por" || !item.language) {
	  titleStatement = titleStatement.replace(/^(A|O|As|Os|Um|Uma|Umas|Uns) ([^@])/i, "$1 @$2");
	  titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])(A|O|As|Os|Um|Uma|Umas|Uns) ([^@])/i, "„$2 @$3");
	}
	if (item.language == "spa" || !item.language) {
	  titleStatement = titleStatement.replace(/^(El|La|Los|Las|Un|Una|Unos|Unas) ([^@])/i, "$1 @$2");
	  titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])(El|La|Los|Las|Un|Una|Unas) ([^@])/i, "„$2 @$3");
	}

	/* ===========================================================================================
   AUTHOR ENRICHMENT TIMELINE (CURRENT VERSION) / AUTOREN-ANREICHERUNG (AKTUELLE VERSION)
   -------------------------------------------------------------------------------------------
   EN:
   - Reconciliation is used ONLY to generate a ranked candidate list (GND IDs).
   - If SSG is SSG0 or SSG1, we apply a strict profession whitelist via reconcile "extend=".
	 Otherwise (e.g. NABZ, 2,1, empty, other) we do NOT apply profession filtering and forward
	 only the Top-N (e.g. Top-3) candidates.
   - Final uniqueness is decided AFTER SRU and unAPI:
	   GND candidates -> SRU (PPN expansion) -> unAPI (028A name + 060R time check)
	 Only if exactly ONE PPN passes unAPI validation do we link the author line to that PPN.

   DE:
   - Reconciliation dient NUR zur Erzeugung einer gerankten Kandidatenliste (GND-IDs).
   - Bei SSG0 oder SSG1 wird ein strikter Berufs-Whitelist-Filter via reconcile "extend=" angewendet.
	 In allen anderen Fällen (z.B. NABZ, 2,1, leer, sonstige Werte) werden KEINE Berufsfilter genutzt
	 und nur die Top-N (z.B. Top-3) Kandidaten weitergegeben.
   - Die finale Eindeutigkeit wird ERST NACH SRU und unAPI entschieden:
	   GND-Kandidaten -> SRU (PPN-Ermittlung) -> unAPI (028A Name + 060R Zeitprüfung)
	 Nur wenn GENAU EINE PPN die unAPI-Prüfung besteht, wird die 30xx-Zeile auf diese PPN verknüpft.

   RTC/Async (both):
   - runningThreadCount (RTC) tracks async work; WriteItems() runs when RTC returns to 0.
	=========================================================================================== */

	var authorSeq = 0;
	const _noteAuthorsToOrcids = createNoteAuthorsToOrcidsMap(item);

	var creator;
	while (item.creators.length > 0) {
	  creator = item.creators.shift();

	  if (creator.creatorType == "author") {
		var authorName = creator.lastName + (creator.firstName ? ", " + creator.firstName : "");

		const fieldTag = (authorSeq === 0) ? "3000" : "3010";
		const code = "\n" + fieldTag;
		const printIndex = String(authorSeq).padStart(3, '0');
		authorSeq++;

		if (authorName[0] != "!") {
		  
		const authorOrcid = getAuthorOrcid(creator, _noteAuthorsToOrcids);
		authorMapping[currentItemId + ":" + printIndex] = authorOrcid || null;

		// Always pre-seed with the *name*; overwrite to !PPN! only on SRU success
		addLine(
		currentItemId,
		code + ' ##' + printIndex + '##',
		(creator.lastName + (creator.firstName ? ", " + creator.firstName : "")) + "$BVerfasserIn$4aut"
		);

		// If input was already a PPN marker (rare), skip lobid/SRU for this slot
		if (authorName.startsWith("!")) { continue; }


		  const threadParams = Object.freeze({
			"currentItemId": currentItemId,
			"code": code,
			"fieldTag": fieldTag,
			"authorName": authorName,
			"printIndex": printIndex
		  });

		  let _lobidClosed = false;
		  function _endLobidOnce(reason) {
			if (_lobidClosed) { Z.debug("lobid already finished (" + reason + ")"); return; }
			_lobidClosed = true; _bump(-1, reason); finishIfIdle();
		  }

		  // profession filter selection → for reconciliation we pass URIs (map VALUES)
		let profUris = [];
		const ssgClass = classifySsgField(SsgField);

		// optionaler Override für spezielle Instanzen, falls gewünscht
		if (institution_retrieve_sign === "krzo") {
		profUris = [];
		} else if (ssgClass === "SSG0") {
		profUris = _allProfessionUrisFromMapValues(profession_to_gndids_ssg0);
		} else if (ssgClass === "SSG1") {
		profUris = _allProfessionUrisFromMapValues(profession_to_gndids);
		} else {
		// NONE: ohne Profession (Top-3 später)
		profUris = [];
		}

		Z.debug("SSG raw=" + (SsgField || "") + " classify=" + ssgClass + " -> professionUris=" + profUris.length);
		const _queries = buildNameQueries(authorName);
		let _reconcileResolved = false;

		let _reconcileClosed = false;
		function _endReconcileOnce(reason) {
		if (_reconcileClosed) { Z.debug("reconcile already finished (" + reason + ")"); return; }
		_reconcileClosed = true;
		_bump(-1, reason);
		finishIfIdle();
		}
		

		function _safeOnUnique(member) {
		if (_reconcileResolved) return; _reconcileResolved = true;

		Z.debug(
			"reconcile onUnique -> name=" + threadParams["authorName"] +
			", printIndex=" + threadParams["printIndex"] +
			", code=" + threadParams["code"] +
			", gnd=" + (member.gndIdentifier || member.id)
		);

		var gnd = null;
		try {
			if (member.gndIdentifier) gnd = member.gndIdentifier;
			if (!gnd && (member.id || member['@id'])) {
			var idUrl = member.id || member['@id'];
			var m = idUrl && idUrl.match(/\/gnd\/([0-9X-]+)$/);
			if (m) gnd = m[1].replace(/-/g, '');
			}
		} catch (e) { /* keep gnd null */ }

		if (gnd) {
			const _itemId = threadParams["currentItemId"];
			const _printIndex = threadParams["printIndex"];
			const _code = threadParams["code"];
			const _key = _itemId + ":" + _printIndex;

			if (_ppnLookupState[_key] === "inflight" || _ppnLookupState[_key] === "done") {
			Z.debug("KXP SRU skipped (duplicate) for key " + _key + " (state=" + _ppnLookupState[_key] + ")");
			} else {
			_ppnLookupState[_key] = "inflight";
			_sruOutstanding[_key] = true;

			Z.debug(
				"SRU prepare key=" + _key +
				" (itemId=" + _itemId +
				", printIndex=" + _printIndex +
				", name=" + threadParams["authorName"] + ")"
			);

			_bump(1, "sru:start key=" + _key + " gnd=" + gnd);
			lookupTitlePPNFromOpacByGND(
				gnd,
				function (ppnList) {
					// SRU success callback (PPN list)
					_ppnLookupState[_key] = "done";
					Z.debug("KXP PPN candidates for GND " + gnd + ": " + JSON.stringify(ppnList));

					let _finalized = false;
					function finalizeSru(reason) {
						if (_finalized) return;
						_finalized = true;
						if (_sruOutstanding[_key]) {
						_sruOutstanding[_key] = false;
						_bump(-1, reason || ("sru:done key=" + _key));
						finishIfIdle();
						} else {
						Z.debug("SRU done already closed for key " + _key);
						}
					}

					try {
						// 1) No PPN candidates
						if (!ppnList || !ppnList.length) {
						const reverted = updateAuthorLineToName(_itemId, _code, _printIndex, threadParams["authorName"]);
						Z.debug("No KXP PPN candidates for GND " + gnd + " -> kept name (" + reverted + ")");
						return finalizeSru("sru:done (no-ppn-candidates) key=" + _key);
						}

						// 2) Remove blocklisted PPNs first
						const filtered = ppnList.filter(p => !(ppn_false_positive && ppn_false_positive.has(p)));
						const seen2 = new Set();
						const filteredUniq = filtered.filter(p => (seen2.has(p) ? false : (seen2.add(p), true)));

						if (!filteredUniq.length) {
						Z.debug("All PPN candidates are blocklisted -> revert to personal name");
						const reverted = updateAuthorLineToName(_itemId, _code, _printIndex, threadParams["authorName"]);
						Z.debug("Reverted due to blocklist (" + reverted + ")");
						return finalizeSru("sru:done (all-blocklisted) key=" + _key);
						}

						// 3) unAPI-check all remaining candidates; accept only if exactly 1 ok
						const ok = []; // each: {ppn, strength, review}
						let idx = 0;

						function next() {
						if (idx >= filteredUniq.length) {
							if (ok.length === 1) {
							const chosen = ok[0];
							const ppn = chosen.ppn;

							Z.debug("Unique unAPI-validated PPN => " + ppn + " strength=" + chosen.strength);

							const replaced = updateAuthorLineToPPN(_itemId, _code, _printIndex, ppn);
							Z.debug("30xx replacement success? " + replaced);

							addOnce8910(
								_itemId,
								"$aixzom$bVerfasserIn in der Zoterovorlage [" +
								threadParams["authorName"] + "] einer PPN " + ppn + " maschinell zugeordnet"
							);

							// Option B: if 060R missing -> add "please review" note
							if (chosen.review) {
								addOnce8910(
								_itemId,
								"$aixzom$bPPN " + ppn + " automatisch zugeordnet, aber 060R fehlt – bitte prüfen"
								);
							}

							return finalizeSru("sru:done (unapi-unique-" + chosen.strength + ") key=" + _key);
							}
							Z.debug("unAPI ok candidates: " + ok.map(x => x.ppn + ":" + x.strength).join(", "));
							// not unique or none -> revert to name
							Z.debug("unAPI result not unique (ok=" + ok.length + ") -> revert to personal name");
							const reverted = updateAuthorLineToName(_itemId, _code, _printIndex, threadParams["authorName"]);
							Z.debug("Reverted due to non-unique unAPI result (" + reverted + ")");
							return finalizeSru("sru:done (unapi-not-unique) key=" + _key);
						}

						const ppn = filteredUniq[idx++];
						verifyPpnByUnapi028Aand060R(ppn, threadParams["authorName"], 1930, function (ver) {
							Z.debug("[unAPI] decision ppn=" + ppn + " => " + JSON.stringify(ver));
							if (ver && ver.ok) {
							ok.push({
								ppn: ppn,
								strength: ver.strength || "strong",
								review: !!ver.review,
								reviewReason: ver.reviewReason
							});
							}
							next();
						});
						}

						next();
						return; // finalize happens inside next()

					} catch (ex) {
						Z.debug("SRU success handler threw: " + ex);
						const reverted = updateAuthorLineToName(_itemId, _code, _printIndex, threadParams["authorName"]);
						Z.debug("Exception -> reverted (" + reverted + ")");
						return finalizeSru("sru:done (exception) key=" + _key);
					}
				},

				function (e) {
					// SRU error callback
					// CRITICAL FIX: if SRU already succeeded, ignore late error WITHOUT decrementing RTC
					if (_ppnLookupState[_key] === "done") {
					Z.debug("KXP SRU late error ignored (already resolved) for key " + _key);
					return; // <-- do NOT _bump(-1) here
					}

					try {
					_ppnLookupState[_key] = "failed";
					Z.debug("KXP SRU by GND failed for " + gnd + ": " + e);

					const reverted = updateAuthorLineToName(_itemId, _code, _printIndex, threadParams["authorName"]);
					Z.debug("SRU failed → reverted 30xx to personal name (" + reverted + ")");
					} finally {
					if (_sruOutstanding[_key]) {
						_sruOutstanding[_key] = false;
						_bump(-1, "sru:fail key=" + _key);
						finishIfIdle();
					}
					}
				}
				);
			}
		}

		}

		// Start reconciliation (sequential variants)
		_bump(1, "reconcile:start auth=" + authorName);

		reconcileCandidates(
		authorName,
		{
			typeId: "DifferentiatedPerson",
			professionUris: profUris,
			maxCandidatesNoProfession: 3,
			maxCandidatesWithProfession: 10
		},
		function (gndCandidates) {
			// pass candidates to SRU->unAPI, final decision there
			processGndCandidatesToUniquePpn(gndCandidates, threadParams, _endReconcileOnce);
		},
		function (e) {
			Z.debug("reconcileCandidates error: " + e);
			updateAuthorLineToName(threadParams["currentItemId"], threadParams["code"], threadParams["printIndex"], threadParams["authorName"]);
			_endReconcileOnce("reconcile:done (error) auth=" + threadParams["authorName"]);
		}
		);
		}
	  }
	}

	// 4000 (Title proper)
	addLine(currentItemId, "\n4000", ZU.unescapeHTML(titleStatement));

	// 4070 (volume/year/issue/pages)
	if (item.itemType == "journalArticle" || item.itemType == "magazineArticle") {
	  var volumeyearissuepage = "";
	  if (item.volume) { volumeyearissuepage += "$v" + item.volume.replace("Tome ", "").replace(/\s\(Number\s\d+-?\d+\)/, "").replace(/^\d.\w..\s\w\w.\s/, ""); }
	  if (date.year !== undefined) { volumeyearissuepage += "$j" + date.year; }
	  if (item.issue && item.ISSN !== "2699-5433") { volumeyearissuepage += "$a" + item.issue.replace("-", "/").replace(/^0/, ""); }
	  if (item.issue && item.ISSN === "2699-5433") { volumeyearissuepage += "$m" + item.issue.replace("-", "/").replace(/^0/, ""); }
	  for (let i in item.notes) {
		if (item.notes[i].note.includes('artikelID:')) { volumeyearissuepage += "$i" + item.notes[i].note.replace(/artikelID:/i, '') };
		if (item.notes[i].note.includes('SonderHeft:')) { volumeyearissuepage += "$n" + item.notes[i].note.replace(/SonderHeft:/i, '') };
	  }
	  if (item.pages) { volumeyearissuepage += "$p" + item.pages; }
	  for (let i in item.notes) {
		if (item.notes[i].note.includes('seitenGesamt:')) { volumeyearissuepage += "$t" + item.notes[i].note.replace(/seitenGesamt:/i, '') };
	  }
	  if (item.ISSN === "2077-1444" && item.callNumber) { volumeyearissuepage += "$i" + item.callNumber; }
	  addLine(currentItemId, "\n4070", volumeyearissuepage);
	}

	// LF flag via notes
	if (item.notes) {
	  for (let i in item.notes) {
		if (item.notes[i].note.includes('LF')) {
		  licenceField = "l";
		}
	  }
	}

	// 4950 / 205x – DOI/Handle/URI, with license flags
	if (item.url && item.url.match(/doi\.org\/10\./) && physicalForm === "O" && licenceField === "l") {
	  addLine(currentItemId, "\n4950", item.url + "$xR$3Volltext$4LF$534");
	} else if (item.url && !item.url.match(/doi\.org\/10\./) && physicalForm === "O" && licenceField === "l") {
	  addLine(currentItemId, "\n4950", item.url + "$xH$3Volltext$4LF$534");
	} else if (item.url && item.url.match(/doi\.org\/10\./) && physicalForm === "O" && licenceField === "kw") {
	  addLine(currentItemId, "\n4950", item.url + "$xR$3Volltext$4KW$534");
	} else if (item.url && !item.url.match(/doi\.org\/10\./) && physicalForm === "O" && licenceField === "kw") {
	  addLine(currentItemId, "\n4950", item.url + "$xH$3Volltext$4KW$534");
	} else if (item.url && item.url.match(/doi\.org\/10\./) && physicalForm === "O") {
	  addLine(currentItemId, "\n4950", item.url + "$xR$3Volltext$4ZZ$534");
	} else if (item.url && !item.url.match(/doi\.org\/10\./) && physicalForm === "O") {
	  addLine(currentItemId, "\n4950", item.url + "$xH$3Volltext$4ZZ$534");
	} else if (item.url && item.itemType == "magazineArticle") {
	  addLine(currentItemId, "\n4950", item.url + "$xH");
	}

	if (item.DOI && item.url && !item.url.match(/https?:\/\/doi\.org/) && licenceField === "l") {
	  addLine(currentItemId, "\n4950", "https://doi.org/" + item.DOI + "$xR$3Volltext$4LF$534");
	}
	if (item.DOI && item.url && !item.url.match(/https?:\/\/doi\.org/) && !licenceField) {
	  addLine(currentItemId, "\n4950", "https://doi.org/" + item.DOI + "$xR$3Volltext$4ZZ$534");
	}
	if (item.DOI && !item.url) {
	  if (licenceField === "l") {
		addLine(currentItemId, "\n4950", "https://doi.org/" + item.DOI + "$xR$3Volltext$4LF$534");
	  } else if (!licenceField) {
		addLine(currentItemId, "\n4950", "https://doi.org/" + item.DOI + "$xR$3Volltext$4ZZ$534");
	  }
	}
	if (item.DOI) {
	  if (physicalForm === "O" || item.DOI) {
		addLine(currentItemId, "\n2051", item.DOI.replace('https://doi.org/', ''));
	  } else if (physicalForm === "A") {
		addLine(currentItemId, "\n2053", item.DOI.replace('https://doi.org/', ''));
	  }
	}

	if (item.notes) {
	  for (let i in item.notes) {
		if (item.notes[i].note.includes('doi:')) {
		  addLine(currentItemId, "\n2051", ZU.unescapeHTML(item.notes[i].note.replace('doi:https://doi.org/', '')));
		  if (licenceField === "l") {
			addLine(currentItemId, "\n4950", ZU.unescapeHTML(item.notes[i].note.replace(/doi:/i, '') + "$xR$3Volltext$4LF$534"));
		  } else {
			addLine(currentItemId, "\n4950", ZU.unescapeHTML(item.notes[i].note.replace(/doi:/i, '') + "$xR$3Volltext$4ZZ$534"));
		  }
		}
	  }
	}

	if (item.notes) {
	  for (let i in item.notes) {
		if (item.notes[i].note.includes('handle:')) {
		  addLine(currentItemId, "\n2052", ZU.unescapeHTML(item.notes[i].note.replace(/handle:https?:\/\/hdl\.handle\.net\//i, '')));
		  if (licenceField === "l") {
			addLine(currentItemId, "\n4950", ZU.unescapeHTML(item.notes[i].note.replace(/handle:/i, '') + "$xR$3Volltext$4LF$534"));
		  } else {
			addLine(currentItemId, "\n4950", ZU.unescapeHTML(item.notes[i].note.replace(/handle:/i, '') + "$xR$3Volltext$4ZZ$534"));
		  }
		}
		if (item.notes[i].note.indexOf('urn:') == 0) {
		  addLine(currentItemId, "\n2050", ZU.unescapeHTML(item.notes[i].note));
		  if (licenceField === "l") {
			addLine(currentItemId, "\n4950", 'http://nbn-resolving.de/' + ZU.unescapeHTML(item.notes[i].note + "$xR$3Volltext$4LF$534"));
		  } else {
			addLine(currentItemId, "\n4950", 'http://nbn-resolving.de/' + ZU.unescapeHTML(item.notes[i].note + "$xR$3Volltext$4ZZ$534"));
		  }
		}
		if (item.notes[i].note.indexOf('URI:') == 0) {
		  if (licenceField === "l") {
			addLine(currentItemId, "\n4950", ZU.unescapeHTML(item.notes[i].note.replace(/URI:/, '') + "$xR$3Volltext$4LF$534"));
		  } else {
			addLine(currentItemId, "\n4950", ZU.unescapeHTML(item.notes[i].note.replace(/URI:/i, '') + "$xR$3Volltext$4ZZ$534"));
		  }
		}
	  }
	}

	// 4110 (series)
	if (!article) {
	  var seriesStatement = "";
	  if (item.series) {
		seriesStatement += item.series;
	  }
	  if (item.seriesNumber) {
		seriesStatement += " ; " + item.seriesNumber;
	  }
	  addLine(currentItemId, "\n4110", seriesStatement);
	}

	// 4207 (abstracts / summaries, lightly cleaned)
	if (item.abstractNote) {
	  item.abstractNote = ZU.unescapeHTML(item.abstractNote);
	  addLine(currentItemId, "\n4207", item.abstractNote.replace("", "").replace(/–/g, '-').replace(/&#160;/g, "").replace('No abstract available.', '').replace('not available', '').replace(/^Abstract\s?:?/, '').replace(/Abstract  :/, '').replace(/^Zusammenfassung/, '').replace(/^Summary/, ''));
	}
	if (item.notes) {
	  for (let i in item.notes) {
		if (item.notes[i].note.includes('abs')) addLine(currentItemId, "\n4207", item.notes[i].note.replace("", "").replace(/–/g, '-').replace(/&#160;/g, "").replace('No abstract available.', '').replace('not available', '').replace(/^Abstract\s?:?/, '').replace(/Abstract  :/, '').replace(/^Zusammenfassung/, '').replace(/^Summary/, '').replace('abs:', ''));
	  }
	}

	// 4241 (Enthalten in ...) - uses either ISSN-based superiorPPN or title-to-PPN map
	if (item.itemType == "journalArticle" || item.itemType == "magazineArticle" || item.itemType == "bookSection") {
	  if (superiorPPN.length != 0) {
		addLine(currentItemId, "\n4241", "Enthalten in" + superiorPPN);
	  } else if (journalTitlePPN.length != 0) {
		addLine(currentItemId, "\n4241", "Enthalten in" + journalTitlePPN);
	  } else {
		addLine(currentItemId, "\n4241", undefined);
	  }

	  // 5056 (SSG-Feld)
	  if (SsgField === "1" || SsgField === "0" || SsgField === "0$a1" || SsgField === "2,1") {
		addLine(currentItemId, "\n5056", SsgField);
	  } else if (SsgField == "NABZ" || institution_retrieve_sign == "tojs") {
		addLine(currentItemId, "\n5056", '');
	  } else {
		addLine(currentItemId, "\n5056", defaultSsgNummer);
	  }

	  // 8910 ORCID passthrough (kept if present in item notes)
	  // Decode HTML entities with ZU.unescapeHTML (no tag stripping)
	  if (item.notes) {
		for (let i in item.notes) {
		  var raw = (item.notes[i] && item.notes[i].note) ? item.notes[i].note : "";
		  var unescaped = ZU.unescapeHTML(raw); // turn &lt;...&gt; into real <...>

		  // Check for 'orcid' after unescaping (case-insensitive)
		  if (unescaped.toLowerCase().indexOf('orcid') !== -1) {
			if (institution_retrieve_sign == "krzo") {
			  addLine(currentItemId, "\n8910", "$akrzom$b" + unescaped);
			} else {
			  addLine(currentItemId, "\n8910", "$aixzom$b" + unescaped);
			}
		  }
		}
	  }
		//Abrufzeichen für Retrokat "ixrk" --> 8012
		var ixrkIxtheo = "";
		if (item.tags) {
			for (let i in item.tags) {
				if (item.tags[i].tag.includes('ixrk')) {
					ixrkIxtheo = "$aixrk";
				}
			}
		}
		//Abrufzeichen für Retrokat "ixrk" --> 8012
		var rwrkRelbib = "";
		if (item.tags) {
			for (let i in item.tags) {
				if (item.tags[i].tag.includes('rwrk')) {
					rwrkRelbib = "$arwrk";
				}
			}
		}
		if (institution_retrieve_sign == "") {
			if (SsgField == "NABZ") {
				addLine(currentItemId, '\nE* l01\n7100$Jn\n8012 ixzs$aixzo$aNABZ' + ixrkIxtheo + rwrkRelbib + localURL, ""); 
			}
			else addLine(currentItemId, '\nE* l01\n7100$Jn\n8012 ixzs$aixzo' + ixrkIxtheo + rwrkRelbib + localURL, "");
		}
		else if (institution_retrieve_sign == "inzo") {
			if (SsgField == "NABZ") {
				addLine(currentItemId, '\nE* l01\n7100$Jn\n8012 inzs$ainzo$aNABZ' + ixrkIxtheo + rwrkRelbib + localURL, ""); 
			}
			else addLine(currentItemId, '\nE* l01\n7100$Jn\n8012 inzs$ainzo' + ixrkIxtheo + rwrkRelbib + localURL, "");
		}
		else if (institution_retrieve_sign == "krzo") {
			if (SsgField == "NABZ") {
				addLine(currentItemId, '\nE* l01\n7100$Jn\n8012 krzo$aNABZ' + ixrkIxtheo + rwrkRelbib + localURL, ""); 
			}
			else addLine(currentItemId, '\nE* l01\n7100$Jn\n8012 krzo' + ixrkIxtheo + rwrkRelbib + localURL, "");
		}
		else if (institution_retrieve_sign == "itbk") {
				addLine(currentItemId, '\nE* l01\n7100$Jn\n8012 itbk$aixzs$aixzo' + ixrkIxtheo + rwrkRelbib + localURL, ""); 
		}
		else if (institution_retrieve_sign == "zojs") {
				addLine(currentItemId, '\nE* l01\n4801 Der Zugriff ist kostenfrei möglich\n7100 $B21\n8012 fauf$auwzs$azojs' + ixrkIxtheo + rwrkRelbib + localURL, "");
		}
		else if (institution_retrieve_sign == "tojs") {
				addLine(currentItemId, '\nE* l01\n7100$Jn\n8012 tojs$aixzs$aixzo' + ixrkIxtheo + rwrkRelbib + localURL, "");
		}

		// 5520 (IxTheo subjects from Zotero tags) — skip internal/control tags
		for (i = 0; i < item.tags.length; i++) {
		const rawTag = (item.tags[i] && item.tags[i].tag) ? String(item.tags[i].tag) : "";
		let tag = ZU.unescapeHTML(rawTag).replace(/\s?--\s?/g, '; ').trim();

		// Skip empty tags
		if (!tag) continue;

		// Skip internal workflow markers handled elsewhere
		if (/^(ixrk|rwrk)$/i.test(tag)) continue;

		// Skip tags that are used as control markers (1131 etc.)
		if (/^RezensionstagPica$/i.test(tag)) continue;
		if (/^Book\s*reviews?$/i.test(tag)) continue;

		addLine(currentItemId, "\n5520", tag);
		}

	  // 6700++ (IxTheo-Notation via notes_to_ixtheo_notations map)
	  if (item.notes) {
		for (i in item.notes) {
		  var note = ZU.unescapeHTML(item.notes[i].note)
		  var re = /\s*,\s*/;
		  var notation_splits = note.split(re);
		  for (i in notation_splits) {
			var notation = notation_splits[i].toLowerCase();
			var notation_ppn = notes_to_ixtheo_notations.get(notation);
			if (notation_ppn !== undefined) {
			  var field = 670 + i
			  for (i = 0; i < item.notes.length; i++) {
				addLine(currentItemId, '\n' + field, notation_ppn);
			  }
			}
		  }
		}
	  }
	}
  }

  // We scheduled all lobid/SRU tasks (if any). Now allow the pipeline to drain.
  _bump(-1, "main:done performExport");
  finishIfIdle();
}

/* =============================================================================================================== */
/* M. BOOTSTRAP                                                                                                    */
/* =============================================================================================================== */

function doExport() {
  Z.debug("Populating ISSN mapping tables...");

  ZU.doGet([
	zts_enhancement_repo_url + "https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/ISSN_to_language_code.map",
	zts_enhancement_repo_url + "https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/ISSN_to_licence.map",
	zts_enhancement_repo_url + "https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/ISSN_to_physical_form.map",
	zts_enhancement_repo_url + "https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/ISSN_to_SSG_zotkat.map",
	zts_enhancement_repo_url + "https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/ISSN_to_superior_ppn.map",
	zts_enhancement_repo_url + "https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/ISSN_to_volume.map",
	zts_enhancement_repo_url + "https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/language_to_language_code.map",
	zts_enhancement_repo_url + "https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/notes_to_ixtheo_notations.map",
	zts_enhancement_repo_url + "https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/journal_title_to_ppn.map",
	zts_enhancement_repo_url + "https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/publication_title_to_physical_form.map",
	zts_enhancement_repo_url + "https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/ISSN_to_Sammlungscode_zotkat.map",
	zts_enhancement_repo_url + "https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/ISSN_to_Institution_zotkat.map",
	// lobid lookup query filter maps
	zts_enhancement_repo_url + "https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/profession_for_lookup_zotkat.map",
	zts_enhancement_repo_url + "https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/profession_for_lookup_ssg0_zotkat.map",
	// false-positive PPN blocklist (keys=PPN, value=reason/flag)
	zts_enhancement_repo_url + "https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/PPN-Lookup-False-Positive.map"

  ], function (responseText, request, url) {
	switch (responseText) {
	  case "404: Not Found":
		Z.debug("Error: 404 for url " + url);
		break;
	  default:
		populateISSNMaps(responseText, url);
	}
  }, function () {
	if (downloaded_map_files != max_map_files)
	  throw "Some map files were not downloaded!";

	performExport();
  });
}

/* =============================================================================================================== */
/* O. DEBUG TOGGLE                                                                                                 */
/* =============================================================================================================== */

var ENABLE_DEBUG = false;
if (!ENABLE_DEBUG) {
  Z.debug = function () {};
}

// DEBUG toggles for reconciliation (set to "" to disable verbose logging)
var DEBUG_RECONCILE_VERBOSE = false;
var DEBUG_RECONCILE_ONLY_NAME = "";

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
