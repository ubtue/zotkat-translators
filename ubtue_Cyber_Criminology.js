{
	"translatorID": "4f94f6f4-b609-429c-a0f4-16e273518ac4",
	"label": "ubtue_Cyber_Criminology",
	"creator": "Mara Spieß",
	"target": "https://cybercrimejournal.com/issue-view.php\\?id=",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-07-15 08:05:38"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Universitätsbibliothek Tübingen

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
	if (url.includes('/issue-view') && getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll(".single_article");
	for (let row of rows) {
		let anchor = row.querySelector(".article_title a");
		if (!anchor) continue;
		let href = anchor.href;
		let title = ZU.trimInternal(anchor.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {

	let selected = await Zotero.selectItems(getSearchResults(doc, false));
	if (!selected) return;

	let item = new Zotero.Item("journalArticle");

	// issue metadata
	let infoElements = doc.querySelectorAll('section.article_section > div.heading_block > p');
	for (let e of infoElements) {
		let text = ZU.trimInternal(e.textContent);
		let volumeMatch = text.match(/volume:\s*(\d+)\s*issue:\s*(\d+)/i);
		if (volumeMatch) {
				item.volume = volumeMatch[1];
				item.issue = volumeMatch[2];
		}
		else if (/^\w+-\w+\s+\d{4}$/.test(text)) {
			item.date = text.match(/\d{4}/)?.[0];
		}
		else {
			item.publicationTitle = text;
		}
	}
	if (item.publicationTitle?.match(/International\s*Journal\s*of\s*Cyber\s*Criminology/i)) {
		item.ISSN = "0974-2891";
	}


	// article metadata
	let articles = doc.querySelectorAll(".single_article");
	for (let article of articles) {
		let anchor = article.querySelector(".article_title a");
		if (!anchor) continue;

		// only import if user has selected article
		if (!(anchor.href in selected)) continue;

		item.title = ZU.trimInternal(anchor.textContent);
		item.url = anchor.href;

		// authors
		let authorText = article.querySelector(".article_author")?.textContent;
		if (authorText) {
			let authors = authorText.split(",");
			for (let author of authors) {
				author = ZU.trimInternal(author);
				if (author) {
					item.creators.push(
						ZU.cleanAuthor(author, "author", false)
					);
				}
			}
		}

		item.complete();
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
