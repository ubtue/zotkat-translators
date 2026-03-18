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
	"lastUpdated": "2026-03-18 14:50:25"
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
   This translator exports Zotero items to PICA3 blocks for WinIBW (K10plus). While exporting,
   it optionally enriches authors via lobid→GND unique matching and then resolves to a K10plus
   PPN via SRU. The logic is fully asynchronous and concurrency-safe:

   1) performExport()
      - Iterates items, builds PICA fields, and for each author:
        (a) pre-seeds the correct 30xx line with the personal name,
        (b) starts an async lobid "unique" lookup (using name + filters),
        (c) if lobid resolves to a single GND, runs an SRU call to K10plus (pica.nid=<GND>)
            to get a PPN and replaces the pre-seeded 30xx with "!PPN!$BVerfasserIn$4aut".
        (d) A false-positive PPN blocklist can force a revert back to the personal name.

   2) Thread tracking & final write:
      - runningThreadCount (RTC) is incremented for each async task and decremented when it
        finishes. Only when RTC reaches 0 do we write all accumulated item blocks to output.

   3) Output buffering:
      - itemsOutputCache holds all lines for each item; WriteItems() flushes once, emitting
        WinIBW "open editor" / "insertText(...)" / "press Enter" for each item in batch mode.

   Important invariants:
   - The "threadParams" object is snapped per author (const + freeze) so any callback uses
     the correct author slot (printIndex) even when the outer loop advances.
   - _ppnLookupState/_sruOutstanding per (itemId:printIndex) prevent duplicate SRU work.
   - The "PPN-Lookup-False-Positive.map" can veto a PPN (or also a GND if you add that check)
     to avoid known bad matches.

=========================================================================================== */

/* =============================================================================================================== */
/* B. MAPPING TABLES & GLOBAL CONFIG                                                                                */
/* =============================================================================================================== */

// Mapping tables that get populated with the entries from their corresponding map files in the Github repo
// https://github.com/ubtue/zotero-enhancement-maps
// NOTE: Most maps are loaded at startup via doExport() → ZU.doGet([...]) → populateISSNMaps()
//       - Keys/values are usually strings ("key=value" per line).

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

// Profession maps (team-editable)
//  - profession_for_lookup_zotkat.map           → used when SSG=1
//  - profession_for_lookup_ssg0_zotkat.map      → used when SSG=0
// Both maps provide professionOrOccupation.id URIs to narrow lobid person queries by vocation.
var profession_to_gndids = {};          // label -> "uri,uri,uri" (SSG=1 bucket)
var profession_to_gndids_ssg0 = {};     // label -> "uri,uri,uri" (SSG=0 bucket)

// PPN blocklist (false positives):
// If SRU returns a PPN that appears here, we revert 30xx back to the personal name instead of linking.
// The file "PPN-Lookup-False-Positive.map" is expected to contain "PPN=reason" (or "PPN=1").
var ppn_false_positive = new Map()

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
    .replace('abs1:', '').replace('doi:https://doi.org/', '').replace('handle:https://hdl.handle.net/', '');
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

  for (let k = 0; k < itemsOutputCache[itemId].length; k++) {
    const line = itemsOutputCache[itemId][k];
    if (line.startsWith(markerBackslash + " ") || line.startsWith(markerNewline + " ")) {
      itemsOutputCache[itemId][k] =
        (line.startsWith(markerBackslash) ? markerBackslash : markerNewline) + " " + payload;
      return true;
    }
  }
  itemsOutputCache[itemId].push(markerBackslash + " " + payload);
  return false;
}

function updateAuthorLineToName(itemId, code, printIndex, authorName) {
  // If we had an ORCID for this slot, include it on revert (no PPN case)
  let payload;
  try {
    const _key = itemId + ":" + printIndex;
    const _orcid = authorMapping && authorMapping[_key];
    payload = _orcid
      ? (authorName + "$iorcid$j" + _orcid + "$BVerfasserIn$4aut")
      : (authorName + "$BVerfasserIn$4aut");
  } catch (e) {
    payload = authorName + "$BVerfasserIn$4aut";
  }

  const markerBackslash = code + ' ##' + printIndex + '##';
  const markerNewline = markerBackslash.replace(/\\n/, "\n");

  for (let k = 0; k < itemsOutputCache[itemId].length; k++) {
    const line = itemsOutputCache[itemId][k];
    if (line.startsWith(markerBackslash + " ") || line.startsWith(markerNewline + " ")) {
      itemsOutputCache[itemId][k] =
        (line.startsWith(markerBackslash) ? markerBackslash : markerNewline) + " " + payload;
      return true;
    }
  }
  itemsOutputCache[itemId].push(markerBackslash + " " + payload);
  return false;
}

