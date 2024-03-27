{
    "translatorID": "3422226d-9829-45ac-98a2-9a04aefc7f05",
        "label": "ubtue_Pica3",
        "creator": "Philipp Zumstein, Timotheus Kim, Mario Trojan, Madeeswaran Kannan, Johannes Ruscheinski, Helena Nebel",
        "target": "txt",
        "minVersion": "3.0",
        "maxVersion": "",
        "priority": 100,
        "inRepository": true,
        "translatorType": 2,
        "browserSupport": "gcs",
        "lastUpdated": "2024-03-27 17:07:00"
}

// Zotero Export Translator in Pica3 Format für das Einzeln- und Mulitiupload in WinIBW
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
var zts_enhancement_repo_url = 'https://raw.githubusercontent.com/ubtue/zotero-enhancement-maps/master/';
var downloaded_map_files = 0;
var max_map_files = 12;


/*
    The following maps DO NOT have a corresponding file in the zts_enhancement_maps repository.
    Until they are added somewhere online for downloading, we'll use the hardcoded maps that follow:
    */
// Mapping für JournalTitle missing ISSN >PPN

// Mapping JournalTitle>Language
var journal_title_to_language_code = {
    "Oriens Christianus" :"ger",
    "Ephemerides Theologicae Lovanienses" : "fre",
    "Science et Esprit" : "fre",
}

/* =============================================================================================================== */
// ab hier Programmcode
var defaultSsgNummer = undefined;
var defaultLanguage = "eng";

//lokaldatensatz z.B. \\n6700 !372049834!\\n6700 !37205241X!\\n6700 !372053025!\\n6700!37205319X!

//item.type --> 0500 Bibliographische Gattung und Status
//http://swbtools.bsz-bw.de/winibwhelp/Liste_0500.htm
// TODO: check if the folowing 3 variables are being used correctly
var cataloguingStatus = "n";//0500 Position 3
var cataloguingStatusO = "n";//0500 Position 3

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

var runningThreadCount = 1;
var currentItemId = -1;
var itemsOutputCache = []
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
    //if (value == undefined) {
    //Zotero.write('application.messageBox("Upload fehlgeschlagen", "Eintrag in Feldnummer ' + code + ' ist nicht definiert", "alert-icon")\n');
    //}


    //Zeile zusammensetzen
    if (value == undefined) {
        value = "Für Feld " +  code.replace(/\\n/, '') + " wurde kein Eintrag hinterlegt";
        code = '\\nxxxx';
    }
    var line = code + " " + value.trim().replace(/"/g, '\\"').replace(/“/g, '\\"').replace(/”/g, '\\"').replace(/„/g, '\\"').replace('|s|RezensionstagPica', '').replace(/\t/g, '').replace(/\t/g, '').replace(/\|s\|peer\s?reviewed?/i, '|f|Peer reviewed').replace(/\|s\|book\s+reviews?/i, '|f|Book Review').replace('|f|Book Reviews, Book Review', '|f|Book Review').replace('https://doi.org/https://doi.org/', 'https://doi.org/').replace(/@\s/, '@').replace('abs1:', '').replace('doi:https://doi.org/', '').replace('handle:https://hdl.handle.net/', '');
    itemsOutputCache[itemid].push(line);
}

