{
	"translatorID": "7e156b7f-d07f-4c74-8a98-ce8d8fc128c8",
	"label": "ubtue_Jewish_Bible",
	"creator": "Mara Spieß",
	"target": "https://www.jewishbible.org/(articles|issues)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-16 09:03:07"
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
	if (url.includes('/articles/')) {
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
	var rows = doc.querySelectorAll('a.toc-item[href*="/articles/"]');
	for (let row of rows) {
		let href = row.href;
		let titleElement = row.querySelector('div.toc-title');
		let title = titleElement ? ZU.trimInternal(titleElement.textContent) : "";
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

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {

		let issn = doc.querySelector('span.hide-mobile-issn');
		if (issn) item.ISSN = issn.textContent?.replace(/issn/i, '');

		item.title = item.title.replace(/\s*\W\s*jewish\s*bible\s*quarterly$/mi, '');

		let pageElements = doc.querySelectorAll('div.meta-left > span');
		pageElements.forEach(pageElement => {
			if (pageElement.textContent?.match(/pp\./i) && !item.pages) {
				item.pages = pageElement.textContent?.replace(/pp\./i, '')?.replace('–', '-');
			}
		})

		let citationElements = doc.querySelectorAll('div.eyebrow');
		citationElements.forEach(citationElement => {
			let citationMatch = citationElement.textContent?.match(/vol\.\s*(\d+):(\d+)/i)
			if (citationMatch) {
				if (!item.volume) {
					item.volume = citationMatch[1];
				}
				if (!item.issue) {
					item.issue = citationMatch[2];
				}
			}
		})

		if (item.title.match(/^book\s*review/i)) {
			item.tags.push("RezensionstagPica");
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
		"url": "https://www.jewishbible.org/articles/book-review-jps-psalms-120-150/",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "webpage",
				"title": "Book Review: The JPS Bible Commentary: Psalms 120–150. The Traditional Hebrew Text with the JPS Translation",
				"creators": [
					{
						"firstName": "David J.",
						"lastName": "Zucker",
						"creatorType": "author"
					}
				],
				"date": "2026-01-01",
				"abstractNote": "A review of The JPS Bible Commentary: Psalms 120–150 (commentary by Adele Berlin, with sidebars by Avigdor Shinan and Benjamin D. Sommer; JPS, 2023) — the first installment of a multi-volume JPS Psalms set — noting its focus on the ancient meaning of the text and its use of the 1985/1999 JPS translation rather than the newer gender-sensitive edition.",
				"language": "en",
				"shortTitle": "Book Review",
				"url": "https://www.jewishbible.org/articles/book-review-jps-psalms-120-150/",
				"websiteTitle": "Jewish Bible Quarterly",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.jewishbible.org/articles/music-and-the-sacral-authorisation-of-davidic-kingship/",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "webpage",
				"title": "Music and the Sacral Authorisation of Davidic Kingship in II Samuel 6",
				"creators": [
					{
						"firstName": "Timothy",
						"lastName": "Yap",
						"creatorType": "author"
					}
				],
				"date": "2026-01-01",
				"abstractNote": "In I Samuel 10 and II Samuel 6, music marks decisive moments of royal legitimation by mediating the LORD's presence in public space. Saul's encounter with prophetic music temporarily authenticates his divine selection through charismatic empowerment; David's orchestration of music before the ark enacts a more durable model of sacral kingship grounded in the localisation of divine presence. Michal's rebuke, read against Saul's final prophetic humiliation, reveals a competing Saulide vision of kingship invested in visibility, decorum, and distance.",
				"language": "en",
				"url": "https://www.jewishbible.org/articles/music-and-the-sacral-authorisation-of-davidic-kingship/",
				"websiteTitle": "Jewish Bible Quarterly",
				"attachments": [
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
