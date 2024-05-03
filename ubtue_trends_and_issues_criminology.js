{
	"translatorID": "8e8832da-7d48-4eb5-a7a7-1f2856892905",
	"label": "ubtue_trends_and_issues_criminology",
	"creator": "Mara Spieß",
	"target": "https://www.aic.gov.au/publications/tandi",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-05-03 07:51:10"
}

/*
	***** BEGIN LICENSE BLOCK *****


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
	if (url.includes('/tandi/tandi')) {
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
	var rows = doc.querySelectorAll('.field-content');
	for (let row of rows) {
		let anchor = row.querySelector('a');
		let href = anchor ? anchor.getAttribute('href') : null;
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

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = "journalArticle";
		item.tags.push('artikelID:' + url.replace(/\D/g,''));

		item.creators = [];
		let authorCandidates = ZU.xpath(doc, '//div[contains(@class,"field--name-field-author")]/*');
		for (authorCandidate of authorCandidates) {
			item.creators.push(ZU.cleanAuthor(authorCandidate.textContent, "author"));
		}
		
		let citation = doc.getElementById('citation').textContent;
		let doiRegex = /(https?:\/\/doi[^\s]+)/g;
		let doi = citation.match(doiRegex);
		item.url = doi[0];

		item.ISSN = ZU.xpathText(doc, '//div[contains(text(),"ISSN")]/following-sibling::div/div[@class="field--item"]');
		item.ISBN = "";
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
