{
	"translatorID": "7b3dcb31-da90-4f7d-be37-8c8a20d4062f",
	"label": "ubtue_umes",
	"creator": "Helena Nebel",
	"target": "umes.edu\\/.+\\/(maiden-issue-)?vol-\\d+-issue",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-30 17:21:11"
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
var ISSN = "";

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
	if (url.match(/vol-\d+-issue-\d+(?:-\d+)?-(?:spring|fall)-\d{4}/)) {
		let volumeAndIssue = url.match(/vol-(\d+)-issue-(\d+(?:-\d+)?)-(?:spring|fall)-(\d{4})/);
		volume = volumeAndIssue[1];
		issue = volumeAndIssue[2];
		year = volumeAndIssue[3];
	}
	if (getSearchResults(doc, true)) return "multiple";
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var html = ZU.xpath(doc, '//div[@class="entry-content"]');
	for (let article of ZU.xpath(html, '//ul/li[contains(a/@href, ".pdf")]')) {
		if (ZU.xpathText(article, './a/@href')) {
			articleData[ZU.xpathText(article, './a/@href')] = article.outerHTML;
			items[ZU.xpathText(article, './a/@href')] = article.textContent;
			var found = true;
		}
	}
	if (!found) {
		for (let article of ZU.xpath(html, '//p[contains(a/@href, ".pdf")]')) {
		if (ZU.xpathText(article, './a/@href')) {
			
			if (article.outerHTML.match(/<a href=/g).length > 1) {
				
				let articleNr = 0;
				for (let splitArticle of article.outerHTML.split(/<br><a/)) {
					
					if (articleNr != 0) splitArticle = '<p><a' + splitArticle;
					splitArticle = splitArticle.replace(/(?:<\/p>)?$/g, '') + '</p>';
					articleData[splitArticle.match(/href="([^"]+)"/)[1]] = splitArticle;
					items[splitArticle.match(/href="([^"]+)"/)[1]] = splitArticle.replace(/<\/?[^>]+>/g, '');
					articleNr += 1;
					found = true;
				}
			}
			else {
				articleData[ZU.xpathText(article, './a/@href')] = article.outerHTML;
				items[ZU.xpathText(article, './a/@href')] = article.textContent;
				found = true;
			}
		}
	}
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				scrape(doc, articleData[i], i);
			}
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, text, data) {
	var item = new Zotero.Item('journalArticle');
	Z.debug(text)
	item.date = year;
	item.volume = volume;
	item.issue = issue.replace(/-/g, '/');
	if (text.match(/<br>(?:By(?:\s+|&nbsp;))?(.+)<(?:\/li|\/p|a)>/i)) {
	if (text.match(/<br>(?:By(?:\s+|&nbsp;))?(.+)<(?:\/li|\/p|a)>/i)[1].split(/(?:\s+and|\s+&amp;|;|,)\s+/)) {
		for (let author of text.match(/<br>(?:By(?:\s+|&nbsp;))?(.+)<(?:\/li|\/p|a)>/i)[1].split(/(?:\s+and|\s+&amp;|;|,)\s+/)) {
			item.creators.push(ZU.cleanAuthor(author, "author"));
			}
		}
	}
	var parser = new DOMParser();
	var html = parser.parseFromString(text, "text/html");
	item.url = ZU.xpathText(html, '//a/@href');
	let titleAndPages = ZU.xpathText(html, '//a');
	if (titleAndPages.match(/\s*\(?p?p?.?\s*\d+(?:-\d+)\s*\)?.?$/)) {
		item.pages = titleAndPages.match(/\s*\(?p?p?.?\s*(\d+(?:-\d+))\s*\)?.?$/)[1];
	}
	item.title = titleAndPages.split(/\s*\(?p?p?.?\s*\d+(?:-\d+)\s*\)?.?$/)[0];
	
	if (!item.url.match(/^https?:\/\/wwwcp.umes.edu/)) {
		item.url = 'https?://wwwcp.umes.edu' + item.url;
	}
	let journalAbbreviation = item.url.match(/umes.edu\/([^\/]+)\//)[1];
	switch (journalAbbreviation) {
		case "ajcjs":
			item.ISSN = "1554-3897";
			break;
		default:
		item.ISSN = "";
	}
	item.complete();

	
	
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.baylor.edu/prs/index.php?id=985507",
		"items": "multiple"
	}
]
/** END TEST CASES **/
