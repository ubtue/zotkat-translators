{
	"translatorID": "cc9857c7-879b-4424-84ab-305d4f41047c",
	"label": "ubtue_word&world",
	"creator": "Helena Nebel",
	"target": "^https?://wordandworld\\.luthersem\\.edu/issue/",
	"minVersion": "3.0.4",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-04-16 08:57:57"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Universitätsbibliothek Tübingen.  All rights reserved.

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc) {
    return doc.querySelector('a.article-name[href$=".pdf"]') ? 'multiple' : false;
}

function getSearchResults (doc) {
    let results = [];
    let links = doc.querySelectorAll('a.article-name[href$=".pdf"]');
    for (let link of links) {
        let href = link.href;
        let title = link.querySelector('h3');
        if (href && title) {
            results.push({
                href: href,
                title: ZU.trimInternal(title.textContent),
            });
        }
    }
    return results;
};

function extractYearIssue(doc) {
    let heading = doc.querySelector('h3.ww-issue-year');
    if (!heading) return null;

    let text = ZU.trimInternal(heading.textContent);
    let match = text.match(/(Spring|Summer|Autumn|Fall|Winter)\s+(\d{4})/i);
    if (!match) return null;

    let season = match[1].toLowerCase();
    let year = parseInt(match[2]);
    let issue = { winter: 1, spring: 2, summer: 3, autumn: 4}[season];
    
    return { year: year.toString(), issue: issue.toString() };
}

async function doWeb(doc) {
    let items = {};
    let links = doc.querySelectorAll('a.article-name[href$=".pdf"]');

    for (let link of links) {
        let href = link.href;
        let title = link.querySelector('h3');
        if (href && title) {
            items[href] = ZU.trimInternal(title.textContent);
        }
    }

    let selected = await Zotero.selectItems(items);
    if (!selected) return;

    let issueMeta = extractYearIssue(doc);

    for (let pdfUrl in selected) {
        let item = new Zotero.Item('journalArticle');
        item.title = selected[pdfUrl];
        item.url = pdfUrl;
        item.publicationTitle = "Word & World : Theology for Christian Ministry";
        item.ISSN = "0275-5270";
        item.language = "eng";

        if (issueMeta) {
            item.year = issueMeta.year;
            item.issue = issueMeta.issue;
        }

        item.complete();
    }
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
