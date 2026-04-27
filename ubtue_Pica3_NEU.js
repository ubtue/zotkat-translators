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
	"lastUpdated": "2026-04-27 09:51:58"
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
   OVERVIEW
   -------------------------------------------------------------------------------------------
   This translator exports Zotero items to PICA3 blocks for WinIBW (K10plus). During export it
   can enrich author 30xx fields by linking them to K10plus PPNs via a GND-based workflow.

   High-level flow per item:
   1) performExport()
	  - Iterates items, builds PICA fields, and for each author slot (3000/3010...):
		(a) Pre-seed 30xx with the personal name (and optional ORCID), using a temporary marker
			" ##NNN##" so it can be overwritten in-place later.
		(b) Run GND reconciliation against reconcile.gnd.network (Reconciliation Service API,
			"queries=" POST) to obtain candidate GND IDs for the name. The service may return a
			single confident auto-match (match:true) or multiple candidates.
		(c) OPTION A (strict profession whitelist):
			We maintain a curated whitelist of allowed professions using map files:
			  - profession_for_lookup_zotkat.map      (SSG=1)
			  - profession_for_lookup_ssg0_zotkat.map (SSG=0)
			Because reconciliation is semi-automated and match:true does not guarantee that
			additional properties were enforced as strict boolean filters, we verify profession
			explicitly before accepting any candidate:
			  - Call reconcile.gnd.network Data Extension ("extend=" POST) for the candidate(s)
			  - Inspect professionOrOccupation
			  - Accept only if the candidate has at least one profession in the whitelist
			If the profession check fails, keep the pre-seeded personal name in 30xx.
		(d) If a candidate is accepted in (c), resolve GND → K10plus PPN via SRU
			(pica.nid=<GND>) and overwrite the pre-seeded 30xx with:
			  !PPN!$BVerfasserIn$4aut
			The "PPN-Lookup-False-Positive.map" can veto known bad PPNs and force a revert back
			to the personal name.

   Concurrency model & final write:
   - All network requests (reconcile queries, reconcile extend, SRU) are asynchronous.
   - runningThreadCount (RTC) is incremented when an async branch starts and decremented when it
	 finishes. Only when RTC reaches 0 do we flush all buffered output via WriteItems().
   - itemsOutputCache buffers per-item output lines. We never reorder 30xx markers; we overwrite
	 the pre-seeded marker line in-place when a PPN is accepted.

   Important invariants / safety guards:
   - The "threadParams" object is frozen per author slot so callbacks always update the correct
	 30xx marker (printIndex), even after the outer loops advance.
   - _ppnLookupState/_sruOutstanding per (itemId:printIndex) prevent duplicate SRU lookups and
	 ensure RTC accounting remains correct (no double-decrement on late callbacks).
=========================================================================================== */

/* =============================================================================================================== */
/* B. MAPPING TABLES & GLOBAL CONFIG                                                                                */
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

// Profession maps (team-editable) — used as a STRICT whitelist (Option A)
//   - profession_for_lookup_zotkat.map      → SSG=1 profession allow-list
//   - profession_for_lookup_ssg0_zotkat.map → SSG=0 profession allow-list
//
// Map format: key = human label (e.g., "Theologe"), value = comma-separated GND profession IDs
// (either full URIs "https://d-nb.info/gnd/..." or short IDs like "4059756-8").
// We normalize values to short IDs via normalizeGndId().
//
// Important: the reconciliation query step is heuristic (ranked candidates). We therefore do NOT
// assume these profession IDs are enforced as strict filters by the match endpoint. Instead we
// enforce them by verifying professionOrOccupation via reconcile.gnd.network "extend=" before
// accepting a candidate (Option A).
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
// map = 17 total.
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
/* C. MAP LOADER: populateISSNMaps                                                                                  */
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
	// Profession maps (vocation filters for lobid person matches)
	case "profession_for_lookup_zotkat.map":
	  profession_to_gndids = temp;
	  break;
	case "profession_for_lookup_ssg0_zotkat.map":
	  profession_to_gndids_ssg0 = temp;
	  break;
	// PPN blocklist: keys are PPNs.
	case "PPN-Lookup-False-Positive.map":
	  ppn_false_positive = temp;
	  break;
	default:
	  throw "Unknown map file: " + mapFilename;
  }
  downloaded_map_files += 1;
}

