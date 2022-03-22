{
	"translatorID": "bd95c0c2-ee3c-41ae-a05c-cc9dd7867a3f",
	"label": "ikr_batch",
	"creator": "Philipp Zumstein, Timotheus Kim, Mario Trojan, Madeeswaran Kannan",
	"target": "txt",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 2,
	"browserSupport": "gcs",
	"lastUpdated": "2022-03-22 16:57:00"
}



// Zotero Export Translator für das Pica3-Format angepasst für DAKAR-Datenbank


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
var issn_to_keyword_field = {};
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
// Repository base URL
var zts_enhancement_repo_url = 'https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/';
var downloaded_map_files = 0;
var max_map_files = 11;

/*
    The following maps DO NOT have a corresponding file in the zts_enhancement_maps repository.
    Until they are added somewhere online for downloading, we'll use the hardcoded maps that follow:
*/

// Mapping JournalTitle>Language
var journal_title_to_language_code = {
	"Oriens Christianus" :"ger",
	"Ephemerides Theologicae Lovanienses" : "fre",
	"Science et Esprit" : "fre",
}

/* =============================================================================================================== */
// ab hier Programmcode
var defaultSsgNummer = "1";
var defaultLanguage = "";

//item.type --> 0500 Bibliographische Gattung und Status
//http://swbtools.bsz-bw.de/winibwhelp/Liste_0500.htm

var cataloguingStatus = "n";//0500 Position 3

/*
    WICHTIG - ERST LESEN UND !!!VERSTEHEN!!! BEVOR ÄNDERUNGEN GEMACHT WERDEN

    Hinweise zur Nebenläufigkeit
    - Dieses Skript verwendet Remote-calls zum Auflösen verschiedener Daten (z.B. PPNs für Autoren)
    - Diese Calls sind per Javascript nur asynchron aufrufbar
        - Konstrukte wie z.B. Zotero.wait() und Zotero.done() existieren in der aktuellen Zotero-Version (5) noch, haben aber keine Funktion mehr.
        - Verschiedene Workarounds wurden ausprobiert (z.B. Semaphor über globale Variable), haben aber nie funktioniert
        - Man kommt also um die asynchronen Aufrufe nicht herum

    HINWEISE ZUR IMPLEMENTATION in diesem Skript
    - Die Variable runningThreadCount enthält die Anzahl der noch laufenden Threads (Hauptskript + asynchrone abfragen)
        - Startwert 1 (für Hauptskript)
        - +1 beim Start jedes zusätzlichen asynchronen Aufrufs
        - -1 beim Ende jedes asynchronen Aufrufs (im ondone callback)
        - -1 beim Ende des Hauptskripts
    - Alle Informationen werden im itemsOutputCache nach Item gruppiert gesammelt (laufende Nummer)
    - Erst am Ende des Skripts werden die Einträge im itemsOutputCache sortiert und geschrieben
        - Sortierung ist notwendig, da Hauptskript und asynchrone Threads gemischt Codes reinschreiben => Codes sind durcheinander
        - So wird auch verhindert dass Datensätze durcheinander sind, falls mehrere gleichzeitig exportiert werden
    - Dafür ist es notwendig, dass sowohl das Ende des Skripts als auch jeder einzelne Async ondone callback auf
      runningThreadCount == 0 prüft und bei Bedarf die finale Funktion WriteItems aufruft.
 */

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
        case "ISSN_to_keyword_field.map":
            issn_to_keyword_field = temp;
            break;
        case "ISSN_to_language_code.map":
            issn_to_language_code = temp;
            break;
        case "ISSN_to_licence.map":
            issn_to_license = temp;
            break;
        case "ISSN_to_physical_form.map":
            issn_to_physical_form = temp;
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
		case "ISSN_to_Abrufzeichen_zotkat.map":
            issn_to_retrieve_sign = temp;
            break;
        default:
            throw "Unknown map file: " + mapFilename;
    }

    downloaded_map_files += 1;
}

