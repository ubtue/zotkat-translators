{
	"translatorID": "8d2f00bb-d94d-4818-9f2e-4ba216d25383",
	"label": "ubtue_Revista_de_Espiritualidad",
	"creator": "Mara Spieß",
	"target": "https://www.revistadeespiritualidad.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-11-19 11:05:28"
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
	if (url.includes('/index.php?Seccion')) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('tr a.enlacetitulo[href*=".pdf"]');
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
			let item = new Zotero.Item("journalArticle");

			item.ISSN = "0034-8147";
			item.url = url;

			let urlParts = url.split('/');
			let filename = urlParts[urlParts.length - 1];
			let entry = doc.querySelector('a[href*="' + filename + '"]');
			
			if (entry) {
				item.title = ZU.trimInternal(entry.textContent);
				
				let mainTd = entry.closest('table')?.closest('td');
				if (mainTd) {
					let siblingTd = mainTd.nextElementSibling?.nextElementSibling;
					if (siblingTd?.classList.contains('textonegrita1')) {
						item.pages = siblingTd.textContent.trim().replace(/^0+/, "");
					}
				}

				let entryTr = entry.closest('tr');
				if (entryTr) {
					let authorTr = entryTr.previousElementSibling?.previousElementSibling;
					if (authorTr && authorTr.textContent.trim().toUpperCase() === authorTr.textContent.trim()) {
						let author = authorTr.textContent;
						author = author.toLowerCase().replace(/(^|\s+)(\w)/g, (match, space, letter) => space + letter.toUpperCase());
						item.creators.push(ZU.cleanAuthor(author, 'author', true));
					} else { //review authors
						let parentTd = entry.closest('td');
						let authorSpan = parentTd?.querySelector('span.textonegritaazul1');
						if (authorSpan) {
							let author = authorSpan.textContent;
							if (author) {
								item.creators.push(ZU.cleanAuthor(author, 'author', false));
								item.notes.push("RezensionstagPica");
							}
						}
					}
				}
			}

			let citationElements = doc.querySelectorAll('td.textonegritaazul3');
			citationElements.forEach((citationElement) => {
				let dateVolumeMatch = citationElement.textContent.match(/(20\d{2})\s+\((\d+)\)/);
				if (dateVolumeMatch) {
					if (!item.date) item.date = dateVolumeMatch[1];
					if (!item.volume) item.volume = dateVolumeMatch[2];
				}
				let issueMatch = citationElement.textContent.match(/n.\s+(\d+)/i);
				if (issueMatch) {
					if (!item.issue) item.issue = issueMatch[1];
				}
			}
			)

			item.complete();
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
