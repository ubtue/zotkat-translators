{
	"translatorID": "c5a9b1bb-51c8-49fc-ae2a-21f41812d5bb",
	"label": "ubtue_christianscholars",
	"creator": "Helena Nebel",
	"target": "^https?://christianscholars.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-12-01 09:43:33"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Universitätsbibliothek Tübingen.  All rights reserved.

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

var reviewURLs = [];

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
	if (url.includes('/christianscholars.com/issues/')) {
	return "multiple";
  }
   else if (url.includes('/christianscholars.com/')) {
	return "JournalArticle";
  }
  return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//article[@class="article book_review"]//a[not(contains(@href, "/author/"))]');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		reviewURLs.push(href);
	}
	var rows = ZU.xpath(doc, '//div[@class="article_info"]//a[not(contains(@href, "/author/"))]');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
  if (detectWeb(doc, url) == "multiple") {
	Zotero.selectItems(getSearchResults(doc, false), function (items) {
	  if (items) ZU.processDocuments(Object.keys(items), scrape);
	});
  } else
  {
	scrape(doc, url);
  }
}

function scrape(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		i.itemType = "journalArticle";
		let citation = ZU.xpath(doc, '//div[@class="chicago_style"]');
		if (citation.length != 0) {
			i.publicationTitle = ZU.xpathText(citation, './em');
			if (i.publicationTitle == "Christian Scholar’s Review") i.ISSN = "0017-2251";
			let pagination = citation[0].textContent.trim().match(/\d+(?:-\d+)?$/);
			if (pagination) i.pages = pagination[0];
			let volume = citation[0].textContent.trim().match(/\s+(\d+):(\d)\s+/);
			if (volume && !i.volume) i.volume = volume[1];
			if (volume && !i.issue) i.issue = volume[2];
			i.creators = [];
			for (let author of ZU.xpath(doc, '//a[@rel="author"]')) {
				i.creators.push(ZU.cleanAuthor(author.textContent, 'author', false));
			}
			if (reviewURLs.includes(i.url)) {
				i.tags.push('RezensionstagPica');
			}
		}
		else {
			let issue_url = ZU.xpathText(doc, '//div[@class="issue"]/a/@href');
			if (i.publicationTitle == "Christian Scholar’s Review") i.ISSN = "0017-2251";
			if (issue_url.match(/\d{4}-volume-([ivxlc\d]+)-number-([ivxlc\d]+)\//)) {
				i.volume = romanToInt(issue_url.match(/\d{4}-volume-([ivxlc\d]+)-number-([ivxlc\d]+)\//)[1]).toString();;
				i.issue = issue_url.match(/\d{4}-volume-([ivxlc\d]+)-number-([ivxlc\d]+)\//)[2];
			}
			if (reviewURLs.includes(i.url)) {
				i.tags.push('RezensionstagPica');
			}
		}
		
		i.attachments = [];
		i.complete();
	});
	translator.translate();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://christianscholars.com/issues/fall-2021/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://christianscholars.com/american-idols-review-of-george-m-marsden-the-soul-of-the-american-university-revisited/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "American Idols: Review of George M. Marsden, The Soul of the American University Revisited",
				"creators": [
					{
						"firstName": "Julia D.",
						"lastName": "Hejduk",
						"creatorType": "author"
					}
				],
				"date": "2021-10-27T14:00:00+00:00",
				"ISSN": "0017-2251",
				"abstractNote": "The Soul of the American University Revisited George M. Marsden Published by Oxford University Press in 2021 pp / $29.95 / Amazon Goodreads Julia D. Hejduk is the Reverend Jacob...",
				"issue": "1",
				"language": "en-US",
				"libraryCatalog": "christianscholars.com",
				"pages": "61-67",
				"publicationTitle": "Christian Scholar’s Review",
				"shortTitle": "American Idols",
				"url": "https://christianscholars.com/american-idols-review-of-george-m-marsden-the-soul-of-the-american-university-revisited/",
				"volume": "51",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