var runningThreadCount = 1;
var currentItemId = -1;
var itemsOutputCache = [];
var authorMapping = {};

/**
 * Diese Funktion dient als Ersatz für Zotero.ProcessDocuments
 * Mit dieser Funktion ist es möglich, der processor-Funktion eine zusätzliche Variable weiterzugeben ("processorParams").
 * Notwendig um z.B. Kopien globaler Variablen weiterzugeben, die sonst den Wert ändern
 * bis die Processor-Funktion am Ende des callbacks aufgerufen wird.
 *
 * Original siehe: https://github.com/zotero/zotero/blob/master/chrome/content/zotero/xpcom/http.js
 */
async function processDocumentsCustom (url, processor, processorParams, onDone, onError) {
    var f = function() {
       Zotero.Utilities.loadDocument(url, function(doc) {
           processor(doc, url, processorParams);
       });

    };

    try {
        await f();
    }
    catch (e) {
        if (onError) {
            onError(e);
        }
        throw e;
    }

    if (onDone) {
        onDone();
    }
};

//Generate Unicode escapes for all non-ASCII characters.

function EscapeNonASCIICharacters(unescaped_string) {
    let escaped_string = "";
    const length = unescaped_string.length;
    for (var i = 0; i < length; ++i) {
        const char_code = unescaped_string.charCodeAt(i);
        if (char_code < 128) // ASCII                                                                                                                            
            escaped_string += unescaped_string[i];
        else
            escaped_string += "\\u" + ("00" + char_code.toString(16)).substr(-4);
    }

    return escaped_string;
}

