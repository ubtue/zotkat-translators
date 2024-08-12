{
	"translatorID": "fe599ece-9d17-4493-9f7a-81cfbdbf5909",
	"label": "ubtue_AUP",
	"creator": "Helena Nebel",
	"target": "aup-online.com\\/content\\/journals\\/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-08-12 12:07:14"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Universitätsbibliothek Tübingen.  All rights reserved.

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


function detectWeb(doc, url) {
	// except for "multiple", the return values of this function are placeholders that
	// will be replaced by the Embedded Metadata translator's results
	if (/\/\d{2}\.\d{4}\/.+/.test(url))
		return "journalArticle";
	else if (/\/\d{7}(\d|x|X)\//.test(url))
		return "multiple";
}

function getSearchResults(doc) {
	//hier weiter
	let items = {};
	let found = false;
	let rows = ZU.xpath(doc, '//div[@class="issuecontents row"]//span[contains(concat(" ", @class, " "), " articleTitle ")]//a');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		if (href.match(/\/\d{2}\.\d{4}\//)) {
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
		}
	}
	return found ? items : false;
}

function getOrcids(doc, item) {
    let authors = ZU.xpath(doc, '//li[contains(@class,"data-author")]//a[@class="nonDisambigAuthorLink"]');
    for (author of authors) {
        let authorName = ZU.xpathText(author, '.');
        if (!authorName)
            continue;
        let orcidUrl = ZU.xpath(author, './following-sibling::a/@href');
        if (!orcidUrl || !orcidUrl.length)
             continue;
        let orcidNumber = orcidUrl[0].value.match(/\d+-\d+-\d+-\d+x?/i);
        if (!orcidNumber)
             continue;
	item.notes.push("orcid: " + orcidNumber + ' | ' + authorName.trim() + ' | ' + 'taken from website');
    }
}

function postProcess(item, doc) {
	item.itemType = 'journalArticle';

	let title = doc.querySelector('meta[name="citation_title"]');
	if (title) {
		item.title = title.getAttribute('content');
	}

	let primaryISSN = doc.querySelector('meta[name="citation_issn"]');
	if (primaryISSN) {
		item.ISSN = primaryISSN.getAttribute('content');
	}

	let doi = doc.querySelector('meta[name="citation_doi"]');
	if (doi) {
		item.DOI = doi.getAttribute('content');
	}

	item.creators = [];
	let citationAuthors = doc.querySelectorAll('meta[name="citation_author"]');
	for (let citationAuthor of citationAuthors) {
		let author = citationAuthor.getAttribute('content');
		item.creators.push(ZU.cleanAuthor(author, "author", false));
	}

	let reviewTitles = ["boekbesprekingen", "reviews"];
	let titleISBN = /\bISBN\s+\d+\b/;
	if (reviewTitles.includes(item.title.toLowerCase().trim()) || item.title.match(titleISBN)) {
		item.tags.push("RezensionstagPica");
	}

	let firstPageElement = doc.querySelector('meta[name="citation_firstpage"]');
	let lastPageElement = doc.querySelector('meta[name="citation_lastpage"]');
	
	let firstPage = firstPageElement ? firstPageElement.getAttribute('content') : null;
	let lastPage = lastPageElement ? lastPageElement.getAttribute('content') : null;
	
	if (firstPage !== lastPage) {
		item.pages = firstPage + '-' + lastPage;
		} else if (firstPage == lastPage || lastPage == null) {
		item.pages = firstPage
	}

	let keywordTags = ZU.xpath(doc, '//div[@class="bottom-side-nav"]/a[@title]');
	for (let i in keywordTags) {
		item.tags.push(keywordTags[i].textContent);
	}

	item.abstractNote = item.abstractNote.replace(/^Abstract /, '');
	item.abstractNote = item.abstractNote.replace(/^Summary /, '');
	getOrcids(doc, item);
	item.complete();
}

function invokeEmbeddedMetadataTranslator(doc) {
	let translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(i, doc);
	});
	translator.translate();
}

function scrape(doc, url) {
	let content = doc.contentDocument;
	invokeEmbeddedMetadataTranslator(doc);
}
function doWeb(doc, url) {
	Z.debug(detectWeb(doc, url));
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			let articles = [];
			for (let i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else
		scrape(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.aup-online.com/content/journals/07788304/29/2",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.aup-online.com/content/journals/10.5117/TRA2020.2.002.SCHL",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Decentering the Status Quo: The Rhetorically Sanctioned Political Engagement of Groen van Prinsterer",
				"creators": [
					{
						"firstName": "Jan Adriaan",
						"lastName": "Schlebusch",
						"creatorType": "author"
					}
				],
				"date": "2020/12/01",
				"DOI": "10.5117/TRA2020.2.002.SCHL",
				"ISSN": "0778-8304, 2665-9484",
				"abstractNote": "In his strategic political positioning and engagement in the nineteenth century, Groen van Prinsterer looked towards both the past and the future. Rhetorically, he appealed to the past as a vindication of the truth and practicality of his anti-revolutionary position. He also expressed optimism for the success of his convictions and political goals in the future. This optimism was reflected in the confidence with which he engaged politically, despite experiencing numerous setbacks in his career. Relying on the phenomenological-narrative approach of David Carr, I highlight the motives and strategies behind Groen’s political activity, and reveal that the past and the future in Groen’s narrative provide the strategic framework for his rhetoric, and the basis for his activism. I accentuate how the emphasis of his narrative shifts away from the status quo and thus enables a type of political engagement that proved historically significant for the early consolidation of the Dutch constitutional democracy.",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "www.aup-online.com",
				"pages": "141-159",
				"publicationTitle": "Trajecta",
				"shortTitle": "Decentering the Status Quo",
				"url": "https://www.aup-online.com/content/journals/10.5117/TRA2020.2.002.SCHL",
				"volume": "29",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "David Carr"
					},
					{
						"tag": "Groen van Prinsterer"
					},
					{
						"tag": "anti-revolutionary"
					},
					{
						"tag": "constitutional democracy"
					},
					{
						"tag": "narrative"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
