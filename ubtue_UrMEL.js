{
	"translatorID": "e8cbbb28-96fa-4fb8-9bc8-fc8d3ff71414",
	"label": "ubtue_UrMEL",
	"creator": "Mara Spieß",
	"target": "https://zs.thulb.uni-jena.de/receive/jportal_jp(article|volume)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-06-10 09:45:28"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Universitätsbibliothek Tübingen

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
	if (url.includes('_jparticle_')) {
		return 'journalArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.jp-objectlist-metadata a.title[href*="_jparticle_"]');
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

function getPages(doc, item) {
	let pages = doc.querySelector('dd.jp-layout-metadataList-sizes > p');
	if (pages) {
		item.pages = pages.textContent.trim();
	}
}

function getVolumeIssue(doc, item) {
	let volumeIssueText = ZU.xpathText(doc, "//div[@id='jp-breadcrumb-container']//a[contains(@alt, 'Heft')]");
	if (volumeIssueText) {
		let volumeIssueMatch = volumeIssueText.match(/(\d+)\.\d{4},\s*Heft\s*(\d+)/i);
		if (volumeIssueMatch) {
			item.volume = volumeIssueMatch[1];
			item.issue = volumeIssueMatch[2];
		}
	}
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		item.tags = [];
		if (item.publicationTitle && item.publicationTitle.match(/Theologie der Gegenwart/i)) {
			item.ISSN = '3052-5535';
		}
		getPages(doc, item);
		getVolumeIssue(doc, item);
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://zs.thulb.uni-jena.de/receive/jportal_jparticle_01539707",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mehr als Seelenbegleitung und Kreuzrittermetaphorik : Zur Rolle Christlicher Ethik in öffentlichen Diskursen",
				"creators": [
					{
						"firstName": "Thomas",
						"lastName": "Laubach",
						"creatorType": "author"
					}
				],
				"date": "2026",
				"DOI": "10.24403/jp.1539707",
				"ISSN": "3052-5535",
				"abstractNote": "Zeitschriften-Portal, Journal-Portal",
				"issue": "1",
				"libraryCatalog": "zs.thulb.uni-jena.de",
				"pages": "2-14",
				"publicationTitle": "Theologie der Gegenwart",
				"shortTitle": "Mehr als Seelenbegleitung und Kreuzrittermetaphorik",
				"url": "https://zs.thulb.uni-jena.de/receive/jportal_jparticle_01539707",
				"volume": "69",
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
	}
]
/** END TEST CASES **/
