{
	"translatorID": "f70a21c9-f867-474a-97a6-bbb9ad723ddb",
	"label": "ubtue_Zygonjournal",
	"creator": "Timotheus Kim",
	"target": "zygonjournal.org",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-06-26 13:40:30"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2024 Universitätsbibliothek Tübingen

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but without any WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero. If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
    if (url.includes('/article/')) {
        return 'journalArticle';
    } else if (getSearchResults(doc, true)) {
        return 'multiple';
    }
    return false;
}

function getSearchResults(doc, checkOnly) {
    var items = {};
    var found = false;
    var rows = doc.querySelectorAll('a[href*="/article/"]');
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
    } else {
        await scrape(doc, url);
    }
}

async function scrape(doc, url = doc.location.href) {
    let translator = Zotero.loadTranslator('web');
    translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
    translator.setDocument(doc);
    
    translator.setHandler('itemDone', (_obj, item) => {
        item.title = titleCase(item.title); // Apply title case
        item.complete();
    });

    let em = await translator.getTranslatorObject();
    em.itemType = 'journalArticle';

    await em.doWeb(doc, url);
}

function titleCase(title) {
    const smallWords = /^(a|an|and|as|at|but|by|for|if|in|nor|of|on|or|so|the|to|up|yet)$/i;
    return title.split(' ').map((word, index, array) => {
        if (
            word.match(smallWords) &&
            index !== 0 &&
            index !== array.length - 1
        ) {
            return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
