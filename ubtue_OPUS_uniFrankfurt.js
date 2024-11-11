{
	"translatorID": "c6515b1f-1221-4c8e-828e-c8dac5baf988",
	"label": "ubtue_OPUS_uniFrankfurt",
	"creator": "Mara Spieß",
	"target": "(publikationen\\.ub)?\\.uni-frankfurt\\.de",
	"minVersion": "3.0.12",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 12,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-11-06 08:20:23"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Mara Spieß

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
	if (url.match(/https:\/\/www.uni-frankfurt.de/)) {
		return getSearchResults(doc) ? "multiple" : false;
	}
	else if (url.match(/docId\//)) {
		return "journalArticle";
	}
	return false;
}

function getSearchResults(doc) {
	var resultsBlock = ZU.xpath(doc, "//li/a[contains(@href, '/doi.org/10.')]");
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

function getOrcid (doc, item) {
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

		getOrcid (doc, item);

		if (item.publicationTitle.match(/jahrbuch des fachbereichs evangelische theologie/i)) {
			item.ISSN = "IXTH-0005";
		}

		if (item.abstractNote) {
			item.abstractNote = item.abstractNote.replace(/\n/g, " ");
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
		"url": "https://publikationen.ub.uni-frankfurt.de/frontdoor/index/index/docId/59122",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Il pazzo uomo e il vecchio Dio : l'apocalisse dell'esistenza moderna secondo Friedrich Nietzsche",
				"creators": [
					{
						"firstName": "Edmund",
						"lastName": "Weber",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"abstractNote": "Friedrich Nietzsche criticò l’ateismo astratto e la religione astratta come illusioni esistenziali e ricostruì la condizione originaria dell’esistenza umana.",
				"issue": "281",
				"language": "ita",
				"libraryCatalog": "publikationen.ub.uni-frankfurt.de",
				"publicationTitle": "Journal of religious culture = Journal für Religionskultur",
				"rights": "http://publikationen.ub.uni-frankfurt.de/home/index/help#policies",
				"shortTitle": "Il pazzo uomo e il vecchio Dio",
				"url": "http://publikationen.ub.uni-frankfurt.de/frontdoor/index/index/docId/59122",
				"volume": "2021",
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
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.uni-frankfurt.de/149034713/03___Jahrbuch_2023",
		"items": "multiple"
	}
]
/** END TEST CASES **/
