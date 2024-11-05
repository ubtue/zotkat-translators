{
	"translatorID": "4ccf849b-f9e9-4cec-9bae-7c10aa4dea53",
	"label": "ubtue_University of Toronto Press",
	"creator": "Mara Spieß",
	"target": "^https?://(www\\.)?utp(journals|publishing).com/(doi|toc)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
<<<<<<< HEAD
	"lastUpdated": "2024-11-05 08:15:42"
=======
	"lastUpdated": "2024-11-05 08:00:41"
>>>>>>> d14c18dcb545ae61e407002ab72c937fb924763d
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
	if (url.includes('/doi/')) {
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
	var rows = doc.querySelectorAll('h2.issue-item__title > a[href*="/doi/"]');
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

function extractAndAssign(selector, property, doc, item) {
	let element = doc.querySelector('span.' + selector);
	if (element) {
		item[property] = element.textContent.trim();
	}
}

function mapTitleIssn(publicationTitle) {
	let publicationTitleToIssn = {
		'Toronto Journal of Theology': '1918-6371',
		'Canadian Journal of Criminology and Criminal Justice': '1707-7753',
	};
	return publicationTitleToIssn[publicationTitle] || null;
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {

		extractAndAssign('volume', 'volume', doc, item);
		extractAndAssign('issue', 'issue', doc, item);
		extractAndAssign('page', 'pages', doc, item);

		let metaElementDoi = doc.querySelector('meta[name="publication_doi"]');
		if (metaElementDoi) {
			item.DOI = metaElementDoi.getAttribute('content');
		}
		let metaElementReview = doc.querySelector('meta[name="dc.Type"]');
		if (metaElementReview && metaElementReview.getAttribute('content').match(/book-review/i)) {
			item.tags.push('RezensionstagPica');
		}
		
		if (item.ISSN == '1707-7753' && item.title.match(/book reviews|recensions de livres/i)) {
			item.tags.push('RezensionstagPica');
		}
		
		let issn = mapTitleIssn(item.publicationTitle);
		if (issn) {
			item.ISSN = issn;
		}
		let openAccessIcon = doc.querySelector('i.icon-unlock[title="Free access"]');
		if (openAccessIcon) {
			item.notes.push("LF:");
		}
		item.complete();
	});

	let em = await translator.getTranslatorObject();

	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
