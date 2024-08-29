{
	"translatorID": "facc76d4-7e8a-44fa-b793-9d7457c3fc9a",
	"label": "ubtue_APCJ",
	"creator": "Mara Spieß",
	"target": "https://apcj.shsu.edu/journal/index.php",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-08-29 12:13:50"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 YOUR_NAME <- TODO

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
	if (url.includes('item=')) {
		return 'journalArticle';
	}
	else if (getSearchResults(doc, true) && url.includes('vol=')) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3 > a[href*="item="]');
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

function getAuthors (citationMatch, item) {
	citationAuthors = citationMatch[1].split(/(?:,?\s+&\s+)|(?:\.,)/g);
	citationAuthors.forEach(author => {
		item.creators.push(ZU.cleanAuthor(author, "author", true));
	})
	//Z.debug(citationAuthors);
}

function getKeywords (p, keywordsRegex, item) {
	if (keywordsRegex.test(p.textContent)) {
		keywordsParagraph = p;
		Z.debug(keywordsParagraph.textContent);
		keywords = keywordsParagraph.textContent.replace("Keywords: ", "").split(',');
		keywords.forEach(keyword => {
			item.tags.push(keyword.trim());
		});
		Z.debug(keywords);
	}
}

function getAbstract (p, abstractRegex, item) {
	if (abstractRegex.test(p.textContent)) {
		abstractParagraph = p;
		Z.debug(abstractParagraph.textContent);
		item.abstractNote = abstractParagraph.textContent.replace("Description: ", "");
	}
}

async function scrape(doc, url = doc.location.href) {
	let item = new Zotero.Item("journalArticle");
	item.url = url;
	item.title = doc.querySelector('#content_box > h3').textContent;
	// quotation marks are being escaped, removing them is not an ideal solution
	item.title = item.title.replace(/"/g, '');

	let paragraphs = doc.querySelectorAll('p');
	let citationParagraph = null;

	let citationRegex = /suggested\s+citation\s*:\s*/i;
	let keywordsRegex = /keywords/i;
	let abstractRegex = /description/i;

	if (paragraphs) {
		paragraphs.forEach(p => {
			if (citationRegex.test(p.textContent)) {
				citationParagraph = p;
				//Z.debug(citationParagraph.textContent);
				citationMatch = citationParagraph.textContent.match(/suggested citation:\s*(\D+)\((\d{4})\)\s*.\s*([\d\w\s.,:;'"-]+)\s*\[electronic\s*version\].\s*applied\s+psychology\s+in\s+criminal\s+justice,\s*(\d+)\((\d+)\),\s*(\d+-?\d*)/i);
				if (citationMatch) {
					//Z.debug(citationMatch);
					getAuthors(citationMatch, item);
					item.date = citationMatch[2];
					item.volume = citationMatch[4];
					item.issue = citationMatch[5];
					item.pages = citationMatch[6];
				}
			}

			getKeywords(p, keywordsRegex, item);
			getAbstract(p, abstractRegex, item);
				
		});
	}

	if (!citationParagraph) {
		Z.debug("Citation paragraph not found");
	}
	
	item.complete();  
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