/* =============================================================================================================== */
/* D. ASYNC + OUTPUT INFRASTRUCTURE                                                                                 */
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
/* E. LOW-LEVEL UTILITIES                                                                                           */
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
/* F. ORCID HELPERS                                                                                                 */
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
/* G. 30xx MUTATORS                                                                                                 */
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
/* H. gnd reconcile service HELPERS                                                                                                 */
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
   We use https://reconcile.gnd.network to match author name strings to GND identifiers.
   The lobid-gnd API documentation (lobid is operated by hbz) recommends this endpoint for
   matching / reconciling use cases. [1](https://www.elastic.co/docs/manage-data/data-store/mapping)[2](https://discuss.elastic.co/t/partial-date-search-on-date-of-birth-fields/206023)

   The service follows the OpenRefine / Reconciliation Service API model:
   - Input: query string + optional type + optional property/value hints
   - Output: ranked candidates {id, name, score, match, type}
   Candidate retrieval and scoring are heuristic and service-defined; properties may be used as
   hints rather than strict boolean filters. 

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

	   Meaning:
		 - query:      main label to match (our authorName string)
		 - type:       restricts candidates to a class (e.g., persons only)
		 - properties: optional hints (service may or may not treat them as strict filters)

	   Response (q1.result is ranked):
		 {
		   "q1": {
			 "result": [
			   { "id": "123...", "name": "Lastname, Firstname", "score": 78.0, "match": false, "type": [...] },
			   ...
			 ]
		   }
		 }

		 - id:    candidate identifier in the service's id-space (GND id without URI prefix)
		 - score: similarity/confidence score used for ranking (scale is service-specific)
		 - match: service auto-match decision (true only when the service is confident)

   (B) Data Extension ("extend=" POST)
	   Used to fetch authoritative properties for candidate ids (e.g., professions).
	   Request (form field "extend"):
		 {
		   "ids": ["123...", "456..."],
		   "properties": [ { "id": "professionOrOccupation" } ]
		 }

	   Response returns rows[<id>] with values for requested properties.

   Option A (strict profession whitelist used by this translator):
	 - We do NOT assume that (A) enforces profession constraints strictly.
	 - Therefore we verify professionOrOccupation via (B) before accepting any candidate:
		 * If match:true gives one candidate → still check professions via extend.
		 * If match:true is absent → extend all candidates, filter by whitelist, accept only if one remains.
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

// Reconciliation acceptance threshold: ignore low-score candidates completely
var RECONCILE_SCORE_THRESHOLD = 70.0;

function _reconcileGndSingle(authorName, typeId, profIds, onSuccess, onNoUnique, onError) {
  const endpoint = "https://reconcile.gnd.network";

  // Normalize profession IDs once
  const profSet = new Set(
	(Array.isArray(profIds) ? profIds : [])
	  .map(normalizeGndId)
	  .filter(Boolean)
  );

  // We still SEND profession properties as hints (harmless),
  // but Option A does NOT trust them; it validates via extend.
  const props = Array.from(profSet)
	.slice(0, 20)
	.map(id => ({ pid: "professionOrOccupation", v: { id: id } }));

  const q = { q1: { query: authorName, type: (typeId || "DifferentiatedPerson"), properties: props } };
  const payload = "queries=" + encodeURIComponent(JSON.stringify(q));

  //Z.debug("reconcile call: " + endpoint + " payload=" + JSON.stringify(q));
  //Z.debug("reconcile call: " + "https://lobid.org/gnd/reconcile/?queries=" + JSON.stringify(q));
  ZU.doPost(
	endpoint,
	payload,
	function (text) {
	  try {
		const data = JSON.parse(text);
		
		const res = (data && data.q1 && Array.isArray(data.q1.result)) ? data.q1.result : [];
		if (!res.length) return onNoUnique();

		const threshold = (typeof RECONCILE_SCORE_THRESHOLD === "number") ? RECONCILE_SCORE_THRESHOLD : 80.0;

		// Normalize score (some services might omit it)
		function scoreOf(c) {
		const s = (c && typeof c.score === "number") ? c.score : 0;
		return s;
		}

		// 1) Apply score gate first
		const above = res.filter(c => scoreOf(c) >= threshold);

		// Debug visibility
		Z.debug("reconcile candidates=" + res.length
		+ " | aboveScore>=" + threshold + "=" + above.length
		+ " | match:true total=" + res.filter(c => c && c.match === true).length
		+ " | match:true above=" + above.filter(c => c && c.match === true).length);

		// If nothing meets threshold -> treat as no-unique immediately
		if (!above.length) return onNoUnique();

		// 2) Restrict match:true to those above threshold
		const matches = above.filter(c => c && c.match === true);

		// If exactly one match:true above threshold => candidate is that one (still verify profession if configured)
		if (matches.length === 1) {
		const cid = String(matches[0].id || "").trim();
		if (!cid) return onNoUnique();

		// If no profession constraints, accept directly
		const mustCheckProfession = (profSet.size > 0);
		if (!mustCheckProfession) {
			return onSuccess({ gndIdentifier: cid, id: "https://d-nb.info/gnd/" + cid });
		}

		// Profession check via extend
		return candidateHasAnyProfessionViaExtend(
			cid,
			profSet,
			function () { return onSuccess({ gndIdentifier: cid, id: "https://d-nb.info/gnd/" + cid }); },
			function () { return onNoUnique(); }
		);
		}

		// 3) No (or multiple) match:true above threshold:
		//    Use profession filtering on the *score-gated* candidates only.
		const mustCheckProfession = (profSet.size > 0);

		if (mustCheckProfession) {
		const candidateIds = above.map(c => String(c && c.id || "")).filter(Boolean);

		return reconcileExtend(
			candidateIds,
			["professionOrOccupation"],
			function (ext) {
			try {
				const rows = ext && ext.rows ? ext.rows : {};
				const keep = [];

				for (const cand of above) {
				const cid = String(cand && cand.id || "");
				const row = rows[cid];
				if (!row) continue;

				const po = row.professionOrOccupation;
				const arr = Array.isArray(po) ? po : [];

				const candProfIds = arr
					.map(o => normalizeGndId(o && o.id))
					.filter(Boolean);

				const ok = candProfIds.some(pid => profSet.has(pid));
				if (ok) keep.push(cand);
				}

				Z.debug("Option A score-gated extend profession filter: kept=" + keep.length
				+ " of " + above.length + " (threshold=" + threshold + ")");

				// Accept only if exactly one remains
				if (keep.length === 1) {
				const cid = String(keep[0].id || "").trim();
				if (cid) return onSuccess({ gndIdentifier: cid, id: "https://d-nb.info/gnd/" + cid });
				}
				return onNoUnique();
			} catch (e) {
				Z.debug("Option A score-gated extend filter error: " + e);
				return onNoUnique();
			}
			},
			function (e) {
			Z.debug("Option A score-gated extend request error: " + e);
			return onNoUnique();
			}
		);
		}

		// 4) If there is no profession gate configured:
		//    - If exactly one candidate is above threshold, accept it
		//    - Else treat as no-unique (avoid guessing)
		if (above.length === 1) {
		const cid = String(above[0].id || "").trim();
		if (cid) return onSuccess({ gndIdentifier: cid, id: "https://d-nb.info/gnd/" + cid });
		}
		return onNoUnique();
	  } catch (e) {
		return onError(e);
	  }
	},
	function (e) { onError(e || new Error("Reconciliation request failed")); },
	{ "Content-Type": "application/x-www-form-urlencoded" }
  );
}

function queryReconcileUntilUnique(queries, idx, profileOpts, onUnique, onNoUnique) {
  if (!queries || !Array.isArray(queries) || !queries.length) {
	return onNoUnique && onNoUnique();
  }
  if (!queries._state) queries._state = { done: false };
  const state = queries._state;
  if (state.done) return;
  if (idx >= queries.length) { state.done = true; return onNoUnique(); }

  const q      = queries[idx];
  const typeId = (profileOpts && profileOpts.typeId) || "Person";
  const profUris = (profileOpts && Array.isArray(profileOpts.professionUris)) ? profileOpts.professionUris : [];

  Z.debug('reconcile unique-try [' + (q.label || ('q' + idx)) + ']: query="' + q.q
	+ '", type=' + typeId + ', props(uris)=' + profUris.length);

  _reconcileGndSingle(
	q.q,
	typeId,
	profUris,
	function onBest(candidate) {
	  if (state.done) return;
	  state.done = true;
	  onUnique(candidate);
	},
	function onNone() {
	  if (state.done) return;
	  if (idx + 1 < queries.length) return queryReconcileUntilUnique(queries, idx + 1, profileOpts, onUnique, onNoUnique);
	  state.done = true; return onNoUnique();
	},
	function onErr(e) {
	  Z.debug("reconcile error: " + e);
	  if (state.done) return;
	  if (idx + 1 < queries.length) return queryReconcileUntilUnique(queries, idx + 1, profileOpts, onUnique, onNoUnique);
	  state.done = true; return onNoUnique();
	}
  );
}

/* =============================================================================================================== */
/* I. SRU HELPER                                                                                                     */
/* =============================================================================================================== */

function lookupTitlePPNFromOpacByGND(gndEitherForm, onSuccess, onError) {
  try {
	if (!gndEitherForm) return onSuccess(null);

	let nid = String(gndEitherForm).trim()
	  .replace(/^https?:\/\/(www\.)?d-nb\.info\/gnd\//i, '')
	  .replace(/-/g, '');
	if (!/^[0-9]+X?$/i.test(nid)) return onSuccess(null);

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
		  let ppn = null;

		  for (const rec of recs) {
			const blocks = rec.match(/<datafield[^>]*tag="028[AC]"[^>]*>[\s\S]*?<\/datafield>/gi) || [];
			for (const b of blocks) {
			  const hasThisNID = new RegExp(
				`<subfield[^>]*code="7"[^>]*>\\s*[^<>]*gnd/${nid}\\s*<\\/subfield>`,
				'i'
			  ).test(b);
			  if (hasThisNID) {
				const m9 = b.match(/<subfield[^>]*code="9"[^>]*>([^<]+)<\/subfield>/i);
				if (m9) { ppn = m9[1].trim(); break; }
			  }
			}
			if (ppn) break; // stop at first precise match
		  }

		  // No "first $9" fallback: return null if no exact $7 match exists
		  Z.debug("KXP SRU parsed 028[AC]$9 -> PPN=" + (ppn || "null") + " (gnd=" + gndEitherForm + ", nid=" + nid + ")");
		  onSuccess(ppn || null);
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
/* I2. unAPI PERSON CHECK (060R heuristic guard)                                                                     */
/* =============================================================================================================== */

/**
 * Build unAPI URL for a given PPN (person record).
 *
 * We fetch the K10plus "pp" (Personendaten) format via unAPI for a PPN found by SRU.
 * Example (human readable):
 *   https://unapi.k10plus.de/?id=opac-de-627!xpn=online:ppn:<PPN>&format=pp
 *
 * NOTE:
 * - In the JS source code we must use '&format=pp' (NOT '&amp;format=pp').
 * - We URL-encode the full id parameter for safety.
 */
function buildUnapiUrlForPpn(ppn) {
  const id = "opac-de-627!xpn=online:ppn:" + String(ppn || "").trim();
  return "https://unapi.k10plus.de/?id=" + encodeURIComponent(id) + "&format=pp";
}

/**
 * Parse field 060R from unAPI "pp" text.
 *
 * Background:
 * - unAPI "pp" output is a plain-text (line-based) representation of a PICA record.
 * - Subfields may be encoded either as:
 *     "$a ... $b ..."   (common in some exports)
 *   or
 *     "ƒa ... ƒb ..."   (WinIBW/PICA-style subfield marker, U+0192)
 * - Therefore we treat BOTH "$" and "ƒ" as subfield delimiters.
 *
 * Returns:
 * {
 *   has060R: boolean,          // at least one 060R line exists 
 *   hasB: boolean,             // any $b / ƒb present in 060R (end of timespan) -> reject e.g. https://unapi.k10plus.de/?id=opac-de-627!xpn%3Donline:ppn:630198322&format=pp
 *   yearsA: number[],          // extracted 4-digit years from $a / ƒa (begin of timespan)
 *   hasCentury20or21: boolean  // true if $d / ƒd contains century markers 20 or 21 (e.g. "20./21. Jh.") e.g. https://unapi.k10plus.de/?id=opac-de-627!xpn%3Donline:ppn:859724557&format=pp
 * }
 *
 * Heuristic meaning of subfields:
 * - 060R $a / ƒa : Beginn einer Zeitspanne (e.g. 1959)
 * - 060R $b / ƒb : Ende einer Zeitspanne   (if present -> do NOT match; typically implies death/end)
 * - 060R $d / ƒd : Century notation        (e.g. "20./21. Jh.") counts as positive evidence
 */
function parse060RFromPp(ppText) {
  const text = String(ppText || "");
  const lines = text.split(/\r?\n/);

  let has060R = false;
  let hasB = false;
  const yearsA = [];
  let hasCentury20or21 = false;

  /**
   * Extract all subfield payloads for a given code from one line.
   * Supports both "$a..." and "ƒa..."
   */
  function extractSubfields(line, code) {
	// Capture occurrences like "$a...." or "ƒa...." until next "$x"/"ƒx" or end of line
	const re = new RegExp(`[\\$ƒ]${code}([^\\$ƒ]*)`, "g");
	const out = [];
	let m;
	while ((m = re.exec(line)) !== null) {
	  out.push((m[1] || "").trim());
	}
	return out;
  }

  /**
   * Detect "20./21. Jh." style century indications in a $d/ƒd chunk.
   *
   * Typical examples:
   *   "20. Jh."
   *   "21. Jh."
   *   "20./21. Jh."
   *   "20/21 Jh"
   *   "20.-21. Jh."
   *
   * We accept if we see 20 or 21 as a standalone 2-digit number NOT part of a 4-digit year.
   * (Avoid matching "2021" by disallowing a following digit.)
   */
  function chunkHas20or21Century(chunk) {
	const s = String(chunk || "");
	return /(^|[^\d])(20|21)(?!\d)/.test(s);
  }

  for (const lineRaw of lines) {
	const line = String(lineRaw || "");

	// unAPI pp lines typically begin with the field code
	if (!line.startsWith("060R")) continue;

	has060R = true;

	// Rule: If ANY $b / ƒb exists in 060R -> reject later
	const bChunks = extractSubfields(line, "b");
	if (bChunks.length > 0) {
	  // Even if empty, presence of the subfield marker is considered a strong "end of timespan" signal.
	  hasB = true;
	}

	// Extract years from $a / ƒa (begin of timespan)
	const aChunks = extractSubfields(line, "a");
	for (const chunk of aChunks) {
	  const yr = String(chunk).match(/(\d{4})/);
	  if (yr) yearsA.push(parseInt(yr[1], 10));
	}

	// New rule: Century evidence from $d / ƒd counts as positive evidence if it includes 20 or 21
	const dChunks = extractSubfields(line, "d");
	for (const chunk of dChunks) {
	  if (chunkHas20or21Century(chunk)) {
		hasCentury20or21 = true;
	  }
	}
  }

  return { has060R, hasB, yearsA, hasCentury20or21 };
}

/**
 * Verify a candidate PPN via unAPI using the 060R heuristic.
 *
 * Decision rules (strict, conservative):
 * 1) 060R must exist. If missing -> reject.
 * 2) If 060R contains an end-of-timespan subfield ($b / ƒb) -> reject.
 * 3) Accept if either:
 *    a) 060R $a / ƒa contains a 4-digit year and max(year) > minYear (default 1930),
 *       OR
 *    b) 060R $d / ƒd contains century markers "20" or "21" (e.g. "20./21. Jh.").
 *
 * Rationale:
 * - Prevent linking to very old historical persons (e.g., 16th century).
 * - Prevent linking when an "end of timespan" is present (likely deceased).
 * - Allow modern-century-only records that express time by century (20./21. Jh.) instead of a year.
 *
 * IMPORTANT:
 * - This function is guarded so onPass/onReject are called ONLY ONCE.
 *   (ZU.doGet can otherwise lead to rare double-callback situations in some environments.)
 */
function verifyPpnBy060R(ppn, minYear, onPass, onReject) {
  const _ppn = String(ppn || "").trim();
  if (!_ppn) return onReject("no-ppn");

  // one-shot guard (prevents accept+reject double-callbacks)
  let done = false;
  function passOnce(meta) {
	if (done) return;
	done = true;
	onPass(meta);
  }
  function rejectOnce(reason) {
	if (done) return;
	done = true;
	onReject(reason);
  }

  const threshold = (minYear == null) ? 1930 : Number(minYear);
  const url = buildUnapiUrlForPpn(_ppn);

  Z.debug("[unAPI] check 060R ppn=" + _ppn + " url=" + url);

  ZU.doGet(
	url,
	function (ppText) {
	  try {
		const info = parse060RFromPp(ppText);

		if (!info.has060R) {
		  Z.debug("[unAPI] reject ppn=" + _ppn + " reason=no-060R");
		  return rejectOnce("no-060R");
		}

		// Rule 2: If any $b/ƒb exists -> reject
		if (info.hasB) {
		  Z.debug("[unAPI] reject ppn=" + _ppn + " reason=060R-has-$b");
		  return rejectOnce("has-$b");
		}

		// Rule 3a: Accept if $a year exists and is modern enough
		let maxA = null;
		if (info.yearsA && info.yearsA.length) {
		  maxA = Math.max.apply(null, info.yearsA);
		}

		if (maxA != null && maxA > threshold) {
		  Z.debug("[unAPI] accept ppn=" + _ppn + " 060R$a maxYear=" + maxA + " > " + threshold);
		  return passOnce({ maxA: maxA, yearsA: info.yearsA });
		}

		// Rule 3b: Accept if century evidence indicates 20./21. Jh.
		if (info.hasCentury20or21) {
		  Z.debug("[unAPI] accept ppn=" + _ppn + " reason=060R$d century 20/21 Jh.");
		  return passOnce({ maxA: maxA, yearsA: info.yearsA, byCentury: true });
		}

		// Otherwise reject (no acceptable temporal evidence)
		if (maxA == null) {
		  Z.debug("[unAPI] reject ppn=" + _ppn + " reason=060R-no-$a-year-and-no-century");
		  return rejectOnce("no-$a-year-and-no-century");
		}

		Z.debug("[unAPI] reject ppn=" + _ppn + " reason=060R$a-year-too-old maxYear=" + maxA);
		return rejectOnce("year-too-old:" + maxA);

	  } catch (e) {
		Z.debug("[unAPI] reject ppn=" + _ppn + " reason=parse-error err=" + e);
		return rejectOnce("parse-error");
	  }
	},
	function (err) {
	  Z.debug("[unAPI] reject ppn=" + _ppn + " reason=request-failed err=" + err);
	  return rejectOnce("request-failed");
	}
  );
}
/* =============================================================================================================== */
/* J. WRITE-OUT (FINAL FLUSH)                                                                                        */
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
/* K. MAIN EXPORT PIPELINE                                                                                           */
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

	// --- AUTHOR LOOP (pre-seed, reconcile, extend-verify, SRU) -------------------------------
	/* ===========================================================================================
	AUTHOR ENRICHMENT TIMELINE (CURRENT VERSION)
	-------------------------------------------------------------------------------------------
	Legend:
		++  = _bump(+1, ...)     --  = _bump(-1, ...)
		RTC = runningThreadCount (value AFTER the bump)
		WriteItems() runs exactly once when RTC reaches 0.

	A) Reconcile match:true + profession OK → SRU success (PPN accepted)
		Start: RTC=1
		++ reconcile:start                   → RTC=2
			reconcile: queries=...            (reconcile.gnd.network; type=Person/DifferentiatedPerson)
			result: exactly one match:true
			++ extend:start                   → RTC=3
				extend: verify professionOrOccupation against profession whitelist
				(Option A: required even when match:true)
				-- extend:done                 → RTC=2
			++ sru:start                      → RTC=3
				SRU success → overwrite 30xx marker to !PPN!
				-- sru:done                   → RTC=2
		-- reconcile:done                    → RTC=1
		-- main:done performExport           → RTC=0 → WriteItems()

	B) Reconcile match:true but profession mismatch → reject (keep personal name)
		Start: RTC=1
		++ reconcile:start                   → RTC=2
			result: exactly one match:true
			++ extend:start                   → RTC=3
				extend shows profession not in whitelist
				-- extend:done                 → RTC=2
			(no SRU)
		-- reconcile:done                    → RTC=1
		-- main:done performExport           → RTC=0 → WriteItems()

	C) No match:true → extend-filter candidates by profession → accept only if exactly one remains
		Start: RTC=1
		++ reconcile:start                   → RTC=2
			result: candidates, match:true count = 0
			++ extend:start                   → RTC=3
				extend: filter candidates by profession whitelist
				if exactly one remains → accept; else reject
				-- extend:done                 → RTC=2
			(if accepted) ++ sru:start        → RTC=3
				-- sru:done                   → RTC=2
		-- reconcile:done                    → RTC=1
		-- main:done performExport           → RTC=0 → WriteItems()

	Notes:
	- Reconciliation returns ranked candidates and (optionally) match:true. Because matching is heuristic
	and properties are not guaranteed to be strict boolean filters, we enforce professions explicitly
	via Data Extension (extend=) before accepting a candidate (Option A). 
	- For matching/reconciling use cases, lobid-gnd recommends using https://reconcile.gnd.network rather
	than treating the general search API as a matching engine. [1](https://www.elastic.co/docs/manage-data/data-store/mapping)[2](https://discuss.elastic.co/t/partial-date-search-on-date-of-birth-fields/206023)
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
			if (institution_retrieve_sign === "krzo") {
			profUris = [];
			} else if (String(SsgField || "").match(/^0(\b|$)/)) {
			profUris = _allProfessionUrisFromMapValues(profession_to_gndids_ssg0); // Option A helper
			} else if (String(SsgField || "") === "1") {
			profUris = _allProfessionUrisFromMapValues(profession_to_gndids);      // Option A helper
			} else {
			profUris = [];
			}
			Z.debug("Profession URIs applied: " + profUris.length + " (inst=" + institution_retrieve_sign + ", SSG=" + SsgField + ")");

		const _queries = buildNameQueries(authorName);
		let _reconcileResolved = false;

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
				function (ppn) {
					// SRU success callback (PPN may be null)
					_ppnLookupState[_key] = "done";
					Z.debug("KXP PPN found for GND " + gnd + ": " + ppn);

					// Finalize SRU thread exactly once (we keep SRU "open" until unAPI finishes)
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
					// 1) No PPN from SRU → keep/revert to name and close SRU thread
					if (!ppn) {
						const reverted = updateAuthorLineToName(_itemId, _code, _printIndex, threadParams["authorName"]);
						Z.debug("No KXP PPN found for GND " + gnd + " → 30xx kept/reverted to personal name (" + reverted + ")");
						return finalizeSru("sru:done (no-ppn) key=" + _key);
					}

					// 2) PPN blocklist → revert and close SRU thread (no unAPI call)
					if (ppn_false_positive && ppn_false_positive.has(ppn)) {
						Z.debug("PPN " + ppn + " is blocklisted → revert to personal name");
						const reverted = updateAuthorLineToName(_itemId, _code, _printIndex, threadParams["authorName"]);
						Z.debug("Reverted 30xx to personal name due to PPN blocklist (" + reverted + ")");
						return finalizeSru("sru:done (blocklisted) key=" + _key);
					}

					// 3) NEW: verify via unAPI (060R rules) BEFORE accepting PPN
					verifyPpnBy060R(
						ppn,
						1930,
						function onPass(meta) {
						try {
							Z.debug("PPN " + ppn + " passed 060R heuristic → overwrite 30xx");
							Z.debug("Overwriting " + _code + " ##" + _printIndex + "## with PPN " + ppn);

							const replaced = updateAuthorLineToPPN(_itemId, _code, _printIndex, ppn);
							Z.debug("30xx replacement success? " + replaced);

							addOnce8910(
							_itemId,
							"$aixzom$bVerfasserIn in der Zoterovorlage [" +
								threadParams["authorName"] + "] einer PPN " + ppn +
								" maschinell zugeordnet"
							);
						} catch (ex) {
							Z.debug("unAPI pass handler threw: " + ex);
							const reverted = updateAuthorLineToName(_itemId, _code, _printIndex, threadParams["authorName"]);
							Z.debug("Error after unAPI pass → reverted to personal name (" + reverted + ")");
						} finally {
							finalizeSru("sru:done (unapi-pass) key=" + _key);
						}
						},
						function onReject(reason) {
						try {
							Z.debug("PPN " + ppn + " rejected by 060R heuristic reason=" + reason + " → revert to personal name");
							const reverted = updateAuthorLineToName(_itemId, _code, _printIndex, threadParams["authorName"]);
							Z.debug("Reverted 30xx to personal name due to 060R heuristic (" + reverted + ")");
						} finally {
							finalizeSru("sru:done (unapi-reject:" + reason + ") key=" + _key);
						}
						}
					);

					// IMPORTANT: Do NOT finalize here. finalizeSru happens inside unAPI callbacks.
					return;

					} catch (ex) {
					Z.debug("SRU success handler threw: " + ex);
					const reverted = updateAuthorLineToName(_itemId, _code, _printIndex, threadParams["authorName"]);
					Z.debug("SRU handler exception → reverted (" + reverted + ")");
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

		_endReconcileOnce("reconcile:done auth=" + threadParams["authorName"]);
		}

		function _safeOnNoUnique() {
		if (_reconcileResolved) return; _reconcileResolved = true;

		try {
			const _itemId = threadParams["currentItemId"];
			const _printIndex = threadParams["printIndex"];
			const _code = threadParams["code"];
			const _name = threadParams["authorName"];
			const changed = updateAuthorLineToName(_itemId, _code, _printIndex, _name);
			Z.debug("reconcile no-unique → 30xx kept as personal name (ORCID included if available): " + changed);
		} catch (e) {
			Z.debug("reconcile no-unique handler threw: " + e);
		}

		_endReconcileOnce("reconcile:done (no-unique) auth=" + threadParams["authorName"]);
		}

		// Start reconciliation (sequential variants)
		_bump(1, "reconcile:start auth=" + authorName);

		let _reconcileClosed = false;
		function _endReconcileOnce(reason) {
		if (_reconcileClosed) { Z.debug("reconcile already finished (" + reason + ")"); return; }
		_reconcileClosed = true; _bump(-1, reason); finishIfIdle();
		}

		queryReconcileUntilUnique(
		_queries,
		0,
		{
			typeId: "DifferentiatedPerson",           // as requested
			professionUris: profUris          // literals from map KEYS, e.g., "Theologe", "Theologin"
		},
		_safeOnUnique,
		_safeOnNoUnique
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
/* L. BOOTSTRAP                                                                                                      */
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
/* M. DEBUG TOGGLE                                                                                                   */
/* =============================================================================================================== */

var ENABLE_DEBUG = true;
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
