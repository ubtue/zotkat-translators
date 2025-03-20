{
	"translatorID": "03b213df-2daf-428a-86dc-44e16339eaa5",
	"label": "ubtue_Equip",
	"creator": "Mara Spieß",
	"target": "https://equipthecalled.com/(.*)-journal-(article|issue)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-20 10:27:02"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Universitätsbibliotehk Tübingen

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
	if (url.includes('journal-article/')) {
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
	var rows = doc.querySelectorAll('a[href*="journal-article/"]');
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

function getAuthors(doc, item) {
	let authorsElement = doc.querySelector('div.authors'); 
	for (author of authorsElement.querySelectorAll('h4.mb-2')) {
		item.creators.push(ZU.cleanAuthor(author.textContent, "author", false));
	}
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {

		item.itemType = "journalArticle";

		item.abstractNote = "";

		let publicationTitle = doc.querySelector('div.breadcrumb');
		if (publicationTitle) {
			item.publicationTitle = publicationTitle.textContent;
		}
		if (item.publicationTitle.match(/Southwestern Journal of Theology Article/i)) {
			item.ISSN = "0038-4828";
		}

		let citation = doc.querySelector('div.journal-float > div.row > div.col-md-6 > p')?.textContent;
		if (citation) {
			let citationMatch = citation.match(/volume\s+(\d*),\s?(?:no.)?\s?(\d+)?\s?-?\s+\w*\s+(\d{4})/i);
			if (citationMatch) {
				item.volume = citationMatch[1];
				item.issue = citationMatch[2];
				item.date = citationMatch[3];
			}
		}

		let reviewElement = ZU.xpathText(doc, '//div[contains(text(), "Book Review")]');
		if (reviewElement) {
			item.tags.push("RezensionstagPica");
			let reviewAbstractElement = doc.querySelector('div.post_content > p > strong');
			if (reviewAbstractElement) {
				item.abstractNote = reviewAbstractElement.textContent;
			}
		}

		getAuthors(doc, item);

		item.complete();
	});

	let em = await translator.getTranslatorObject();

	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