// this should be called at end of each element,
// and also when all async calls are finished (only when runningThreadCount == 0)
function WriteItems() {
    var batchUpload = false;
    if (itemsOutputCache.length > 1) batchUpload = true;
    itemsOutputCache.forEach(function(element, index) {
        let errorString = "";
        // sort first, codes might be unsorted due to async stuff
        element.sort();
        //remove sorting characters from fields 3000 and 3010
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
        // implode + write
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


function performExport() {
    Z.debug("Begin exporting item(s)...");

    var item;
    while ((item = Zotero.nextItem())) {
        currentItemId++;
        itemsOutputCache[currentItemId] = [];

        var physicalForm = "";//0500 Position 1
        var licenceField = ""; // 0500 Position 4 only for Open Access Items; http://swbtools.bsz-bw.de/cgi-bin/help.pl?cmd=kat&val=4085&regelwerk=RDA&verbund=SWB
        var SsgField = "";
        var superiorPPN = "";
        var journalTitlePPN = "";
        var issn_to_language = "";
        var institution_retrieve_sign = "";
        var collection_code = "";
        var retrieve_sign = "";
        if (!item.ISSN)
            item.ISSN = "";
        if (item.ISSN.substring(0,4) != "IXTH") item.ISSN = ZU.cleanISSN(item.ISSN);
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
            physicalForm = issn_to_physical_form.get(item.ISSN); // position 1 http://swbtools.bsz-bw.de/winibwhelp/Liste_0500.htm
            Z.debug("Found physicalForm:" + physicalForm);
        }
		if (issn_to_physical_form.get(item.ISBN) !== undefined) {
            physicalForm = issn_to_physical_form.get(item.ISBN); // position 1 http://swbtools.bsz-bw.de/winibwhelp/Liste_0500.htm
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
            case physicalForm === "O" && licenceField === "l": // 0500 das "l" an der vierten Stelle entfällt, statt dessen wird $4LF in 4950 gebildet
                addLine(currentItemId, '\\n0500', physicalForm+"s"+cataloguingStatus);
                break;
            case physicalForm === "O" && licenceField === "kw":
                addLine(currentItemId, '\\n0500', physicalForm+"s"+cataloguingStatus);
                break;
            default:
                addLine(currentItemId, '\\n0500', physicalForm+"s"+cataloguingStatus); // //z.B. Aou, Oou, Oox etc.
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

        if (collection_code != "") {
            addLine(currentItemId, "\\n0575", collection_code);
        }
        //item.date --> 1100
        var date = Zotero.Utilities.strToDate(item.date);
        if (date.year !== undefined) {
            addLine(currentItemId, "\\n1100", date.year.toString());
        }

        //1130 Datenträger K10Plus:1130 alle Codes entfallen, das Feld wird folglich nicht mehr benötigt
        //http://swbtools.bsz-bw.de/winibwhelp/Liste_1130.htm

        /*switch (physicalForm) {
            case "A":
                addLine(currentItemId, "1130", "druck");
                break;
            case "O":
                addLine(currentItemId, "1130", "cofz");
                break;
            default:
                addLine(currentItemId, "1130", "");
        }*/

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

        // 1140 Veröffentlichungsart und Inhalt http://swbtools.bsz-bw.de/winibwhelp/Liste_1140.htm K10plus:1140 "uwre" entfällt. Das Feld wird folglich auch nicht mehr benötigt. Es sei denn es handelt sich um eines der folgenden Dokumente: http://swbtools.bsz-bw.de/cgi-bin/k10plushelp.pl?cmd=kat&val=1140&kattype=Standard
        /*if (item.itemType == "magazineArticle") {
            addLine(currentItemId, "1140", "uwre");
        }*/

        // 1140 text nur bei Online-Aufsätzen (Satztyp O), aber fakultativ
        /*if (physicalForm === "O") {
      addLine(currentItemId, "1140", "text");
    }*/

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


        //Autoren --> 3000, 3010
        //Titel, erster Autor --> 4000
        var titleStatement = "";
        if (item.shortTitle == "journalArticle") {
            titleStatement += item.shortTitle;
            if (item.title && item.title.length > item.shortTitle.length) {
                titleStatement += ZU.unescapeHTML(item.title.substr(item.shortTitle.length));
            }
        } else {
            titleStatement += item.title;
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
                    code = "\\n3000";
                    titleStatement;
                } else {
                    code = "\\n3010";
                }
                //preserve original index of Author
                let authorIndex = i.toString();
                let printIndex = authorIndex.padStart(3, '0');

                i++;

                //Lookup für Autoren
                if (authorName[0] != "!") {
                    if (institution_retrieve_sign == "krzo") {
                        var lookupUrl = "https://swb.bsz-bw.de/DB=2.104/SET=4/TTL=1/CMD?SGE=&ACT=SRCHM&MATCFILTER=Y&MATCSET=Y&NOSCAN=Y&PARSE_MNEMONICS=N&PARSE_OPWORDS=N&PARSE_OLDSETS=N&IMPLAND=Y&NOABS=Y&ACT0=SRCHA&SHRTST=50&IKT0=1&TRM0=" + authorName + "&ACT1=*&IKT1=2057&TRM1=*&ACT2=*&IKT2=8991&TRM2=*&ACT3=-&IKT3=8991&TRM3=1%5B0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%5D%5B0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%5D%5B0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%5D&SRT=RLV"
                    }
					else if (institution_retrieve_sign == "zojs") {
						var lookupUrl = "https://swb.bsz-bw.de/DB=2.104/SET=4/TTL=1/CMD?SGE=&ACT=SRCHM&MATCFILTER=Y&MATCSET=Y&NOSCAN=Y&PARSE_MNEMONICS=N&PARSE_OPWORDS=N&PARSE_OLDSETS=N&IMPLAND=Y&NOABS=Y&ACT0=SRCHA&SHRTST=50&IKT0=1&TRM0=" + "&ACT1=*&IKT1=2057&TRM1=*&ACT2=*&IKT2=8991&TRM2=*&ACT3=-&IKT3=8991&TRM3=1%5B0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%5D%5B0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%5D%5B0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%5D&SRT=RLV"
                    }
                    else var lookupUrl = "https://swb.bsz-bw.de/DB=2.104/SET=70/TTL=1/CMD?SGE=&ACT=SRCHM&MATCFILTER=Y&MATCSET=Y&NOSCAN=Y&PARSE_MNEMONICS=N&PARSE_OPWORDS=N&PARSE_OLDSETS=N&IMPLAND=Y&NOABS=Y&ACT0=SRCHA&SHRTST=50&IKT0=3040&TRM0=" + authorName + "&ACT1=*&IKT1=2057&TRM1=*&ACT2=*&IKT2=8991&TRM2=(theolog*|neutestament*|alttestament*|kirchenhist*)&ACT3=-&IKT3=8991&TRM3=1[0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8][0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9][0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9]"
                    /*
                    lookupUrl kann je nach Anforderung noch spezifiziert werden.
          Beispiel mit "Zenger, Erich"
          https://swb.bsz-bw.de/DB=2.104/SET=70/TTL=1/CMD?SGE=&ACT=SRCHM&MATCFILTER=Y&MATCSET=Y&NOSCAN=Y&PARSE_MNEMONICS=N&PARSE_OPWORDS=N&PARSE_OLDSETS=N&IMPLAND=Y&NOABS=Y&ACT0=SRCHA&SHRTST=50&IKT0=3040&TRM0=zenger, erich&ACT1=*&IKT1=2057&TRM1=*&ACT2=*&IKT2=8991&TRM2=(theolog*|neutestament*|alttestament*|kirchenhist*)&ACT3=-&IKT3=8991&TRM3=1[0%2C1%2C2%2C3%2C4%2C5%2C6%2C7][0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9][0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9]"

          Suchaktion im Katalog sieht wie folgt aus:

                    suchen [und] (Person(Phrase: Nachname, Vorname) [PER]) zenger, erich
          eingrenzen (Systematiknummer der SWD [SN]) *
          eingrenzen (Relationierter Normsatz in der GND [RL]) (theolog*|neutestament*|alttestament*|kirchenhist*)
          ausgenommen (Relationierter Normsatz in der GND [RL]) 1[0,1,2,3,4,5,6,7][0,1,2,3,4,5,6,7,8,9][0,1,2,3,4,5,6,7,8,9]

                    Aufbau des Lookup-URL:
          "IKT0=3040" Erster Suchaspekt mit Indikatorwert "1" (=Phrasensuche mit Nachname, Vorname)
          "TRM0=" Nach "=" kommt dann der Suchstring.
          ...

          IKT0=3040 TRM0= für Persönlicher Name in Picafeld 100
                    IKT1=2057 TRM1=3.* für GND-Systematik
                    IKT2=8963 TRM2=theolog*    für Berufsbezeichnung 550
                    IKT3=8991 TRM3=1[1,2,3,4,5,6,7,8][0,1,2,3,4,5,6,7,8,9][0,1,2,3,4,5,6,7,8,9] für Geburts- und Sterbedatum (Bereich)

                    ###OPERATOREN "ACT" vor "IKT"###
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
                            var ppn = Zotero.Utilities.xpathText(doc, '//div[a[img]]');
                            if (ppn && SsgField != "0" && institution_retrieve_sign != "krzo") {
                                var authorValue = "!" + ppn.match(/^\d+X?/) + "!" + "$BVerfasserIn$4aut" + "\\n8910 $aixzom$bAutor in der Zoterovorlage ["  + threadParams["authorName"] + "] maschinell zugeordnet\\n";
                                addLine(threadParams["currentItemId"], threadParams["code"] + ' ##' + printIndex + '##', authorValue);
                            }
                            else if (ppn && SsgField != "0") {
                                var authorValue = "!" + ppn.match(/^\d+X?/) + "!" + "$BVerfasserIn$4aut" + "\\n8910 $akrzom$bAutor in der Zoterovorlage ["  + threadParams["authorName"] + "] maschinell zugeordnet\\n";
                                addLine(threadParams["currentItemId"], threadParams["code"] + ' ##' + printIndex + '##', authorValue);
                            }
                            else if (institution_retrieve_sign == "itbk") {
                                if (threadParams["authorName"].match(/^\d+/)) {
                                addLine(threadParams["currentItemId"], threadParams["code"] + ' ##' + printIndex + '##', "!" + threadParams["authorName"] + "!" + "$BVerfasserIn$4aut");
                                }
                                else if(threadParams["authorName"].match(/^\w+/)) {
                                addLine(threadParams["currentItemId"], threadParams["code"] + ' ##' + printIndex + '##', threadParams["authorName"]  + "$BVerfasserIn$4aut"); 
                                }
                            }
							else if (institution_retrieve_sign == "zojs") {
                                if (threadParams["authorName"].match(/^\d+/)) {
                                addLine(threadParams["currentItemId"], threadParams["code"] + ' ##' + printIndex + '##', "!" + threadParams["authorName"] + "!" + "$BVerfasserIn$4aut" + "\\n8910 $azojsm$bAutor in der Zoterovorlage ["  + threadParams["authorName"] + "] maschinell zugeordnet\\n");
                                }
                                else if(threadParams["authorName"].match(/^\w+/)) {
                                addLine(threadParams["currentItemId"], threadParams["code"] + ' ##' + printIndex + '##', threadParams["authorName"]  + "$BVerfasserIn$4aut"); 
                                }
                            }
                            else {
                                addLine(threadParams["currentItemId"], threadParams["code"] + ' ##' + printIndex + '##', threadParams["authorName"]  + "$BVerfasserIn$4aut");
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
        }

        addLine(currentItemId, "\\n4000", ZU.unescapeHTML(titleStatement));
        //Paralleltitel --> 4002
        if (item.archiveLocation && item.ISSN == '2660-7743') {
            switch (true) {
                case item.language == "ger" || !item.language && item.archiveLocation:
                    addLine(currentItemId, "\\n4002", item.archiveLocation.replace(/^(Der|Die|Das|Des|Dem|Den|Ein|Eines|Einem|Eine|Einen|Einer) ([^@])/i, "$1 @$2").replace(/^([\u201e]|[\u201d]|[\u201c])(Der|Die|Das|Des|Dem|Den|Ein|Eines|Einem|Eine|Einen|Einer) ([^@])/i, "„$2 @$3"));
                    break;
                case item.language == "eng" || !item.language && item.archiveLocation:
                    addLine(currentItemId, "\\n4002", item.archiveLocation.replace(/^(The|A|An) ([^@])/i, "$1 @$2").replace(/^([\u201e]|[\u201d]|[\u201c])(The|A|An) ([^@])/i, "„$2 @$3"));
                    break;
                case item.language == "fre" || !item.language && item.archiveLocation:
                    addLine(currentItemId, "\\n4002", item.archiveLocation.replace(/^(Le|La|Les|Des|Un|Une) ([^@])/i, "$1 @$2").replace(/^([\u201e]|[\u201d]|[\u201c])(Le|La|Les|Des|Un|Une) ([^@])/i, "„$2 @$3").replace(/^L'\s?([^@])/i, "L' @$1").replace(/^([\u201e]|[\u201d]|[\u201c])L'\s?([^@])/i, "„L' @$2"));
                    break;
                case item.language == "ita" || !item.language && item.archiveLocation:
                    addLine(currentItemId, "\\n4002", item.archiveLocation.replace(/^(La|Le|Lo|Gli|I|Il|Un|Una|Uno) ([^@])/i, "$1 @$2").replace(/^([\u201e]|[\u201d]|[\u201c])(La|Le|Lo|Gli|I|Il|Un|Una|Uno) ([^@])/i, "„$2 @$3").replace(/^L'\s?([^@])/i, "L' @$1").replace(/^([\u201e]|[\u201d]|[\u201c])L'\s?([^@])/i, "„L' @$2"));
                    break;
                case item.language == "por" || !item.language && item.archiveLocation:
                    addLine(currentItemId, "\\n4002", item.archiveLocation.replace(/^(A|O|As|Os|Um|Uma|Umas|Uns) ([^@])/i, "$1 @$2").replace(/^([\u201e]|[\u201d]|[\u201c])(A|O|As|Os|Um|Uma|Umas|Uns) ([^@])/i, "„$2 @$3"));
                    break;
                case item.language == "spa" || !item.language && item.archiveLocation:
                    addLine(currentItemId, "\\n4002", item.archiveLocation.replace(/^(El|La|Los|Las|Un|Una|Unos|Unas) ([^@])/i, "$1 @$2").replace(/^([\u201e]|[\u201d]|[\u201c])(El|La|Los|Las|Un|Una|Unos|Unas) ([^@])/i, "„$2 @$3"));
                    break;
            }
        }

        //Paralleltitel OJS --> 4002 
        //Übersetzung des Haupttitels --> 4212
        if (item.notes) {
            for (let i in item.notes) {
                if (item.notes[i].note.includes('Paralleltitel:')) addLine(currentItemId, "\\n4002", item.notes[i].note.replace(/paralleltitel:/i, ''));
                if (item.notes[i].note.includes('translatedTitle:')) addLine(currentItemId, "\\n4212 Übersetzung des Haupttitels: ", item.notes[i].note.replace(/translatedTitle:/i, ''));
            }
        }

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

            //SSG bzw. FID-Nummer --> 5056 "0" = Religionwissenschaft | "1" = Theologie | "0; 1" = RW & Theol.

            if (SsgField === "1" || SsgField === "0" || SsgField === "0$a1" || SsgField === "2,1") { 
                addLine(currentItemId, "\\n5056", SsgField);
            } 
            else if (SsgField == "NABZ" || institution_retrieve_sign == "zojs") {
                addLine(currentItemId, "\\n5056", '');
            }
            else {
                addLine(currentItemId, "\\n5056", defaultSsgNummer);
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
                if (SsgField == "NABZ") {
                    addLine(currentItemId, '\\nE* l01\\n7100$Jn\\n8012 ixzs$aixzo$aNABZ' + localURL, ""); 
                }
                else addLine(currentItemId, '\\nE* l01\\n7100$Jn\\n8012 ixzs$aixzo' + localURL, "");
            }
            else if (institution_retrieve_sign == "inzo") {
                if (SsgField == "NABZ") {
                    addLine(currentItemId, '\\nE* l01\\n7100$Jn\\n8012 inzs$ainzo$aNABZ' + localURL, ""); 
                }
                else addLine(currentItemId, '\\nE* l01\\n7100$Jn\\n8012 inzs$ainzo' + localURL, "");
            }
            else if (institution_retrieve_sign == "krzo") {
                if (SsgField == "NABZ") {
                    addLine(currentItemId, '\\nE* l01\\n7100$Jn\\n8012 krzo$aNABZ' + localURL, ""); 
                }
                else addLine(currentItemId, '\\nE* l01\\n7100$Jn\\n8012 krzo' + localURL, "");
            }
             else if (institution_retrieve_sign == "itbk") {
                    addLine(currentItemId, '\\nE* l01\\n7100$Jn\\n8012 itbk$aixrk$aixzs$aixzo' + localURL, ""); 
            } else if (institution_retrieve_sign == "zojs") {
					addLine(currentItemId, '\\nE* l01\\n4801 Der Zugriff ist kostenfrei möglich\\n7100 $B21\\n8012 fauf$auwzs$azojs' + localURL, "");
		   }

            //K10plus:das "j" in 7100 $jn wird jetzt groß geschrieben, also $Jn / aus 8002,  dem Feld für die lokalen Abrufzeichen, wird 8012/ 8012 mehrere Abrufzeichen werden durch $a getrennt, nicht wie bisher durch Semikolon. Also: 8012 ixzs$aixzo
            //Schlagwörter aus einem Thesaurus (Fremddaten) --> 5520 (oder alternativ siehe Mapping)

            for (i=0; i<item.tags.length; i++) {
                addLine(currentItemId, "\\n5520", " " + ZU.unescapeHTML(item.tags[i].tag.replace(/\s?--\s?/g, '; ')));
            }
            //notes > IxTheo-Notation K10plus: 6700 wird hochgezählt und nicht wiederholt, inkrementell ab z.B. 6800, 6801, 6802 etc.
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
                            for (i=0; i<item.notes.length; i++) {
                                addLine(currentItemId, '\\n'+field, notation_ppn);
                            }
                        }
                    }
                }
            }
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