/* =============================================================================================================== */
/* H. LOBID HELPERS                                                                                                 */
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
  const norm = _normalizePreferredName(authorName);
  const asciiQuoted = '"' + _toAscii(norm).replace(/"/g, '\\"') + '"';
  return [
    { label: "ascii", q: `preferredName.ascii:${asciiQuoted} OR variantName.ascii:${asciiQuoted}` }
  ];
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

function buildLobidUrlFromQuery(q, opts) {
  const base = "https://lobid.org/gnd/search";
  const size = (opts && opts.size) ? opts.size : 2;
  const ids = (opts && Array.isArray(opts.professionIds)) ? opts.professionIds : [];
  const birthYearFrom = (opts && typeof opts.birthYearFrom !== "undefined")
    ? parseInt(opts.birthYearFrom, 10)
    : 1920;

  let filterParts = ["+(type:Person)"];
  if (ids.length > 0) {
    const orList = ids.map(pid => `"${pid}"`).join(" OR ");
    filterParts.push(`+(professionOrOccupation.id:(${orList}))`);
  }
  if (!isNaN(birthYearFrom)) {
    filterParts.push(`+(dateOfBirth:[${birthYearFrom} TO *])`);
  }
  const filter = encodeURIComponent(filterParts.join(" "));

  return base
    + "?q=" + encodeURIComponent(q)
    + "&filter=" + filter
    + "&size=" + encodeURIComponent(String(size))
    + "&format=json";
}

function queryLobidUntilUnique(queries, idx, profileOpts, onUnique, onNoUnique) {
  if (!queries._state) queries._state = { done: false };
  const state = queries._state;
  if (state.done) return;
  if (idx >= queries.length) { state.done = true; return onNoUnique(); }

  const url = buildLobidUrlFromQuery(queries[idx].q, {
    size: 2,
    professionIds: (profileOpts && profileOpts.professionIds) || [],
    birthYearFrom: (profileOpts && profileOpts.birthYearFrom) || undefined
  });

  Z.debug("lobid unique-try [" + queries[idx].label + "]: " + url);

  ZU.doGet(
    url,
    function (responseText) {
      if (state.done) return;
      try {
        const data = JSON.parse(responseText);
        const members = Array.isArray(data.member) ? data.member : [];
        const total = (typeof data.totalItems === "number") ? data.totalItems : members.length;

        Z.debug("lobid unique-try [" + queries[idx].label + "] totalItems=" + total);

        if (total === 1 && members.length === 1) {
          state.done = true; return onUnique(members[0]);
        } else if (total === 0) {
          if (idx + 1 < queries.length) return queryLobidUntilUnique(queries, idx + 1, profileOpts, onUnique, onNoUnique);
          state.done = true; return onNoUnique();
        } else {
          state.done = true; return onNoUnique();
        }
      } catch (e) {
        if (idx + 1 < queries.length) return queryLobidUntilUnique(queries, idx + 1, profileOpts, onUnique, onNoUnique);
        state.done = true; return onNoUnique();
      }
    },
    function () {
      if (state.done) return;
      if (idx + 1 < queries.length) return queryLobidUntilUnique(queries, idx + 1, profileOpts, onUnique, onNoUnique);
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
    const cql = "pica.nid=" + nid;
    const url = base
      + "?version=1.2&operation=searchRetrieve"
      + "&maximumRecords=1&recordSchema=picaxml"
      + "&query=" + encodeURIComponent(cql);

    Z.debug("KXP SRU by GND URL: " + url);

    ZU.doGet(
      url,
      function (xml) {
        try {
          const m = xml.match(
            /<datafield[^>]*tag="028[AC]"[^>]*>[\s\S]*?<subfield[^>]*code="9"[^>]*>([^<]+)<\/subfield>/i
          );
          const ppn = m ? m[1].trim() : null;

          Z.debug("KXP SRU parsed 028A$9 -> PPN=" + (ppn || "null") +
                  " (gnd=" + gndEitherForm + ", nid=" + nid + ")");

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

    // --- AUTHOR LOOP (pre-seed, lobid, SRU) --------------------------------
    /* ===========================================================================================
       5) TIMELINE EXAMPLES
       -------------------------------------------------------------------------------------------
       Legend:
         ++  = _bump(+1, ...)     --  = _bump(-1, ...)
         RTC = runningThreadCount (value AFTER the bump)
         WriteItems() is called once when RTC reaches 0 (and _finalExportLogged is still false).

       A) Unique lobid → SRU success (PPN accepted)
          Start: RTC=1
          ++ lobid:start                          → RTC=2
            (lobid unique)
            ++ sru:start                          → RTC=3
              SRU success (PPN found & not blocklisted)
              finally: -- sru:done                → RTC=2
          -- lobid:done                           → RTC=1
          -- main:done performExport              → RTC=0  → WriteItems()

       B) Unique lobid → SRU null / SRU error / PPN blocklisted
          (revert 30xx to Name and, if captured, include $iorcid$j<ID>)
          Start: RTC=1
          ++ lobid:start                          → RTC=2
            (lobid unique)
            ++ sru:start                          → RTC=3
              SRU null OR SRU error OR blocklist
              finally: -- sru:done / -- sru:fail  → RTC=2
          -- lobid:done                           → RTC=1
          -- main:done performExport              → RTC=0  → WriteItems()

       C) No-unique lobid (SRU not started; keep Name and, if captured, include $iorcid$j<ID>)
          Start: RTC=1
          ++ lobid:start                          → RTC=2
            (no-unique)
          -- lobid:done                           → RTC=1
          -- main:done performExport              → RTC=0  → WriteItems()

       Note on SRU "late error":
         If both SRU success and a late error callback arrive, only the FIRST closes the SRU branch.
         The SECOND sees _sruOutstanding[key] === false and logs "late error ignored", so no
         double-decrement occurs and RTC accounting remains correct.
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

          addLine(currentItemId,
            code + ' ##' + printIndex + '##',
            authorName + "$BVerfasserIn$4aut");

          const threadParams = Object.freeze({
            "currentItemId": currentItemId,
            "code": code,
            "fieldTag": fieldTag,
            "authorName": authorName,
            "printIndex": printIndex
          });

          _bump(1, "lobid:start auth=" + authorName);

          let _lobidClosed = false;
          function _endLobidOnce(reason) {
            if (_lobidClosed) { Z.debug("lobid already finished (" + reason + ")"); return; }
            _lobidClosed = true; _bump(-1, reason); finishIfIdle();
          }

          // profession filter selection
          let profIds = [];
          if (institution_retrieve_sign === "krzo") {
            profIds = [];
          } else if (String(SsgField || "").match(/^0(\b|$)/)) {
            profIds = _allGndIdsFromMap(profession_to_gndids_ssg0);
          } else if (String(SsgField || "") === "1") {
            profIds = _allGndIdsFromMap(profession_to_gndids);
          } else {
            profIds = [];
          }
          Z.debug("Profession URIs applied: " + profIds.length + " (inst=" + institution_retrieve_sign + ", SSG=" + SsgField + ")");

          const _queries = buildNameQueries(authorName);
          let _lobidResolved = false;

          function _safeOnUnique(member) {
            if (_lobidResolved) return; _lobidResolved = true;

            Z.debug(
              "lobid onUnique -> name=" + threadParams["authorName"] +
              ", printIndex=" + threadParams["printIndex"] +
              ", code=" + threadParams["code"] +
              ", gnd=" + (member.gndIdentifier || member.id || member['@id'])
            );

            var gnd = null;
            try {
              if (member.gndIdentifier) {
                gnd = Array.isArray(member.gndIdentifier) ? member.gndIdentifier[0] : member.gndIdentifier;
              }
              if (!gnd && (member.id || member['@id'])) {
                var idUrl = member.id || member['@id'];
                var m = idUrl && idUrl.match(/\/gnd\/([0-9X-]+)$/);
                if (m) gnd = m[1].replace(/-/g, '');
              }
            } catch (e) { /* keep gnd null */ }

            if (gnd) {
              updateAuthorLineToPPN(
                threadParams["currentItemId"],
                threadParams["code"],
                threadParams["printIndex"],
                String(gnd).match(/^\d+X?/)[0]
              );
            }

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
                )

                _bump(1, "sru:start key=" + _key + " gnd=" + gnd);
                lookupTitlePPNFromOpacByGND(gnd,
                  function (ppn) {
                    // Always close SRU thread even if something throws inside (finally block)
                    try {
                      _ppnLookupState[_key] = "done";
                      Z.debug("KXP PPN found for GND " + gnd + ": " + ppn);

                      if (ppn) {
                        // FALSE-POSITIVE guard
                        if (ppn_false_positive && (ppn_false_positive.has(ppn))) {
                          Z.debug("PPN " + ppn + " is flagged in PPN-Lookup-False-Positive.map → revert to personal name");
                          const reverted = updateAuthorLineToName(_itemId, _code, _printIndex, threadParams["authorName"]);
                          Z.debug("Reverted 30xx to personal name due to PPN blocklist (" + reverted + ")");
                          return; // finally{} will still run and close the SRU thread
                        }

                        Z.debug("Overwriting " + _code + " ##" + _printIndex + "## with PPN " + ppn);
                        const replaced = updateAuthorLineToPPN(_itemId, _code, _printIndex, ppn);
                        Z.debug("30xx replacement success? " + replaced);
                        addOnce8910(_itemId,
                          "$aixzom$bVerfasserIn in der Zoterovorlage [" +
                          threadParams["authorName"] +
                          "] einer PPN " +
                          ppn + " maschinell zugeordnet "
                        );
                      } else {
                        // No PPN → revert to personal name (this will also add $iorcid$j<id> if we captured one)
                        const reverted = updateAuthorLineToName(_itemId, _code, _printIndex, threadParams["authorName"]);
                        Z.debug("No KXP PPN found for GND " + gnd + " → reverted 30xx to personal name (" + reverted + ")");
                      }
                    } catch (ex) {
                      Z.debug("SRU success handler threw: " + ex);
                    } finally {
                      if (_sruOutstanding[_key]) {
                        _sruOutstanding[_key] = false;
                        _bump(-1, "sru:done key=" + _key);
                        finishIfIdle();
                      } else {
                        Z.debug("SRU done already closed for key " + _key);
                      }
                    }
                  },
                  function (e) {
                    // Also close here in a finally, guarded by _sruOutstanding[_key]
                    try {
                      if (_ppnLookupState[_key] !== "done") {
                        _ppnLookupState[_key] = "failed";
                        Z.debug("KXP SRU by GND failed for " + gnd + ": " + e);
                        const reverted = updateAuthorLineToName(_itemId, _code, _printIndex, threadParams["authorName"]);
                        Z.debug("SRU failed → reverted 30xx to personal name (" + reverted + ")");
                      } else {
                        Z.debug("KXP SRU late error ignored (already resolved) for key " + _key);
                      }
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

            _endLobidOnce("lobid:done auth=" + threadParams["authorName"]);
          }

          function _safeOnNoUnique() {
            if (_lobidResolved) return;
            _lobidResolved = true;

            // If lobid is not unique (totalItems != 1), we keep the personal name.
            // BUT: if an ORCID was captured for this author slot, include it now.
            try {
              const _itemId = threadParams["currentItemId"];
              const _printIndex = threadParams["printIndex"];
              const _code = threadParams["code"];
              const _name = threadParams["authorName"];

              // This reuses the same revert function that adds $iorcid$j<id> when present
              const changed = updateAuthorLineToName(_itemId, _code, _printIndex, _name);
              Z.debug("lobid no-unique → 30xx kept as personal name (ORCID included if available): " + changed);
            } catch (e) {
              Z.debug("lobid no-unique handler threw: " + e);
            }

            _endLobidOnce("lobid:done (no-unique) auth=" + threadParams["authorName"]);
          }

          // Sequential unique-match lookup (professionIds as computed above)
          queryLobidUntilUnique(
            _queries,
            0,
            { professionIds: profIds, birthYearFrom: undefined /* optional lower bound */ },
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

      // Exportkopf (E*, 7100, 8012 + optional 7133 appended via 'localURL')
      if (institution_retrieve_sign == "") {
        if (SsgField == "NABZ") {
          addLine(currentItemId, '\nE* l01\n7100$Jn\n8012 ixzs$aixzo$aNABZ' + localURL, "");
        } else {
          addLine(currentItemId, '\nE* l01\n7100$Jn\n8012 ixzs$aixzo' + localURL, "");
        }
      } else if (institution_retrieve_sign == "inzo") {
        if (SsgField == "NABZ") {
          addLine(currentItemId, '\nE* l01\n7100$Jn\n8012 inzs$ainzo$aNABZ' + localURL, "");
        } else {
          addLine(currentItemId, '\nE* l01\n7100$Jn\n8012 inzs$ainzo' + localURL, "");
        }
      } else if (institution_retrieve_sign == "krzo") {
        if (SsgField == "NABZ") {
          addLine(currentItemId, '\nE* l01\n7100$Jn\n8012 krzo$aNABZ' + localURL, "");
        } else {
          addLine(currentItemId, '\nE* l01\n7100$Jn\n8012 krzo' + localURL, "");
        }
      } else if (institution_retrieve_sign == "itbk") {
        addLine(currentItemId, '\nE* l01\n7100$Jn\n8012 itbk$aixrk$aixzs$aixzo' + localURL, "");
      } else if (institution_retrieve_sign == "tojs") {
        addLine(currentItemId, '\nE* l01\n4801 Der Zugriff ist kostenfrei möglich\n7100 $B21\n8012 fauf$auwzs$atojs' + localURL, "");
      }

      // 5520 (IxTheo subjects from Zotero tags)
      for (i = 0; i < item.tags.length; i++) {
        addLine(currentItemId, "\n5520", " " + ZU.unescapeHTML(item.tags[i].tag.replace(/\s?--\s?/g, '; ')));
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

var ENABLE_DEBUG = false;
if (!ENABLE_DEBUG) {
  Z.debug = function () {};
}
