{
	"translatorID": "3f09367c-d060-4ab8-9831-50a9d933edec",
	"label": "ubtue_Akkadica",
	"creator": "Mara Spieß",
	"target": "https:\\/\\/akkadica.ugent.be\\/[article|issue]",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-06-09 08:51:40"
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
	var rows = doc.querySelectorAll('div.box.article');
	for (let row of rows) {
		let hrefNode = row.querySelector('a.box-link[href]');
		let titleNode = row.querySelector('h2');

		let href = hrefNode.href.replace(/http/, 'https');
		let title = titleNode && ZU.trimInternal(titleNode.textContent);
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

function getOrcids(doc, item) {
	let authorNodes = doc.querySelectorAll('div.section ul[itemprop="author"]');
	authorNodes.forEach((author) => {
		let orcidLink = author.querySelector('a[href*="orcid.org/"]');
		let authorNameNode = author.querySelector('[itemprop="name"]');
		if (orcidLink && authorNameNode) {
			let href = orcidLink.getAttribute('href');
			if (href) {
				let hrefMatch = href.match(/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i);
				if (hrefMatch) {
					let authorName = ZU.trimInternal(authorNameNode.textContent).replace(/^Prof\.?\s+/i, '');
					let orcid = hrefMatch[1];
					if (authorName && orcid) {
						item.notes.push({note: 'orcid: ' + orcid + ' | ' + authorName + ' | ' + 'taken from website'});
					}
				}
			}
		}
	});
}

function getPages(doc, item) {
	let sectionElements = doc.querySelectorAll('div.section li');
	sectionElements.forEach((element) => {
		if (element.textContent) {
			let elementPageMatch = element.textContent.match(/pages:\s*(\d+\s*[–-]\s*\d+|\d+)/i);
			if (elementPageMatch && !item.pages) {
				item.pages = elementPageMatch[1].replace(/\s*[–-]\s*/, "-");
			}
		}
	})
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		getOrcids(doc, item);
		getPages(doc, item);
		if (item.title.match(/(review\s+of|rezension\s+von)/i)) {
			item.tags.push("RezensionstagPica");
		}
		if (item.creators) {
			item.creators.forEach((creator) => {
				if (creator.firstName) {
					creator.firstName = creator.firstName.replace(/^\s*Prof\.?\s+/, "").trim();
				}
			})
		}
		if (!item.language || item.language.match(/none/i)) {
			item.language = "eng";
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
