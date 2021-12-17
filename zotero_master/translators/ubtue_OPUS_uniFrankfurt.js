{
	"translatorID": "c6515b1f-1221-4c8e-828e-c8dac5baf988",
	"label": "ubtue_OPUS_uniFrankfurt",
	"creator": "Simon Kornblith, Sean Takats, Michael Berkowitz, Eli Osherovich, czar, Helena Nebel",
	"target": "publikationen\\.ub\\.uni-frankfurt\\.de",
	"minVersion": "3.0.12",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 12,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-12-17 14:47:20"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Simon Kornblith, Sean Takats, Michael Berkowitz, Eli Osherovich, czar

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	if (url.match(/index\/search\//)) {
		return getSearchResults(doc) ? "multiple" : false;
	}
	else if (url.match(/docId\//)) {
		return "journalArticle";
	}
	return false;
}

function getSearchResults(doc) {
	var resultsBlock = ZU.xpath(doc, "//a[contains(@href, '/frontdoor/index/index/docId/')]");
	if (!resultsBlock.length) return false;
	var items = {}, found = false;
	for (let i = 0; i < resultsBlock.length; i++) {
		let title = resultsBlock[i].textContent;
		let url = resultsBlock[i].href;
		found = true;
		items[url] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		Zotero.selectItems(getSearchResults(doc), function (selectedItems) {
			if (selectedItems) {
				for (var url in selectedItems) {
					let docId = url.match(/docId\/(.+)$/)[1];
					let risURL = 'http://publikationen.ub.uni-frankfurt.de/citationExport/index/download/output/ris/docId/' + docId;
					ZU.doGet(url, function (singleDoc) {
						var parser = new DOMParser();
						var singleDoc = parser.parseFromString(singleDoc, "text/html");
						scrape(risURL, singleDoc);
					});
					
				}
			}
		});
	}
	else {
		let docId = url.match(/docId\/(.+)$/)[1];
		let risURL = 'http://publikationen.ub.uni-frankfurt.de/citationExport/index/download/output/ris/docId/' + docId;
		scrape(risURL, doc);
		
	}
}

function scrape(risURL, doc) {
	ZU.doGet(risURL, function (text) {
			processRIS(text, doc);
		});
}

function convertCharRefs(string) {
	// converts hex decimal encoded html entities used by JSTOR to regular utf-8
	return string
		.replace(/&#x([A-Za-z0-9]+);/g, function (match, num) {
			return String.fromCharCode(parseInt(num, 16));
		});
}

function processRIS(text, doc) {
	// load translator for RIS
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	// Z.debug(text);
	
	// Reviews have a RI tag now (official RIS for Reviewed Item)
	var review = text.match(/^RI\s+-\s+(.+)/m);
	// sometimes we have subtitles stored in T1. These are part of the title, we want to add them later
	var subtitle = text.match(/^T1\s+-\s+(.+)/m);
	var maintitle = text.match(/^TI\s+-\s+(.+)/m);
	translator.setString(text);
	translator.setHandler("itemDone", function (obj, item) {
		// author names are not (always) supplied as lastName, firstName in RIS
		// we fix it here (note sure if still need with new RIS)
		item.notes = [];
		var m;
		for (var i = 0, n = item.creators.length; i < n; i++) {
			if (!item.creators[i].firstName
				&& (m = item.creators[i].lastName.match(/^(.+)\s+(\S+)$/))) {
				item.creators[i].firstName = m[1];
				item.creators[i].lastName = m[2];
				delete item.creators[i].fieldMode;
			}
		}
		
		// fix special characters in abstract, convert html linebreaks and italics, remove stray p tags; don't think they use anything else
		if (item.abstractNote) {
			item.abstractNote = convertCharRefs(item.abstractNote);
			item.abstractNote = item.abstractNote.replace(/<\/p><p>/g, "\n").replace(/<em>(.+?)<\/em>/g, " <i>$1</i> ").replace(/<\/?p>/g, "");
			item.abstractNote = item.abstractNote.replace(/^\[/, "").replace(/\]$/, "");
		}
		// Don't save HTML snapshot from 'UR' tag
		item.attachments = [];
		// not currently using but that's where the PDF link is
		// var pdfurl = attr('a[data-qa="download-pdf"]', 'href');
		// Books don't have PDFs
		if (/stable\/([a-z0-9.]+)/.test(item.url) & item.itemType != "book") {
			let pdfurl = "/stable/pdfplus/" + jid + ".pdf?acceptTC=true";
			item.attachments.push({
				url: pdfurl,
				title: "JSTOR Full Text PDF",
				mimeType: "application/pdf"
			});
		}

		if (item.ISSN) {
			item.ISSN = ZU.cleanISSN(item.ISSN);
		}
		else {
			if (item.publicationTitle.match('Journal of religious culture = Journal für Religionskultur') != null) {
				item.ISSN = '1434-5935';
			}
		}
		// Only the DOIs mentioned in RIS are valid, and we don't
		// add any other jid for DOI because they are only internal.
		
		if (maintitle && subtitle) {
			item.title = maintitle[1] + ": " + subtitle[1];
		}
		// reviews don't have titles in RIS - we get them from the item page
		if (!item.title && review) {
			var reviewedTitle = review[1];
			// A2 for reviews is actually the reviewed author
			var reviewedAuthors = [];
			for (i = 0; i < item.creators.length; i++) {
				if (item.creators[i].creatorType == "editor") {
					reviewedAuthors.push(item.creators[i].firstName + " " + item.creators[i].lastName);
					item.creators[i].creatorType = "reviewedAuthor";
				}
			}
			// remove any reviewed authors from the title
			for (i = 0; i < reviewedAuthors.length; i++) {
				reviewedTitle = reviewedTitle.replace(", "+reviewedAuthors[i], "");
			}
			item.title = "Review of " + reviewedTitle;
		}
		
		// titles may also contain escape characters
		item.title = convertCharRefs(item.title);
		item.url = item.url.replace('http:', 'https:'); // RIS still lists http addresses while JSTOR's stable URLs use https
		if (item.url && !item.url.startsWith("http")) item.url = "https://" + item.url;
		let URNs = text.match(/(urn:nbn:de:.+)\n/);
		if (URNs.length != 0) {
			item.notes.push(URNs[1]);
		}
		if (item.issue == undefined) {
			if (item.ISSN == '1434-5935') {
				
				if (item.series != undefined) {
					let issue = item.series.match(/(\d+).?$/);
					if (issue != null) {
						item.issue = issue[1];
					}
				}
			}
		}
		Z.debug(item.date);
		if (item.volume == undefined || item.volume == item.date) {
			item.volume = item.issue;
			if (item.ISSN == '1434-5935') {
				item.notes.push("artikelID:" + item.issue);
				item.volume = "";
			}
			item.issue = '';
		}
		let language = ZU.xpathText(doc, '//tr[contains(./th[@class="name"], "Sprache")]//td');
		let languages = {'Deutsch': 'ger', 'Englisch': 'eng', 'Französisch': 'fre', 
		'Italienisch': 'ita', 'Russisch': 'rus', 'Türkisch': 'tur', 'Sonstige': 'und'};
		if (language in languages) {
			item.language = languages[language];
		}
		let year = ZU.xpathText(doc, '//tr[contains(./th[@class="name"], "Jahr der Erst")]//td');
		item.date = year;
		let totalPages = ZU.xpathText(doc, '//tr[contains(./th[@class="name"], "Seitenzahl:")]//td');
		if (totalPages != null) {
			item.notes.push('seitenGesamt:' + totalPages);
		}
		// DB in RIS maps to archive; we don't want that
		delete item.archive;
		if (item.DOI || /DOI: 10\./.test(item.extra)) {
			finalizeItem(item);
		}
		else {
			item.complete();
		}
	});
		
	translator.getTranslatorObject(function (trans) {
		trans.doImport();
	});
}

function finalizeItem(item) {
	// Validate DOI
	let doi = item.DOI || item.extra.match(/DOI: (10\..+)/)[1];
	Zotero.debug("Validating DOI " + doi);
	// This just returns two lines of JSON
	ZU.doGet('https://doi.org/doiRA/' + encodeURIComponent(doi),
		function (text) {
			// Z.debug(text)
			try {
				var ra = JSON.parse(text);
				// Z.debug(ra[0].status)
				if (!ra[0] || ra[0].status == "DOI does not exist") {
					Z.debug("DOI " + doi + " does not exist");
					if (item.DOI) {
						delete item.DOI;
					}
					else {
						item.extra = item.extra.replace(/DOI: 10\..+\n?/, "");
					}
				}
			}
			catch (e) {
				if (item.DOI) {
					delete item.DOI;
				}
				else {
					item.extra.replace(/DOI: 10\..+\n?/, "");
				}
				Zotero.debug("Could not parse JSON. Probably invalid DOI");
			}
		}, function () {
			item.complete();
		}
	);
}
	

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://publikationen.ub.uni-frankfurt.de/solrsearch/index/search/searchtype/series/id/16137/start/0/rows/10/sortfield/year/sortorder/desc",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://publikationen.ub.uni-frankfurt.de/frontdoor/index/index/docId/59122",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Il pazzo uomo e il vecchio Dio : l'apocalisse dell'esistenza moderna secondo Friedrich Nietzsche",
				"creators": [
					{
						"lastName": "Weber",
						"firstName": "Edmund",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"ISSN": "1434-5935",
				"abstractNote": "Friedrich Nietzsche criticò l’ateismo astratto e la religione astratta come illusioni esistenziali e ricostruì la condizione originaria dell’esistenza umana.",
				"issue": "281",
				"language": "it",
				"libraryCatalog": "ubtue_OPUS_uniFrankfurt",
				"publicationTitle": "Journal of religious culture = Journal für Religionskultur",
				"series": "Journal of religious culture = Journal für Religionskultur - 281",
				"shortTitle": "Il pazzo uomo e il vecchio Dio",
				"url": "http://nbn-resolving.de/urn:nbn:de:hebis:30:3-591228",
				"volume": "2021",
				"attachments": [],
				"tags": [],
				"notes": [
					"urn:nbn:de:hebis:30:3-591228"
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
