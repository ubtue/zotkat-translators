{
	"translatorID": "0491ef5e-f600-4886-b567-1774d22b3dbf",
	"label": "ubtue_OPUS_uniAugsburg",
	"creator": "Mara Spieß",
	"target": "(opus\\.bibliothek)?\\.uni-augsburg\\.de",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-05-14 08:30:31"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Universitätsbibliothek Tübingen

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
	if (url.match(/https:\/\/www.uni-augsburg.de/)) {
		return getSearchResults(doc) ? "multiple" : false;
	}
	else if (url.match(/docId\//)) {
		return "journalArticle";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.container > div.row');
	for (let row of rows) {
		let hrefElement = row.querySelector('a[href*="https://nbn-resolving.org/urn:"]');
		let titleElement = row.querySelector('div.col-10');
		if (!hrefElement || !titleElement) continue;

		let href = hrefElement.getAttribute('href');
		let title = ZU.trimInternal(titleElement.textContent);
		if (!href || !title) continue;

		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}
async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

function getOrcids (doc, item) {
	for (let authorTag of ZU.xpath(doc, "//th[@class='name' and text()='Verfasserangaben:']/following-sibling::td")) {
		let authorLinks = ZU.xpath(authorTag, ".//a[contains(@href, '/authorsearch/author/')]");
		let orcidLinks = ZU.xpath(authorTag, ".//a[@class='orcid-link']");
		for (let i = 0; i < authorLinks.length; i++) {
			let authorName = authorLinks[i].textContent.trim();
			let orcidLink = orcidLinks[i] ? orcidLinks[i].getAttribute('href') : null;

			if (orcidLink) {
				let orcid = orcidLink.replace(/https:\/\/orcid.org\//, "");
				item.notes.push(authorName + ' | orcid:' + orcid + ' | taken from website');
			}
		}
	}
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {

		getOrcids (doc, item);

		if (item.abstractNote) {
			item.abstractNote = item.abstractNote.replace(/\n/g, " ");
		}
		
		let urnElement = doc.querySelector('meta[name="DC.identifier"][content^="urn:"], meta[name="DC.Identifier"][content^="urn:"]');
		if (urnElement) {
			item.notes.push(urnElement.getAttribute('content'));
		}

		let firstPage = "";
		let lastPage = "";

		let trElements = doc.querySelectorAll('tbody > tr');

		trElements.forEach(trElement => {
			let thElement = trElement.querySelector('th.name');
			
			if (!thElement) return;
			
			let elementName = thElement.textContent;
			let tdElement = trElement.querySelector('td');
			
			if (!tdElement) return;
			
			let tdContent = tdElement.textContent;

			if (elementName.match(/jahrgang/i)) {
				let volumeMatch = tdContent?.match(/band\s(\d+\/?\d+)\s\(\d{4}\/?(?:\d{4})?\)/i);
				if (volumeMatch?.[1]) {
					item.volume = volumeMatch[1];
				}
			} else if (elementName.match(/issn/i)) {
				let issnMatch = tdContent?.match(/\d{4}-\d{4}/);
				if (issnMatch?.[0]) {
					item.ISSN = issnMatch[0];
				}
			} else if (elementName.match(/erste\sseite/i)) {
				let firstPageMatch = tdContent?.match(/^(\d+)/);
				if (firstPageMatch?.[1]) {
					firstPage = firstPageMatch[1];
				}
			} else if (elementName.match(/letzte\sseite/i)) {
				let lastPageMatch = tdContent?.match(/^(\d+)/);
				if (lastPageMatch?.[1]) {
					lastPage = lastPageMatch[1];
				}
			}	
		});

		if (firstPage && lastPage) {
			if (firstPage !== lastPage) {
				item.pages = firstPage + "-" + lastPage;
			} else {
				item.pages = firstPage;
			}
		} 
		
		item.complete();
	});

	let em = await translator.getTranslatorObject();

	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/119049",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Persönliche Eigenschaften mit Störpotenzial?! Probleme bei der Auslegung von c. 1098 CIC",
				"creators": [
					{
						"firstName": "Georg",
						"lastName": "Bier",
						"creatorType": "author"
					}
				],
				"date": "2025",
				"language": "de",
				"libraryCatalog": "opus.bibliothek.uni-augsburg.de",
				"pages": "9-28",
				"rights": "https://www.uni-augsburg.de/de/organisation/bibliothek/publizieren-zitieren-archivieren/publiz/",
				"shortTitle": "Persönliche Eigenschaften mit Störpotenzial?",
				"url": "https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/119049",
				"volume": "32",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					"urn:nbn:de:bvb:384-opus4-1190491"
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
