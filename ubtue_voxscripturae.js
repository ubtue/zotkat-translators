{
	"translatorID": "2ff93856-adeb-4714-ba3f-0dc296b2fc5b",
	"label": "ubtue_voxscripturae",
	"creator": "Helena Nebel",
	"target": "https?://www.voxscripturae.com.br/edition",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-10-05 12:26:18"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Universitätsbibliothek Tübingen.  All rights reserved.
	
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

var articleData = {};
var date = "";
var volume = "";
var issue = "";

function romanToInt(r) {
	if (r.match(/^[IVXLCM]+/i)) {
		r = r.toUpperCase()
    const sym = { 
        'I': 1,
        'V': 5,
        'X': 10,
        'L': 50,
        'C': 100,
        'D': 500,
        'M': 1000
    }
    let result = 0;
    for (i=0; i < r.length; i++){
        const cur = sym[r[i]];
        const next = sym[r[i+1]];
        if (cur < next){
            result += next - cur 
            i++
        } else {
            result += cur
        }
    }

    return result; 
	}
	else return r;
};


function detectWeb(doc, url) {
	if (getSearchResults(doc, true)) return "multiple";
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//ul[@id="articles"]/li');
	for (let row of rows) {
		let href = "http://www.stone-campbelljournal.com/" + ZU.xpathText(row, './/a/@href');
		let title = ZU.xpathText(row, './/h4');
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
		articleData[href] = row;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		if (url.match(/edition\/[^\/]+\/volume-[lcxvi]+-number-\d+-.+-\d{4}/)) {
			let issued = url.match(/edition\/[^\/]+\/volume-([lcxvi]+)-number-(\d+)-.+-(\d{4})/);
			volume = issued[1];
			issue = issued[2];
			date = issued[3];
		}
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				scrape(doc, articleData[i]);
			}
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, text) {
	
	//Z.debug(text)
	var item = new Zotero.Item('journalArticle');
	item.title = ZU.xpathText(text, './/h4');
	item.url = 'http://www.voxscripturae.com.br/' + ZU.xpathText(text, './/a/@href');
	if (ZU.xpathText(text, './/a[@class="auth"]')) {
	for (let author of ZU.xpathText(text, './/a[@class="auth"]').split(/\s+e\s+/)) {
		item.creators.push(ZU.cleanAuthor(author, 'author', false));
	}
	}
	if (ZU.xpathText(text, './/a[@class="pags"]') && ZU.xpathText(text, './/a[@class="pags"]').match(/\d+/)) {
		item.notes.push('seitenGesamt:' + ZU.xpathText(text, './/a[@class="pags"]').match(/\d+/));
	}
	item.volume = romanToInt(volume).toString();
	item.issue = issue;
	item.date = date;
	item.publicationTitle = "VOX SCRIPTURAE";
	item.ISSN = "2447-7443";
	item.complete();

	
	
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.voxscripturae.com.br/edition/51/volume-xxvii-number-2-september-2019",
		"items": "multiple"
	}
]
/** END TEST CASES **/
