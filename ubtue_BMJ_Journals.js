{
	"translatorID": "17809ade-c31b-40e5-b627-528235a8dd1d",
	"label": "ubtue_BMJ_Journals",
	"creator": "Mara Spieß",
	"target": "https://jme.bmj.com/content/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-02-18 11:45:48"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Unibibliothek Tübingen

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
	if (url.match(/content\/\d*\/\d*\/d*/)) {
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
	var rows = doc.querySelectorAll('a.highwire-cite-linked-title[href*="/content/"]');
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

function extractOrcids(doc, item) {
	for (orcid_tag of ZU.xpath(doc, '//meta[@name="citation_author_orcid"]')){
		let previous_author_tag = orcid_tag.previousElementSibling;
		while (previous_author_tag && previous_author_tag.name !== "citation_author") {
			previous_author_tag = previous_author_tag.previousElementSibling;
		}
		if (previous_author_tag && previous_author_tag.name === "citation_author") {
			let author_name = previous_author_tag.content;
			let orcid = orcid_tag.content.match(/\d{4}-\d{4}-\d{4}-\d{3}[0-9X]/i);
			item.notes.push({note: "orcid:" + orcid[0] + ' | ' + author_name + ' | ' + "taken from website"});
		}
	}
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {

		item.abstractNote = ZU.cleanTags(item.abstractNote);

		let accessRights = doc.querySelector('meta[name="DC.AccessRights"]');
		if (accessRights && accessRights.getAttribute('content').match(/open-access/i)) {
			item.notes.push("LF:");
		}

		extractOrcids(doc, item);
		
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
