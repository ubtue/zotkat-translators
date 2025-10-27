{
	"translatorID": "630c8504-46cb-405e-acf8-c6e7d60b47db",
	"label": "ubtue_Verbum_et_Ecclesia",
	"creator": "Mara Spieß",
	"target": "https://verbumetecclesia.org.za/index.php/ve/(article|issue)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-27 15:44:00"
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
	if (url.includes('/article/')) {
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
	var tocTitles = doc.querySelectorAll('div.tocTitle');
	
	for (let tocTitle of tocTitles) {
		let titleLink = tocTitle.querySelector('a');
		let row = tocTitle.closest('tr');
		let htmlLink = row ? Array.from(row.querySelectorAll('.tocGalleys a.file'))
			.find(a => a.textContent.trim() === 'HTML') : null;
		
		if (titleLink && htmlLink) {
			let href = htmlLink.href;
			let title = titleLink.textContent.trim();
			
			if (checkOnly) return true;
			found = true;
			items[href] = title;
		}
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
	let orcidElement = doc.querySelector('div#OJP_about');
	if (orcidElement) {
			let orcidLinks = orcidElement.querySelectorAll('a[href*="orcid.org"]');
			for (let orcidLink of orcidLinks) {
				let orcid = orcidLink.href.match(/\d+-\d+-\d+-\d+x?/gi)?.[0];
				let author = ZU.xpathText(orcidLink, './preceding-sibling::span[1]');
				if (orcid && author) {
					item.notes.push('orcid:' + orcid + ' | ' + author + ' | taken from website');
				}
			}
		}
}

function getArticleID(item, url) {
	let match = url.match(/\/view\/(\d{4})/);
	if (match) {
		item.notes.push('artikelID:a' + match[1]);
	}
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		getArticleID (item, url);
		getOrcids (doc, item);
		
		delete item.pages;
		
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
