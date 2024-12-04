{
	"translatorID": "696799ad-7cba-48af-aa6c-abfaf98ebe5c",
	"label": "ubtue_pica3_extern",
	"creator": "Timotheus Kim",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 2,
	"lastUpdated": "2024-12-04 09:52:12"
}

// Zotero Export Translator in Pica3 Format ohne GND-Lookup für das Einzeln- und Mulitiupload in WinIBW
// (wie es im K10+ Verbund benutzt wird)
// https://verbundwiki.gbv.de/display/VZG/PICA-Format


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
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 ***** END LICENSE BLOCK *****
 */

/* =============================================================================================================== */
// Mapping tables that get populated with the entries from their corresponding map files in the Github repo
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
// Repository base URL
var zts_enhancement_repo_url = 'https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/'; // hier eigene github repo url
var downloaded_map_files = 0;
var max_map_files = 12;

// Mapping JournalTitle>Language
var journal_title_to_language_code = {
	"Oriens Christianus" :"ger",
	"Ephemerides Theologicae Lovanienses" : "fre",
	"Science et Esprit" : "fre",
}

/* =============================================================================================================== */
// ab hier Programmcode
var defaultSsgNummer = undefined;
var defaultLanguage = "eng"; // define default language regardless of mapping
var cataloguingStatus = "n"; // 0500 Position 3
var cataloguingStatusO = "n"; // 0500 Position 3

var currentItemId = -1;
var itemsOutputCache = []

function populateISSNMaps(mapData, url) {
	var mapFilename = url.substr(url.lastIndexOf("/") + 1);
	var temp = new Map();
	var lines = mapData.split('\n');

	for (i in lines) {
		var line = lines[i].split("#")[0].trim();
		if (line.length < 2)
			continue;

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
		default:
			throw "Unknown map file: " + mapFilename;
	}

	downloaded_map_files += 1;
}

function EscapeNonASCIICharacters(unescaped_string) {
	let escaped_string = "";
	const length = unescaped_string.length;
	for (var i = 0; i < length; ++i) {
		const char_code = unescaped_string.charCodeAt(i);
		if (char_code < 128)
			escaped_string += unescaped_string[i];
		else
			escaped_string += "\\u" + ("00" + char_code.toString(16)).substr(-4);
	}
	return escaped_string;
}

