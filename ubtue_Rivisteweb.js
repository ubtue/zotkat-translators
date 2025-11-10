{
	"translatorID": "4630e050-dbe9-49ce-bbda-72107ba27cd7",
	"label": "ubtue_Rivisteweb",
	"creator": "Timotheus Kim",
	"target": "https://www.rivisteweb.it/(doi|issn)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-02-28 07:15:31"
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
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

// alternative ris link: "https://www.rivisteweb.it/cite/$DOI/format/ris"

// attr()/text() v2
function attr(docOrElem ,selector ,attr ,index){ var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector); return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){ var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector); return elem?elem.textContent:null; }


function detectWeb(doc, url) {
	if (url.includes('/doi/')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.title > a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function romanToInt(r) {
    if (r.match(/^[IVXLCDM]+$/i)) {
        r = r.toUpperCase();
        const sym = { 
            'I': 1, 'V': 5, 'X': 10, 'L': 50, 
            'C': 100, 'D': 500, 'M': 1000
        };
        let result = 0;
        for (let i = 0; i < r.length; i++) {
            const cur = sym[r[i]];
            const next = sym[r[i+1]];
            if (cur < next) {
                result += next - cur;
                i++;
            } else {
                result += cur;
            }
        }
        return result; 
    }
    return r;
}

function decodeEntities(inputStr) {
	let textarea = document.createElement('textarea');
	textarea.innerHTML = inputStr;
	return textarea.value;
}

function cleanTags(tags) {
	return tags.map(tag => {
		let decodedTag = decodeEntities(tag);
		if (decodedTag.endsWith("–")) {
			decodedTag = decodedTag.slice(0, -1).trim();
		}
		if (decodedTag.endsWith('.')) {
			decodedTag = decodedTag.slice(0, -1).trim();
		}
		if (decodedTag.endsWith('"')) {
			decodedTag = decodedTag.slice(1, -1).trim();
		}
		return decodedTag;
	});
}

function getOrcids(doc, item) {
	let authors = doc.querySelectorAll('p.authors > a.author');
	authors.forEach(author => {
		let authorName = author.textContent.trim();
		let orcidElement = author.querySelector('i.bi-rw-orcid');
		if (orcidElement) {
			let orcid = orcidElement.getAttribute('title').match(/\d{4}-\d{4}-\d{4}-\d{3}[0-9X]/i);
			if (orcid) {
				item.notes.push("orcid: " + orcid[0] + ' | ' + authorName + ' | ' + 'taken from website');
			}
		}
	});
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); 	// Embedded Metadata
	translator.setHandler('itemDone', function (obj, item) {
		item.abstractNote = text(doc, 'p:nth-child(2)');
		
		item.title = decodeEntities(item.title);
		item.tags = cleanTags(item.tags);

		getOrcids(doc, item);

		if (item.volume.match(/[IVXLCDM]/)){
			item.volume = romanToInt(item.volume).toString();
		}

		let tagRegex = /mulino rivisteweb/i;
		item.tags = item.tags.filter(tag => !tagRegex.test(tag));

		if (item.abstractNote.match(/^la\spiattaforma\sitaliana|^the\sitalian\splatform/i)) {
			item.abstractNote = "";
		}

		if (item.title.match(/recensioni/i)) {
			item.tags.push('RezensionstagPica');
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "journalArticle";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.rivisteweb.it/doi/10.32052/95676",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Cristianizzazione e culture fra tarda antichità e alto medioevo",
				"creators": [
					{
						"firstName": "Luigi",
						"lastName": "Canetti",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.32052/95676",
				"ISSN": "2724-573X",
				"abstractNote": "The article emphasizes the need to find new epistemological categories in order to redefine the relationship between medieval history and religious history, which has been experiencing a crisis for almost forty years. After providing a broad historiographical overview and some concrete examples, the author suggests restarting from fields of research, such as the history of religions, ethno-linguistics, cognitive science and evolutionary biology, that have been able to underline the great heuristic potential in the study of religious experience on the basis of new explicative paradigms of cultural change.",
				"extra": "PMID: 95676",
				"issue": "2",
				"journalAbbreviation": "QM",
				"language": "it",
				"libraryCatalog": "www.rivisteweb.it",
				"pages": "237-265",
				"publicationTitle": "Quaderni di storia religiosa medievale",
				"url": "https://www.rivisteweb.it/doi/10.32052/95676",
				"volume": "22",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Cognitive Science"
					},
					{
						"tag": "Ethno-Linguistics"
					},
					{
						"tag": "History of Religions"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.rivisteweb.it/doi/10.32052/95677",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Culture popolari e dimensione religiosa",
				"creators": [
					{
						"firstName": "Marina",
						"lastName": "Montesano",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.32052/95677",
				"ISSN": "2724-573X",
				"abstractNote": "The concept of popular culture and that, closely linked to it, of popular religion have been discussed in many conferences and essays, especially since the Seventies. The historiographical discussion has taken place within a debate that had already involved philosophical, ethnographic and ethno-linguistic disciplines. This essay retraces its fortunes, dwelling on some of the most important contributions, and concludes discussing the fruitfulness and topicality of this issue.",
				"extra": "PMID: 95677",
				"issue": "2",
				"journalAbbreviation": "QM",
				"language": "it",
				"libraryCatalog": "www.rivisteweb.it",
				"pages": "267-281",
				"publicationTitle": "Quaderni di storia religiosa medievale",
				"url": "https://www.rivisteweb.it/doi/10.32052/95677",
				"volume": "22",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Folklore"
					},
					{
						"tag": "Popular Culture"
					},
					{
						"tag": "Religious Studies"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.rivisteweb.it/doi/10.32052/95686",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Temi e problemi della storiografia sul monachesimo latino nel Mezzogiorno dei secoli XI-XIII",
				"creators": [
					{
						"firstName": "Amalia",
						"lastName": "Galdi",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.32052/95686",
				"ISSN": "2724-573X",
				"abstractNote": "Latin monasticism, in all its aspects, has been one of the most widely studied historiographical subjects concerning Southern Italy during recent decades. New sources and new hermeneutic levels have made it possible to know more about this topic and, in particular, its peculiarities and its “inclusionµ within the Italian and European monastic context. This essay proposes a status quaestionis on the research into this subject and the historiographical discussion, which involves especially some monastic institutions (such as SS. Trinità di Cava, S. Maria di Montevergine and S. Maria di Pulsano) in Southern Italy from the 11th to the 13th century. In point of fact, they are characterized by common paths, such as their origins, yet also by later, different developments.",
				"extra": "PMID: 95686",
				"issue": "2",
				"journalAbbreviation": "QM",
				"language": "it",
				"libraryCatalog": "www.rivisteweb.it",
				"pages": "517-539",
				"publicationTitle": "Quaderni di storia religiosa medievale",
				"url": "https://www.rivisteweb.it/doi/10.32052/95686",
				"volume": "22",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Historiography"
					},
					{
						"tag": "Latin Monasticism"
					},
					{
						"tag": "Southern Italy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
