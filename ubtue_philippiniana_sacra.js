{
	"translatorID": "dac9850d-5470-4628-b6f5-c58ce5eba63b",
	"label": "ubtue_philippiniana_sacra",
	"creator": "Hjordis Lindeboom",
	"target": "^https?://philsacra\\.ust\\.edu\\.ph/findissues\\?",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-05-08 12:52:23"
}

/*
		***** BEGIN LICENSE BLOCK *****

		Copyright © 2026 Universität Tübingen

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
	if (url.includes("findissues")) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let blocks = doc.querySelectorAll("div.main-content-item");
	for (let block of blocks) {
		let titleEl = block.querySelector("h5 a");
		if (!titleEl) continue;
		let title = titleEl.textContent.trim().replace(/\s+/g, " ");
		let fakeURL = titleEl.href;
		if (!title) continue;
		if (checkOnly) return true;
		items[fakeURL] = title;
		found = true;
	}
	return found ? items : false;
}

function romanToInt(roman) {
	if (!roman) return null;
	roman = roman.toUpperCase().trim();
	const map = {
		I: 1,
		V: 5,
		X: 10,
		L: 50,
		C: 100,
		D: 500,
		M: 1000
	};
	let value = 0;
	let prev = 0;
	for (let i = roman.length - 1; i >= 0; i--) {
		let curr = map[roman[i]];
		if (!curr) return null;
		if (curr < prev) {
			value -= curr;
		} else {
			value += curr;
		}
		prev = curr;
	}
	return value;
}

function doWeb(doc, url) {
	let items = getSearchResults(doc, false);
	if (!items) return;

	Zotero.selectItems(items, function (selected) {
		if (!selected) return;

		let blocks = doc.querySelectorAll("div.main-content-item");

		for (let block of blocks) {
			let titleEl = block.querySelector("h5 a");
			if (!titleEl) continue;

			let pdfURL = titleEl.href;
			if (!(pdfURL in selected)) continue;

			let item = new Zotero.Item("journalArticle");
			let isReview = false;
			let title = titleEl.textContent.trim().replace(/\s+/g, " ");
			if (title.toLowerCase().includes("review")) isReview = true;
			title = title.replace(/\s*\(PHILIPPINIANA\s*RECORDS\)\s*/i, "").replace(/\s*\(REVIEWS\s*&\s*NOTICES\)\s*/i, "").trim();
			item.title = ZU.capitalizeTitle(title, true);
			let doiEl = block.querySelector('a[href^="https://doi.org"], a[href^="http://doi.org"]');
			if (doiEl) {
				item.DOI = doiEl.textContent.trim();
			}
			const AFFILIATIONS = ["O\\.?P\\.?", "O\\.?S\\.?B\\.?", "O\\.?F\\.?M\\.?", "S\\.?D\\.?B\\.?", "J\\.?C\\.?D\\.?"];
			const affiliationRegex = new RegExp("\\b(" + AFFILIATIONS.join("|") + ")\\b", "gi");
			let authorDD = block.querySelector("dt i.fa-users")?.parentElement?.nextElementSibling;
			if (authorDD) {
				let authors = authorDD.textContent.split(/,\s*/);
				for (let name of authors) {
					//replace OP affiliation or role, e.g. (translator)
					name = name.replace(affiliationRegex, "").replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
					if (!name) continue;
					item.creators.push(Zotero.Utilities.cleanAuthor(ZU.capitalizeTitle(name, true), "author"));
				}
			}
			let abstractP = block.querySelector("p.text-justify");
			if (abstractP) {
				let abs = abstractP.textContent.trim().replace(/^Abstract\s*:/i, "");
				item.abstractNote = abs.trim();
			}
			let kwP = block.querySelector("p.text-muted span.font-weight-bold");
			if (kwP && kwP.textContent.includes("Keywords")) {
				let kwText = kwP.parentElement.textContent.replace(/Keywords\s*:/i, "");
				item.tags = kwText.split(",").map(t => t.trim()).filter(Boolean);
			}
			if (isReview) item.tags.push('RezensionstagPica');
			if (pdfURL) {
				item.attachments.push({
					url: pdfURL,
					title: "Full Text PDF",
					mimeType: "application/pdf"
				});
			}
			let header = doc.querySelector("#headerissue")?.textContent || "";
			header = header.replace(/\s+/g, " ").trim();
			let volumeMatch = header.match(/Vol\.?\s+([A-Z0-9]+)/i);
			let issueMatch  = header.match(/Issue\s+No\.?\s+(\d+)/i);
			let yearMatch   = header.match(/(\d{4})\s*$/);
			let volume = volumeMatch ? volumeMatch[1] : "";
			item.volume = romanToInt(volume);
			item.issue  = issueMatch ? issueMatch[1] : "";
			item.date   = yearMatch ? yearMatch[1] : "";

			item.publicationTitle = "Philippiniana Sacra";
			item.url = pdfURL;
			item.ISSN = "2651-7418";
			item.language = "eng";

			item.complete();
		}
	});
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