function addLine(itemid, code, value) {
	
    //Zeile zusammensetzen
	if (value == undefined) {
		value = "Für Feld " +  code.replace(/\\n/, '') + " wurde kein Eintrag hinterlegt";
		code = '\\nxxxx';
	}
    var line = code + " " + value.trim().replace(/"/g, '\\"').replace(/“/g, '\\"').replace(/”/g, '\\"').replace(/„/g, '\\"').replace('|s|RezensionstagPica', '').replace(/\t/g, '').replace(/\t/g, '').replace(/\|s\|peer\s?reviewed?/i, '|f|Peer reviewed').replace(/\|s\|book\s+reviews?/i, '|f|Book Reviews').replace('|f|Book Reviews, Book Review', '|f|Book Reviews').replace(/\|s\|#n/gim, '|f|Norm').replace(/\|s\|#r/gim, '|f|Rechtsprechung').replace('|s|Peer reviewed','|f|Peer reviewed').replace(/!([^0-9]+)!/g, '$1').replace('|s|17can', '|t|Codex Iuris Canonici (1917)').replace('|s|can', '|t|Codex Iuris Canonici (1983)').replace('|s|cceo','|t|Codex canonum ecclesiarum orientalium').replace('https://doi.org/https://doi.org/', 'https://doi.org/').replace(/@\s/, '@');
    itemsOutputCache[itemid].push(line);
}

// this should be called at end of each element,
// and also when all async calls are finished (only when runningThreadCount == 0)
function WriteItems() {
	var batchUpload = false;
	if (itemsOutputCache.length > 1) batchUpload = true;
	let errorString = "";
    itemsOutputCache.forEach(function(element, index) {
        // sort first, codes might be unsorted due to async stuff
        element.sort();
		//remove sorting characters from fields 3000 and 3010
		var cleanElement = [];
		for (let line of element) {
			let toDelete = line.match(/30\d{2}( ##\d{3}##)/);
			if (toDelete != null) {
				line = line.replace(toDelete[1], '');
			}
			if (line.match(/\\nxxxx /) != null) {
				errorString += line.substring(7, line.length) + '\\n';
			}
			cleanElement.push(line);
		}
        // implode + write
        if(index > 0) {
            Zotero.write("\n");
        }
		if (batchUpload) {
			let writeString = cleanElement.join("").replace("n66999E", "nE");
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
			elementString = elementString.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace('66999', '');
			Zotero.write(elementString);
		}
    });
}

function performExport() {
    Z.debug("Begin exporting item(s)...");

    var item;
	while ((item = Zotero.nextItem())) {
        currentItemId++;
        itemsOutputCache[currentItemId] = [];

		var physicalForm = "A";//0500 Position 1
		var licenceField = ""; // 0500 Position 4 only for Open Access Items; http://swbtools.bsz-bw.de/cgi-bin/help.pl?cmd=kat&val=4085&regelwerk=RDA&verbund=SWB
		var SsgField = "";
		var superiorPPN = "";
		var journalTitlePPN = "";
		var issn_to_language = "";
		var checkPPN = "";
		//var retrieve_sign = "";
		if (!item.ISSN)
				item.ISSN = "";
		//item.ISSN = ZU.cleanISSN(item.ISSN);
		Z.debug("Item ISSN: " + item.ISSN);
		//enrich items based on their ISSN
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
			Z.debug("Found ssg:" + SsgField);
		}
		if (issn_to_ssg_zotkat.get(item.publicationTitle) !== undefined) {
			SsgField = issn_to_ssg_zotkat.get(item.publicationTitle);
			Z.debug("Found ssg:" + SsgField);
		}
		if (issn_to_physical_form.get(item.publicationTitle) !== undefined) {
			checkPPN = issn_to_physical_form.get(item.publicationTitle);
			Z.debug("Found checkPPN:" + checkPPN);
		}
		if (!item.volume && issn_to_volume.get(item.ISSN) !== undefined) {
			item.volume = issn_to_volume.get(item.ISSN) + item.volume;
			Z.debug("Found volume:" + item.volume);
		}
		if (issn_to_physical_form.get(item.ISSN) !== undefined) {
			physicalForm = issn_to_physical_form.get(item.ISSN); // position 1 http://swbtools.bsz-bw.de/winibwhelp/Liste_0500.htm
			Z.debug("Found physicalForm:" + physicalForm);
		}
		if (issn_to_physical_form.get(item.publicationTitle) !== undefined) {
			physicalForm = issn_to_physical_form.get(item.publicationTitle); // position 1 http://swbtools.bsz-bw.de/winibwhelp/Liste_0500.htm
			Z.debug("Found physicalForm:" + physicalForm);
		}
		if (issn_to_license.get(item.ISSN) !== undefined) {
			licenceField = issn_to_license.get(item.ISSN); // position 4 http://swbtools.bsz-bw.de/winibwhelp/Liste_0500.htm
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
			Z.debug("Found journalTitlePPN:" + physicalForm);
        }
		/*if (issn_to_retrieve_sign.get(item.ISSN) != undefined) {
			retrieve_sign = issn_to_retrieve_sign.get(item.ISSN);
			Z.debug("Found retrieve_sign:" + retrieve_sign);
		}*/


		var article = false;
		switch (item.itemType) {
			case "journalArticle":
			case "bookSection":
			case "magazineArticle": // wird bei der Erfassung von Rezensionen verwendet. Eintragsart "Magazin-Artikel" wird manuell geändert.
			case "newspaperArticle":
			case "encyclopediaArticle":
				article = true;
				break;
		}

		//item.type --> 0500 Bibliographische Gattung und Status K10Plus: 0500 das "o" an der 2. Stelle muss in ein "s" geändert werden
		//http://swbtools.bsz-bw.de/winibwhelp/Liste_0500.htm
		switch (true) {
			case physicalForm === "A":
				addLine(currentItemId, '\\n0500', physicalForm+"s"+cataloguingStatus);
				break;
			case physicalForm === "O": // 0500 das "l" an der vierten Stelle entfällt, statt dessen wird $4LF in 4950 gebildet
				addLine(currentItemId, '\\n0500', physicalForm+"s"+cataloguingStatus);
				break;
			case physicalForm === "O" && licenceField === "kw":
				addLine(currentItemId, '\\n0500', physicalForm+"s"+cataloguingStatus);
				break;
			case item.itemType == "bookSection":
				addLine(currentItemId, '\\n0500', physicalForm+"s"+cataloguingStatus);
			default:
				addLine(currentItemId, '\\n0500', undefined);
			}
        //item.type --> 0501 Inhaltstyp
        addLine(currentItemId, "\\n0501", "Text$btxt");

        //item.type --> 0502 Medientyp
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

        //item.type --> 0503 Datenträgertyp
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
		
		/*if (retrieve_sign == "BILDI") {
			addLine(currentItemId, "\\n0575", "BIIN");
		}
		else if (retrieve_sign == "KALDI") {
			addLine(currentItemId, "\\n0575", "KALD");
		}
		else if (retrieve_sign == "DAKR") {
			addLine(currentItemId, "\\n0575", "DAKR");
		}*/
		
		// 0575 DAKR
		addLine(currentItemId, "\\n0575", "DAKR");
		
        //item.date --> 1100
        var date = Zotero.Utilities.strToDate(item.date);
        if (date.year !== undefined) {
            addLine(currentItemId, "\\n1100", date.year.toString());
        }

        //1131 Art des Inhalts
		if (item.title.match(/^\[?Rezension\s?von/)) {
				addLine(currentItemId, "\\n1131", "!106186019!");
		}
		
        //item.language --> 1500 Sprachcodes
		if (item.itemType == "journalArticle" || item.itemType == "magazineArticle" || item.itemType == "bookSection") {
            if (language_to_language_code.get(item.language)) {
                item.language = language_to_language_code.get(item.language);
            }
            addLine(currentItemId, "\\n1500", item.language);
        } else {
			item.language = issn_to_language_code.get(item.language);
            addLine(currentItemId, "\\n1500", item.language);
        }

        //1505 Katalogisierungsquelle
        addLine(currentItemId, "\\n1505", "$erda");

        //item.ISBN --> 2000 ISBN
        if (item.ISBN) {
            addLine(currentItemId, "\\n2000", item.ISBN);
        }

		//item.DOI --> 2051 bei "Oou" bzw. 2053 bei "Aou"
        if (item.DOI) {
            if (physicalForm === "O" || item.DOI) {
                addLine(currentItemId, "\\n2051", item.DOI.replace('https://doi.org/', ''));
            } else if (physicalForm === "A") {
                addLine(currentItemId, "\\n2053", item.DOI.replace('https://doi.org/', ''));
            }
        }

        //Autoren --> 3000, 3010
        //Titel, erster Autor --> 4000
        var titleStatement = "";
        if (item.shortTitle == "journalArticle") {
            titleStatement += item.shortTitle;
            if (item.title && item.title.length > item.shortTitle.length) {
                titleStatement += ZU.unescapeHTML(item.title.substr(item.shortTitle.length));
            }
        } else {
            titleStatement += item.title;//.replace(/:(?!\d)\s*/,'$d');
        }
        //Sortierzeichen hinzufügen, vgl. https://github.com/UB-Mannheim/zotkat/files/137992/ARTIKEL.pdf
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

        var i = 0;
        var creator;
        while (item.creators.length>0) {
            creator = item.creators.shift();

            if (creator.creatorType == "author") {
                var authorName = creator.lastName + (creator.firstName ? ", " + creator.firstName : "");

                var code = 0;
                if (i === 0) {
					//wenn die "ISSN_to_physical_form.map" die PPN des Publikation-Zoterofeldes enthält UND das ISSN-Zoterofeld leer ist, wird das Autorenfeld als Körperschaft ins 3100-Feld exportiert. Bei Amtsblättern werden im Autorenfeld grundsätzlich PPN eines Körperschaftnamens eingetragen: 30xx-Felder fürs Amtsblatt > 3100, ansonsten als Default für Zeitschrift > 3000 
					if (checkPPN === "O" || checkPPN === "A" && item.ISSN.length == 0){
						code = "\\n3100";
						titleStatement;
					} 
					else {
						code = "\\n3000";
						titleStatement;
					}
                } else {
					if (checkPPN === "O" || checkPPN === "A" && item.ISSN.length == 0){
						code = "\\n3110";
					} else {
						code = "\\n3010";	
					}
                }

                i++;

                //Lookup für Autoren
                if (authorName[0] != "!") {
                    var lookupUrl = "https://swb.bsz-bw.de/DB=2.104/SET=70/TTL=1/CMD?SGE=&ACT=SRCHM&MATCFILTER=Y&MATCSET=Y&NOSCAN=Y&PARSE_MNEMONICS=N&PARSE_OPWORDS=N&PARSE_OLDSETS=N&IMPLAND=Y&NOABS=Y&ACT0=SRCHA&SHRTST=50&IKT0=3040&TRM0=" + authorName + "&ACT1=*&IKT1=2057&TRM1=*&ACT2=*&IKT2=8991&TRM2=(theolog*|neutestament*|alttestament*|kirchenhist*)&ACT3=-&IKT3=8991&TRM3=1[0%2C1%2C2%2C3%2C4%2C5%2C6%2C7][0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9][0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9]"

                    /*
                    lookupUrl kann je nach Anforderung noch spezifiziert werden, im obigen Abfragebeispiel:
                    suchen [und] (Person(Phrase: Nachname, Vorname) [PER]) " authorName "
                    eingrenzen (Systematiknummer der SWD [SN]) *
                    eingrenzen (Relationiertes Schlagwort in der GND [RLS]) theolog*
                    ausgenommen (Relationierte Zeit in der GND [RLZ]) 1[1,2,3,4,5,6,7,8][0,1,2,3,4,5,6,7,8,9][0,1,2,3,4,5,6,7,8,9]

                    IKT0=1 TRM0= für Persönlicher Name in Picafeld 100
                    IKT1=2057 TRM1=3.* für GND-Systematik
                    IKT2=8963 TRM2=theolog*    für Berufsbezeichnung 550
                    IKT3=8991 TRM3=1[1,2,3,4,5,6,7,8][0,1,2,3,4,5,6,7,8,9][0,1,2,3,4,5,6,7,8,9] für Geburts- und Sterbedatum (Bereich)

                    ###OPERATOREN vor "IKT"###
                    UND-Verknüpfung "&" | ODER-Verknüpfung "%2B&" | Nicht "-&"

                    ###TYP IKT=Indikatoren|Zweite Spalte Schlüssel(IKT)###
                    Liste der Indikatoren und Routine http://swbtools.bsz-bw.de/cgi-bin/help.pl?cmd=idx_list_typ&regelwerk=RDA&verbund=SWB
                    */

                    // threadParams = globale Variablen die sich evtl ändern
                    // während die async-Funktion processDocumentsCustom ausgeführt wird
                    // und daher per Kopie übergeben werden müssen
                    var threadParams = {
                        "currentItemId" : currentItemId,
                        "code" : code,
                        "authorName" : authorName,
                    };

                    runningThreadCount++;
                    processDocumentsCustom(lookupUrl,
                        // processing callback function
                        function(doc, url, threadParams){
                            var ppn = Zotero.Utilities.xpathText(doc, '//small[a[img]]');
                            if (ppn) {
                                var authorValue = "!" + ppn.match(/^\d+X?/) + "!" + "$BVerfasserIn$4aut" + "\\n8910 $aixzom$bAutor in der Zoterovorlage ["  + threadParams["authorName"] + "] maschinell zugeordnet\\n";
                                addLine(threadParams["currentItemId"], threadParams["code"], authorValue);
                            } else if (threadParams["authorName"].match(/^\d+/g)){
								addLine(threadParams["currentItemId"], threadParams["code"],  "!" + threadParams["authorName"] + "!$BVerfasserIn$4aut");
							} else if (threadParams["authorName"].match(/^\w+/g)){
                                addLine(threadParams["currentItemId"], threadParams["code"], threadParams["authorName"] + "$BVerfasserIn$4aut");
                            }

                            // separate onDone function not needed because we only call one url
                            runningThreadCount--;
                            if (runningThreadCount === 0) {
                                for (key in authorMapping) {
                                    var value = authorMapping[key];
                                }
                                WriteItems();
                            }
                        },
                        threadParams,
                        //onDone
                        undefined,
                        //onError
                        function(e) {
                            var message = "Error in external lookup: " + e.message;
                            Zotero.debug(message);
                            Zotero.write(message);
                        }
                    );
                }
            }
            //TODO: editors, other contributors...
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


        //volumeyearissuepage -->4070 
        if (item.itemType == "journalArticle" || item.itemType == "magazineArticle") {
            var volumeyearissuepage = "";
			if (item.volume) { volumeyearissuepage += "$v" + item.volume.replace("Tome ", "").replace(/\s\(Number\s\d+-?\d+\)/, "").replace(/^\d.\w..\s\w\w.\s/, ""); }
			if (date.year !== undefined) { volumeyearissuepage +=  "$j" + date.year; }
			if (item.issue) { volumeyearissuepage += "$a" + item.issue.replace("-", "/").replace(/^0/, ""); }
			if (item.pages) { volumeyearissuepage += "$p" + item.pages; }

            addLine(currentItemId, "\\n4070", volumeyearissuepage);
        }

        //URL --> 4950 nur bei Dokumenttyp "magazineArticle" für Rezension 
        if (item.url && item.itemType == "magazineArticle") {
            addLine(currentItemId, "\\n4950", item.url + "$xR");
        }

		//URL --> 4950 nur bei Satztyp "O.." im Feld 0500
		switch (true) {
			case item.url && item.url.match(/doi\.org\/10\./) && physicalForm === "O" && licenceField === "l": 
				addLine(currentItemId, "\\n4950", item.url + "$xR$3Volltext$4LF$534");
				break;
			case item.url && !item.url.match(/doi\.org\/10\./) && physicalForm === "O" && licenceField === "l": 
				addLine(currentItemId, "\\n4950", item.url + "$xH$3Volltext$4LF$534");
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

        //Reihe --> 4110
        /*if (!article) {
            var seriesStatement = "";
            if (item.series) {
                seriesStatement += item.series;
            }
            if (item.seriesNumber) {
                seriesStatement += " ; " + item.seriesNumber;
            }
            addLine(currentItemId, "\\n4110", seriesStatement);
        }*/

        //Inhaltliche Zusammenfassung --> 4207
        if (item.abstractNote) {
			item.abstractNote = ZU.unescapeHTML(item.abstractNote);
			addLine(currentItemId, "\\n4207", item.abstractNote.replace("", "").replace(/–/g, '-').replace(/&#160;/g, "").replace('No abstract available.', '').replace('not available', '').replace(/^Abstract\s?:?/, '').replace(/Abstract  :/, '').replace(/^Zusammenfassung/, '').replace(/^Summary/, ''));
        }
		//4261 Themenbeziehungen (Beziehung zu der Veröffentlichung, die beschrieben wird)|case:magazineArticle
		if (item.itemType == "magazineArticle" && item.ISSN) {
			if (item.publicationTitle) {
				addLine(currentItemId, "\\n4261", "Rezension von!" + item.publicationTitle + "!");
			}
			else if(item.publicationTitle == null) {
				addLine(currentItemId, "\\n4261", item.publicationTitle);//item.publicationTitle return undefined for warning message "Für Feld xxxx wurde kein Eintrag hinterlegt"
			}
		}
		
        //item.publicationTitle --> 4241 Beziehungen zur größeren Einheit
        if (item.itemType == "journalArticle" || item.itemType == "magazineArticle" || item.itemType == "bookSection") {
            if (superiorPPN.length != 0) {
                addLine(currentItemId, "\\n4241", "Enthalten in" + superiorPPN);
            } else if (item.publicationTitle.match(/^[0-9]/)) {
                addLine(currentItemId, "\\n4241", "Enthalten in!" + item.publicationTitle + "!");
            } else if (item.publicationTitle.match(/^[A-Z]|[a-z]/)) {
                addLine(currentItemId, "\\n4241", "Enthalten in" + item.publicationTitle);
            }

            //SSG bzw. FID-Nummer --> 5056 "0" = Religionwissenschaft | "1" = Theologie | "0$a1" = RW & Theol; mehrere SSG-Nummern werden durch $a getrennt

            if (SsgField === "1" ||SsgField === "0" || SsgField === "0$a1" || SsgField === "FID-KRIM-DE-21") {
                addLine(currentItemId, "\\n5056", SsgField);
            } else {
                addLine(currentItemId, "\\n5056", defaultSsgNummer);
            }
			
			//Schlagwörter aus einem Thesaurus (Fremddaten) --> 5520 (oder alternativ siehe Mapping)
			if (item.extra){
				var parts = item.extra.replace(/#r\n/, '#r@').replace(/#n\n/, '#n@').replace(/\n|\t/g, '').trim().split("@");
				//das Jahr automatisch hochzählen
				let year = new Date();
				let lastTwoDigitYear = year.getFullYear().toString().substr(-2);
					for (index in parts){
					addLine(currentItemId, "\\n5520", "|s|" + parts[index].trim() + '$ADE-Tue135-3/' + lastTwoDigitYear + '-fid1-DAKR-MSZK');
				}
			}

            // Einzelschlagwörter (Projekte) --> 5580 
            if (issn_to_keyword_field.get(item.ISSN) !== undefined) {
                var codeBase = issn_to_keyword_field.get(item.ISSN);
                for (i=0; i<item.tags.length; i++) {
                    var code = codeBase + i;
                    addLine(currentItemId, code, "!" + item.tags[i].tag.replace(/\s?--\s?/g, '@ ') + "!");
                }
            } else {
                for (i=0; i<item.tags.length; i++) {
                    addLine(currentItemId, "\\n5580", "!" + ZU.unescapeHTML(item.tags[i].tag.replace(/\s?--\s?/g, '@ ')) + "!");
                }
            }
						
			// Urheberkennung --> 5580
			if(item.tags.length) {
				//das Jahr automatisch hochzählen
				let year = new Date();
				let lastTwoDigitYear = year.getFullYear().toString().substr(-2);
				addLine(currentItemId, "\\n5580", "$ADE-Tue135-3/" + lastTwoDigitYear + "-fid1-DAKR-MSZK");
			}
			
			// Exemplardatensatz
			addLine(currentItemId, "\\n66999E* l01", "");
			//notes > IxTheo-Notation K10plus: 6700 wird hochgezählt und nicht wiederholt, inkrementell ab z.B. 6800, 6801, 6802 etc.
			if (item.notes) {
				for (i in item.notes) {
					var note = ZU.unescapeHTML(item.notes[i].note)
                    var re = /\s*@\s*/;
					var notation_splits = note.replace(/^@/, '').split(re);
                    for (i in notation_splits) {
                        var notation = notation_splits[i].toLowerCase();
                        var notation_ppn = notes_to_ixtheo_notations.get(notation);
                        if (notation_ppn !== undefined) {
							var field = 670 + i
								 for (i=0; i<item.notes.length; i++) {
								addLine(currentItemId, '\\n'+field, notation_ppn);
							}
						}
					}
				}
			}
			
			//Signatur --> 7100
			addLine(currentItemId, '\\n7100', '$Jn');
			//Vierstellige, recherchierbare Abrufzeichen --> 8012
			addLine(currentItemId, '\\n8012 mszk', "");

        }
    }

    runningThreadCount--;
    if (runningThreadCount === 0) {
        WriteItems();
    }
    Z.debug("Done exporting item(s)!");
}

function doExport() {
	Z.debug("Populating ISSN mapping tables...");

	ZU.doGet([
            zts_enhancement_repo_url + "ISSN_to_keyword_field.map",
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
			//zts_enhancement_repo_url + "ISSN_to_Abrufzeichen_zotkat.map",
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