{
	"translatorID": "5fe7a026-4842-4245-8b6b-7f1128187174",
	"label": "ubtue_eperiodica",
	"creator": "Mara Spieß",
	"target": "https://www.e-periodica.ch/view/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-20 14:29:20"
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


function detectWeb(doc) {
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
    var items = {};
    var found = false;
    var rows = doc.querySelectorAll('.ep-view__toc__unit');

    for (let row of rows) {
        let href = row.href;
        let title = ZU.trimInternal(row.textContent)?.replace(/^artikel/i, '');
        let tr = row.closest('tr');
        let risLink = tr && tr.querySelector('a.ep-view__toc__action-ris[href]');

        if (!href || !title || !risLink) continue;
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

			let path = new URL(url).pathname;
			let entry = doc.querySelector('a.ep-view__toc__unit[href*="' + path + '"]')?.closest('tr.ep-toc__node--hastype');

			if (entry)  {
				let risElement = entry.querySelector('a.ep-view__toc__action-ris[href*="/ris?"]');
				let risURL = risElement.href;

				let risText = await requestText(risURL);
				let translator = Zotero.loadTranslator('import');
				translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
				translator.setString(risText);
				translator.setHandler('itemDone', (_obj, item) => {
					

					item.complete();
				});
				await translator.translate();
			}	
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