function addLine(itemid, code, value) {
    // Handle undefined value
    if (value == undefined) {
        value = "Für Feld " + code.replace(/\\n/, '') + " wurde kein Eintrag hinterlegt";
        code = '\\nxxxx';
    }

    // Trim the value and perform replacements
    value = value.trim();

    // Quote handling
    value = value
        .replace(/"/g, '\\"')     // Replace double quotes
        .replace(/„/g, '\\"');    // Replace German opening quotes

    // Remove specific tags and text
    value = value
        .replace('RezensionstagPica', '')
        .replace(/\t/g, '');      // Remove tabs

    // Standardize review notations
    value = value
        .replace(/\|s\|peer\s?reviewed?/i, '|f|Peer reviewed')
        .replace(/\|s\|book\s+reviews?/i, '|f|Book Review')
        .replace('|f|Book Reviews, Book Review', '|f|Book Review');

    // Clean up URLs and DOIs
    value = value
        .replace('https://doi.org/https://doi.org/', 'https://doi.org/')
        .replace('doi:https://doi.org/', '')
        .replace('handle:https://hdl.handle.net/', '');

    // Miscellaneous cleanup
    value = value
        .replace(/@\s/, '@')
        .replace('abs1:', '');

    // Construct the final line and add to cache
    var line = code + " " + value;
    itemsOutputCache[itemid].push(line);
}


function WriteItems() {
	var batchUpload = false;
	if (itemsOutputCache.length > 1) batchUpload = true;
	itemsOutputCache.forEach(function(element, index) {
		let errorString = "";
		element.sort();
		var cleanElement = [];
		for (let line of element) {
			let toDelete = line.match(/30\d{2}( ##\d{3}##)/);
			if (toDelete != null) {
				line = line.replace(toDelete[1], '');
			}
			line = line.replace(/^\\nZ/, '\\n');
			if (line.match(/\\nxxxx /) != null) {
				errorString += line.substring(7, line.length) + '\\n';
			}
			cleanElement.push(line);
		}
		if(index > 0) {
			Zotero.write("\n");
		}
		if (batchUpload) {
			let writeString = cleanElement.join("");
			writeString = EscapeNonASCIICharacters(writeString);
			if (errorString != "") {
				Zotero.write('application.activeWindow.command("e", false);\napplication.activeWindow.title.insertText("' + writeString + '");')
				Zotero.write("application.messageBox('Fehler beim Export aus Zotero', '" + errorString + "', 'error-icon')");
			}
			else {
				Zotero.write('application.activeWindow.command("e", false);\napplication.activeWindow.title.insertText("' + writeString + '");\napplication.activeWindow.pressButton("Enter");\n\n');
			}
		}
		else {
			var elementString = cleanElement.join("");
			elementString = elementString.replace(/\\n/g, '\n').replace(/\\"/g, '"');
			Zotero.write(elementString);
		}
	});
}

function createNoteAuthorsToOrcidsMap(item) {
	if (!item.notes)
		return new Map();

	let noteAuthorsToOrcids = new Map();
   
	for (let orcidEntry of item.notes.filter(entry => entry.note.startsWith('orcid:'))) {
		let orcidLine = orcidEntry.note.replace(/orcid:/, '');
		let orcidAndAuthor = orcidLine.split('|');
		if (orcidAndAuthor.length < 2)
			continue;
		if (!orcidAndAuthor[0].match(/\d{4}-\d{4}-\d{4}-\d{3}(?:\d|x)/i))
			continue;
		let orcid = orcidAndAuthor[0].trim();
		let creator = ZU.cleanAuthor(orcidAndAuthor[1].trim());
		noteAuthorsToOrcids.set(JSON.stringify(creator), orcid);
	}
	return noteAuthorsToOrcids;
}

function getAuthorOrcid(creator, noteAuthorsToOrcids) {
	let creatorNoType = creator;
	delete creatorNoType["creatorType"];
	return noteAuthorsToOrcids.get(JSON.stringify(creatorNoType));
}

function performExport() {
	Z.debug("Begin exporting item(s)...");

	var item;
	while ((item = Zotero.nextItem())) {
		currentItemId++;
		itemsOutputCache[currentItemId] = [];

		var physicalForm = "";
		var licenceField = "";
		var SsgField = "";
		var superiorPPN = "";
		var journalTitlePPN = "";
		var issn_to_language = "";
		var institution_retrieve_sign = "";
		var collection_code = "";
		var retrieve_sign = "";
		
		if (!item.ISSN)
			item.ISSN = "";
		if (item.ISSN.match(/^\d+/)) item.ISSN = ZU.cleanISSN(item.ISSN);
		
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
		if (!item.volume && issn_to_volume.get(item.ISSN) !== undefined) {
			item.volume = issn_to_volume.get(item.ISSN) + item.volume;
			Z.debug("Found volume:" + item.volume);
		}
		if (issn_to_physical_form.get(item.ISSN) !== undefined) {
			physicalForm = issn_to_physical_form.get(item.ISSN);
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
		if (journal_title_to_ppn.get(item.publicationTitle) !== undefined) {
			journalTitlePPN = journal_title_to_ppn.get(item.publicationTitle);
			Z.debug("Found journalTitlePPN:" + journalTitlePPN);
		}
		if (publication_title_to_physical_form.get(item.publicationTitle) !== undefined) {
			physicalForm = publication_title_to_physical_form.get(item.publicationTitle);
			Z.debug("Found physicalForm:" + physicalForm);
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

		switch (true) {
			case physicalForm === "A":
				addLine(currentItemId, '\\n0500', physicalForm+"s"+cataloguingStatus);
				break;
			case physicalForm === "O" && licenceField === "l":
				addLine(currentItemId, '\\n0500', physicalForm+"s"+cataloguingStatus);
				break;
			case physicalForm === "O" && licenceField === "kw":
				addLine(currentItemId, '\\n0500', physicalForm+"s"+cataloguingStatus);
				break;
			default:
				addLine(currentItemId, '\\n0500', physicalForm+"s"+cataloguingStatus);
		}

		addLine(currentItemId, "\\n0501", "Text$btxt");

		switch (physicalForm) {
			case "A":
				addLine(currentItemId, "\\n0502", "ohne Hilfsmittel zu benutzen$bn");
				break;
			case "O":
				addLine(currentItemId, "\\n0502", "Computermedien$bc");
				break;
			default:
				addLine(currentItemId, "\\n0502", "Computermedien$bc");
		}

		switch (physicalForm) {
			case "A":
				addLine(currentItemId, "\\n0503", "Band$bnc");
				break;
			case "O":
				addLine(currentItemId, "\\n0503", "Online-Ressource$bcr");
				break;
			default:
				addLine(currentItemId, "\\n0503", "Online-Ressource$bcr");
		}

		if (collection_code != "") {
			addLine(currentItemId, "\\n0575", collection_code);
		}

		var date = Zotero.Utilities.strToDate(item.date);
		if (date.year !== undefined) {
			addLine(currentItemId, "\\n1100", date.year.toString());
		}

		//1131 Art des Inhalts
		for (i=0; i<item.tags.length; i++) {
			if (item.tags[i].tag.match(/RezensionstagPica|Book\s?reviews?/gi)) {
				addLine(currentItemId, "\\n1131", "!106186019!");
			}
		}
		var localURL = "";		
		if (item.url && item.url.match(/redi-bw.de/) && physicalForm === "O") {
			localURL = "\\n7133 " + item.url + "$xH$3Volltext$4ZZ$534";
			item.url = null;		
		}
		if (item.DOI && institution_retrieve_sign == "zojs") {
			localURL = "\\n7133 " + "https://doi.org/" + item.DOI;
			item.url = null;
		}

		//item.language --> 1500 Sprachcodes
		if (item.itemType == "journalArticle") {
			if (language_to_language_code.get(item.language)) {
				item.language = language_to_language_code.get(item.language);
			}
			addLine(currentItemId, "\\n1500", item.language);
		} else if (item.itemType == "bookSection"){
			item.language = issn_to_language_code.get(item.ISBN);
			addLine(currentItemId, "\\n1500", item.language);
		} else {
			item.language = issn_to_language_code.get(item.language);
			addLine(currentItemId, "\\n1500", item.language);
		}

		//1505 Katalogisierungsquelle
		addLine(currentItemId, "\\n1505", "$erda");

		// 3000 Handle authors
		let noteAuthorsToOrcids = createNoteAuthorsToOrcidsMap(item);
		
		var i = 0;
		while (item.creators.length > 0) {
			let creator = item.creators.shift();
			if (creator.creatorType == "author") {
				var authorName = creator.lastName + (creator.firstName ? ", " + creator.firstName : "");
				var code = (i === 0) ? "\\n3000" : "\\n3010";
				let authorIndex = i.toString();
				let printIndex = authorIndex.padStart(3, '0');
				i++;

				let authorOrcid = getAuthorOrcid(creator, noteAuthorsToOrcids);
				if (authorOrcid) {
					addLine(currentItemId, code + ' ##' + printIndex + '##', 
						`${authorName}$iorcid$j${authorOrcid}$BVerfasserIn$4aut`);
				} else {
					addLine(currentItemId, code + ' ##' + printIndex + '##', 
						authorName + "$BVerfasserIn$4aut");
				}
			}
		}

		// Title handling
		var titleStatement = "";
		if (item.shortTitle == "journalArticle") {
			titleStatement += item.shortTitle;
			if (item.title && item.title.length > item.shortTitle.length) {
				titleStatement += ZU.unescapeHTML(item.title.substr(item.shortTitle.length));
			}
		} else {
			titleStatement += item.title;
		}

		// Add sorting characters based on language
		if (item.language == "ger" || !item.language) {
			titleStatement = titleStatement.replace(/^(Der|Die|Das|Des|Dem|Den|Ein|Eines|Einem|Eine|Einen|Einer) ([^@])/i, "$1 @$2");
		}
		if (item.language == "ger" || !item.language) {
			titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])(Der|Die|Das|Des|Dem|Den|Ein|Eines|Einem|Eine|Einen|Einer) ([^@])/i, "„$2 @$3");
		}
		if (item.language == "eng" || !item.language) {
			titleStatement = titleStatement.replace(/^(The|A|An) ([^@])/i, "$1 @$2");
		}
		if (item.language == "eng" || !item.language) {
			titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])(The|A|An) ([^@])/i, "„$2 @$3");
		}
		if (item.language == "fre" || !item.language) {
			titleStatement = titleStatement.replace(/^(Le|La|Les|Des|Un|Une) ([^@])/i, "$1 @$2");
			titleStatement = titleStatement.replace(/^L'\s?([^@])/i, "L' @$1").replace(/^L’\s?([^@])/i, "L' @$1");
		}
		if (item.language == "fre" || !item.language) {
			titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])(Le|La|Les|Des|Un|Une) ([^@])/i, "„$2 @$3");
			titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])L'\s?([^@])/i, "„L' @$2").replace(/^([\u201e]|[\u201d]|[\u201c])L’\s?([^@])/i, "„L' @$2");
		}
		if (item.language == "ita" || !item.language) {
			titleStatement = titleStatement.replace(/^(La|Le|Lo|Gli|I|Il|Un|Una|Uno) ([^@])/i, "$1 @$2");
			titleStatement = titleStatement.replace(/^L'\s?([^@])/i, "L' @$1").replace(/^L’\s?([^@])/i, "L' @$1");
		}
		if (item.language == "ita" || !item.language) {
			titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])(La|Le|Lo|Gli|I|Il|Un|Una|Uno) ([^@])/i, "„$2 @$3");
			titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])L'\s?([^@])/i, "„L' @$2").replace(/^([\u201e]|[\u201d]|[\u201c])L’\s?([^@])/i, "„L' @$2");
		}
		if (item.language == "por" || !item.language) {
			titleStatement = titleStatement.replace(/^(A|O|As|Os|Um|Uma|Umas|Uns) ([^@])/i, "$1 @$2");
		}
		if (item.language == "por" || !item.language) {
			titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])(A|O|As|Os|Um|Uma|Umas|Uns) ([^@])/i, "„$2 @$3");
		}
		if (item.language == "spa" || !item.language) {
			titleStatement = titleStatement.replace(/^(El|La|Los|Las|Un|Una|Unos|Unas) ([^@])/i, "$1 @$2");
		}
		if (item.language == "spa" || !item.language) {
			titleStatement = titleStatement.replace(/^([\u201e]|[\u201d]|[\u201c])(El|La|Los|Las|Un|Una|Unos|Unas) ([^@])/i, "„$2 @$3");
		}

		addLine(currentItemId, "\\n4000", ZU.unescapeHTML(titleStatement));

		//Ausgabe --> 4020
		if (item.edition) {
			addLine(currentItemId, "\\n4020", item.edition);
		}

		//Erscheinungsvermerk --> 4030
		if (!article) {
			var publicationStatement = "";
			if (item.place) { publicationStatement += item.place; }
			if (item.publisher) { publicationStatement +=  "$n" + item.publisher; }
			addLine(currentItemId, "\\n4030", publicationStatement);
		}


		//4070 $v Bandzählung $j Jahr $h Heftnummer $p Seitenzahl K10Plus:4070 aus $h wird $a
		if (item.itemType == "journalArticle" || item.itemType == "magazineArticle") {
			var volumeyearissuepage = "";
			if (item.volume) { volumeyearissuepage += "$v" + item.volume.replace("Tome ", "").replace(/\s\(Number\s\d+-?\d+\)/, "").replace(/^\d.\w..\s\w\w.\s/, ""); }
			if (date.year !== undefined) { volumeyearissuepage +=  "$j" + date.year; }
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
			if (item.ISSN === "2077-1444" && item.callNumber) {volumeyearissuepage += "$i" + item.callNumber;}
			addLine(currentItemId, "\\n4070", volumeyearissuepage);
		}

		//Open Access / Free Access als LF --> 4950
		if (item.notes) {
			for (let i in item.notes) {
				if (item.notes[i].note.includes('LF')) {
					licenceField = "l";	
				}
			}
		}
		//URL --> 4085 nur bei Satztyp "O.." im Feld 0500 K10Plus:aus 4085 wird 4950
		switch (true) {
			case item.url && item.url.match(/doi\.org\/10\./) && physicalForm === "O" && licenceField === "l": 
				addLine(currentItemId, "\\n4950", item.url + "$xR$3Volltext$4LF$534");//K10Plus:0500 das "l" an der vierten Stelle entfällt, statt dessen wird $4LF in 4950 gebildet
				break;
			case item.url && !item.url.match(/doi\.org\/10\./) && physicalForm === "O" && licenceField === "l": 
				addLine(currentItemId, "\\n4950", item.url + "$xH$3Volltext$4LF$534");//K10Plus:0500 das "l" an der vierten Stelle entfällt, statt dessen wird $4LF in 4950 gebildet
				break;
			case item.url && item.url.match(/doi\.org\/10\./) && physicalForm === "O" && licenceField === "kw":
				addLine(currentItemId, "\\n4950", item.url + "$xR$3Volltext$4KW$534");
				break;
			case item.url && !item.url.match(/doi\.org\/10\./) && physicalForm === "O" && licenceField === "kw":
				addLine(currentItemId, "\\n4950", item.url + "$xH$3Volltext$4KW$534");
				break;
			case item.url && item.url.match(/doi\.org\/10\./) && physicalForm === "O":
				addLine(currentItemId, "\\n4950", item.url + "$xR$3Volltext$4ZZ$534");
				break;
			case item.url && !item.url.match(/doi\.org\/10\./) && physicalForm === "O":
				addLine(currentItemId, "\\n4950", item.url + "$xH$3Volltext$4ZZ$534");
				break;
			case item.url && item.itemType == "magazineArticle":
				addLine(currentItemId, "\\n4950", item.url + "$xH");
				break;
		}

		//DOI --> 4950 DOI in aufgelöster Form mit Lizenzinfo "LF"
		if (item.DOI && item.url && !item.url.match(/https?:\/\/doi\.org/) && licenceField === "l") {
			addLine(currentItemId, "\\n4950", "https://doi.org/" + item.DOI + "$xR$3Volltext$4LF$534");
		}
		//DOI --> 4950 DOI in aufgelöster Form mit Lizenzinfo "ZZ"
		if (item.DOI && item.url && !item.url.match(/https?:\/\/doi\.org/) && !licenceField) {
			addLine(currentItemId, "\\n4950", "https://doi.org/" + item.DOI + "$xR$3Volltext$4ZZ$534");
		}
		if (item.DOI && !item.url) {
			if (licenceField === "l") {
				addLine(currentItemId, "\\n4950", "https://doi.org/" + item.DOI + "$xR$3Volltext$4LF$534");
			} else if (!licenceField) {
				addLine(currentItemId, "\\n4950", "https://doi.org/" + item.DOI + "$xR$3Volltext$4ZZ$534");
			}
		}
		//item.DOI --> 2051 bei "Oou" bzw. 2053 bei "Aou"
		if (item.DOI) {
			if (physicalForm === "O" || item.DOI) {
				addLine(currentItemId, "\\n2051", item.DOI.replace('https://doi.org/', ''));
			} else if (physicalForm === "A") {
				addLine(currentItemId, "\\n2053", item.DOI.replace('https://doi.org/', ''));
			}
		}

		//item.notes as second doi --> 2051
		if (item.notes) {
			for (let i in item.notes) {
				if (item.notes[i].note.includes('doi:')) {
					addLine(currentItemId, "\\n2051", ZU.unescapeHTML(item.notes[i].note.replace('doi:https://doi.org/', '')));
					if (licenceField === "l") {
						addLine(currentItemId, "\\n4950", ZU.unescapeHTML(item.notes[i].note.replace(/doi:/i, '') + "$xR$3Volltext$4LF$534"));
					}
					else {
						addLine(currentItemId, "\\n4950", ZU.unescapeHTML(item.notes[i].note.replace(/doi:/i, '') + "$xR$3Volltext$4ZZ$534"));
					}
				}
			}
		}

		//item.notes as handle --> 2052
		if (item.notes) {
			for (let i in item.notes) {
				if (item.notes[i].note.includes('handle:')) {
					addLine(currentItemId, "\\n2052", ZU.unescapeHTML(item.notes[i].note.replace(/handle:https?:\/\/hdl\.handle\.net\//i, '')));
					if (licenceField === "l") {
						addLine(currentItemId, "\\n4950", ZU.unescapeHTML(item.notes[i].note.replace(/handle:/i, '') + "$xR$3Volltext$4LF$534"));
					}
					else {
						addLine(currentItemId, "\\n4950", ZU.unescapeHTML(item.notes[i].note.replace(/handle:/i, '') + "$xR$3Volltext$4ZZ$534"));
					}
				}
				if (item.notes[i].note.indexOf('urn:') == 0) {
					addLine(currentItemId, "\\n2050", ZU.unescapeHTML(item.notes[i].note));
					if (licenceField === "l") {
						addLine(currentItemId, "\\n4950", 'http://nbn-resolving.de/' + ZU.unescapeHTML(item.notes[i].note + "$xR$3Volltext$4LF$534"));
					}
					else {
						addLine(currentItemId, "\\n4950", 'http://nbn-resolving.de/' + ZU.unescapeHTML(item.notes[i].note + "$xR$3Volltext$4ZZ$534"));
					}
				}
				if (item.notes[i].note.indexOf('URI:') == 0) {
					if (licenceField === "l") {
						addLine(currentItemId, "\\n4950", ZU.unescapeHTML(item.notes[i].note.replace(/URI:/, '') + "$xR$3Volltext$4LF$534"));
					}
					else {
						addLine(currentItemId, "\\n4950", ZU.unescapeHTML(item.notes[i].note.replace(/URI:/i, '') + "$xR$3Volltext$4ZZ$534"));
					}
				}
			}
		}


		//Reihe --> 4110
		if (!article) {
			var seriesStatement = "";
			if (item.series) {
				seriesStatement += item.series;
			}
			if (item.seriesNumber) {
				seriesStatement += " ; " + item.seriesNumber;
			}
			addLine(currentItemId, "\\n4110", seriesStatement);
		}

		//Inhaltliche Zusammenfassung --> 4207
		if (item.abstractNote) {
			item.abstractNote = ZU.unescapeHTML(item.abstractNote);
			addLine(currentItemId, "\\n4207", item.abstractNote.replace("", "").replace(/–/g, '-').replace(/&#160;/g, "").replace('No abstract available.', '').replace('not available', '').replace(/^Abstract\s?:?/, '').replace(/Abstract  :/, '').replace(/^Zusammenfassung/, '').replace(/^Summary/, ''));
		}
		//Inhaltliche Zusammenfassung, falls mehr als ein Abstract --> 4207
		if (item.notes) {
			for (let i in item.notes) {
				if (item.notes[i].note.includes('abs')) addLine(currentItemId, "\\n4207", item.notes[i].note.replace("", "").replace(/–/g, '-').replace(/&#160;/g, "").replace('No abstract available.', '').replace('not available', '').replace(/^Abstract\s?:?/, '').replace(/Abstract  :/, '').replace(/^Zusammenfassung/, '').replace(/^Summary/, '').replace('abs:', ''));
			}
		}
		//item.publicationTitle --> 4241 Beziehungen zur größeren Einheit
		if (item.itemType == "journalArticle" || item.itemType == "magazineArticle" || item.itemType == "bookSection") {
			if (superiorPPN.length != 0) {
				addLine(currentItemId, "\\n4241", "Enthalten in" + superiorPPN);
			} else if (journalTitlePPN.length != 0) {
				addLine(currentItemId, "\\n4241", "Enthalten in" + journalTitlePPN);
			}
			else addLine(currentItemId, "\\n4241", undefined);


			//4261 Themenbeziehungen (Beziehung zu der Veröffentlichung, die beschrieben wird)|case:magazineArticle
			if (item.itemType == "magazineArticle") {
				addLine(currentItemId, "\\n4261", "Rezension von" + item.publicationTitle); // zwischen den Ausrufezeichen noch die PPN des rezensierten Werkes manuell einfügen.
			}
		}
		//ORCID und Autorennamen --> 8910
		if (item.notes) {
			for (let i in item.notes) {
				if (item.notes[i].note.includes('orcid')) {
					if (institution_retrieve_sign == "krzo") addLine(currentItemId, "\\n8910", '$akrzom$b'+item.notes[i].note);
					else addLine(currentItemId, "\\n8910", '$aixzom$b'+item.notes[i].note);
				}
			}
		}
		if (institution_retrieve_sign == "") {
			addLine(currentItemId, '\\nE* l01\\n7100$Jn\\n8012 ixzs$aixzo' + localURL, "");
		}
	}
    // Just call WriteItems directly
    WriteItems();
	Z.debug("Done exporting item(s)!");
}

function doExport() {
	Z.debug("Populating ISSN mapping tables...");

	ZU.doGet([
		zts_enhancement_repo_url + "ISSN_to_language_code.map",
		zts_enhancement_repo_url + "ISSN_to_licence.map",
		zts_enhancement_repo_url + "ISSN_to_physical_form.map",
		zts_enhancement_repo_url + "ISSN_to_SSG_zotkat.map",
		zts_enhancement_repo_url + "ISSN_to_superior_ppn.map",
		zts_enhancement_repo_url + "ISSN_to_volume.map",
		zts_enhancement_repo_url + "language_to_language_code.map",
		zts_enhancement_repo_url + "notes_to_ixtheo_notations.map",
		zts_enhancement_repo_url + "journal_title_to_ppn.map",
		zts_enhancement_repo_url + "publication_title_to_physical_form.map",
		zts_enhancement_repo_url + "ISSN_to_Sammlungscode_zotkat.map",
		zts_enhancement_repo_url + "ISSN_to_Institution_zotkat.map",
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

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
