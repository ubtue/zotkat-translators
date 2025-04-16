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
	"lastUpdated": "2025-04-16 11:19:35"
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

function detectWeb(doc, url) {
	if (doc.querySelector('a.article-name[href$=".pdf"]')) {
		return "multiple";
	} 
	else return false;
}

function getSearchResults(doc) {
    let items = {};
	let found = false;

    let links = doc.querySelectorAll('a.article-name[href$=".pdf"]');
    for (let link of links) {
        let href = link.href;
        let title = link.querySelector('h3');
        if (href && title) {
			found = true;
            items[href] = ZU.trimInternal(title.textContent);
        }
    }
    return found ? items : false;
}

function extractYear(doc) {
	let heading = doc.querySelector('h3.ww-issue-year');
	if (!heading) return null;

	let text = ZU.trimInternal(heading.textContent);
	let issueYear = text.match(/(Spring|Summer|Autumn|Fall|Winter)\s+(\d{4})/i);
	if (!issueYear) return null;

	let year = parseInt(issueYear[2]);
    
    return year.toString();
}

function extractIssue(doc) {
	let heading = doc.querySelector('h3.ww-issue-year');
	if (!heading) return null;

	let text = ZU.trimInternal(heading.textContent);
	let issueYear = text.match(/(Spring|Summer|Autumn|Fall|Winter)\s+(\d{4})/i);
	if (!issueYear) return null;

	let season = issueYear[1].toLowerCase();

    const issueLookup = {
        "winter": 1,
        "spring": 1,
        "summer": 3,
        "autumn": 4
    };

    let issue = issueLookup[season] || null;
    
    return issue.toString();
}

function getArticle(doc, url, title) {
    let item = new Zotero.Item('journalArticle');
    item.url = url;
    item.title = title;
    item.publicationTitle = "Word & World : Theology for Christian Ministry";
	item.notes.push('LF:');
    item.ISSN = "0275-5270";
    item.language = "eng";

    item.year = extractYear(doc);
    item.issue = extractIssue(doc);

    item.complete();
}

async function doWeb(doc, url) {
    if (detectWeb(doc, url) === "multiple") {
		let searchResults = getSearchResults(doc);
        Zotero.selectItems(searchResults, function (items) {
            if (!items) {
                return true;
            }

			for (let item in items) {
				let title = searchResults[item];
				getArticle(doc, item, title);
			}
        });
    } else {
        return false;
    }
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
