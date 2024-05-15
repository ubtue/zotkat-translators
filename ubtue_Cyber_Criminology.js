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
	"lastUpdated": "2024-05-15 15:37:15"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 YOUR_NAME <- TODO

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
	if (url.includes('/issue-view')) {
		return 'multiple';
	} 
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.article_title');
	for (let row of rows) {
		let anchor = row.querySelector('a');
		let href = anchor ? anchor.getAttribute('href').slice(0, -2) : null;
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
		if (item.publicationTitle == "International Journal of Cyber Criminology")
		    item.ISSN = "0974-2891";
		let abstractCandidate = ZU.xpathText(doc, '//*[@class="item abstract"]');
		if (abstractCandidate)  
		    item.abstractNote = ZU.trimInternal(abstractCandidate).replace(/^Abstract\s*/, "");
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	
	
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
