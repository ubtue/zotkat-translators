{
	"translatorID": "947c5dbe-6a9e-4572-b2df-9dc28e0e02ed",
	"label": "ubtue_jisasr",
	"creator": "Helena Nebel",
	"target": "https?://jisasr.org/(archive/)?(volume-\\d+|current-edition)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-12-19 09:34:40"
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
	if (url.match(/jisasr.org\/(archive\/)?volume-\d/) && getSearchResults(doc, url, true)) return "multiple";
}

function getSearchResults(doc, url, checkOnly) {
	var items = {};
	var found = false;
	var entry_content_tags = ZU.xpath(doc, '//div[@class="entry-content"]');
	if (url.match(/\/volume-\d+-\d{4}\/?$/)) {
		volume = url.match(/\/volume-(\d+)-\d{4}\/?$/)[1];
		date = url.match(/\/volume-\d+-(\d{4})\/?$/)[1];
	}
	for (let html of entry_content_tags) {
		if (ZU.xpath(html, './/a[contains(@title, "[PDF]")]').length > 0) {

			for (let articleTag of ZU.xpath(html, './/p[contains(a/@title, "[PDF]")]')) {
				items[ZU.xpathText(articleTag, './a/@href')] = ZU.xpathText(articleTag, './a');
				articleData[ZU.xpathText(articleTag, './a/@href')] = articleTag;
				var found = true;
			}
		}
		if (found == false) {
			if (ZU.xpath(html, './/p[contains(a/., "[PDF]")]')) {
				for (let articleTag of ZU.xpath(html, './/p[contains(a/., "[PDF]")]')) {
				items[ZU.xpathText(articleTag, './a/@href')] = ZU.xpathText(articleTag, './a');
				articleData[ZU.xpathText(articleTag, './a/@href')] = articleTag;
				var found = true;
			}
			}
		}
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		ISSN = "2009-7409";
		Zotero.selectItems(getSearchResults(doc, url, false), function (items) {
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
	//Z.debug(data)
	var item = new Zotero.Item('journalArticle');
	item.date = date;
	item.volume = volume;
	item.url = ZU.xpathText(text, './a/@href');
	item.title = ZU.xpathText(text, './a').replace(/\s+\[PDF\]$/, '');
	if (text.innerHTML.split(/<br>/).length > 1 && !item.title.match(/^review/i)) {
		for (let cre of text.innerHTML.split(/<br>/)[1].split(/\s+&amp;\s+/)) {
			item.creators.push(ZU.cleanAuthor(cre.replace(/<\/?[^>]+>/g, ''), 'author', false));
		}
	}
	else if (text.innerHTML.split(/<br>/).length > 1) {
		if (text.innerHTML.split(/<br>/)[1].replace(/&nbsp;/g, ' ').trim().split(/,\s+reviewed\s+by\s+/)) {
			item.creators.push(ZU.cleanAuthor(text.innerHTML.split(/<br>/)[1].replace(/&nbsp;/g, ' ').trim().split(/,\s+reviewed\s+by\s+/)[1], 'author', false));
			item.title += ": " + text.innerHTML.split(/<br>/)[1].replace(/&nbsp;/g, ' ').trim().split(/,\s+reviewed\s+by\s+/)[0];
			item.tags.push('RezensionstagPica');
		}
	}
	if (text.innerHTML.match(/pp?\.?\s*\d+(?:-\d+)?/)) item.pages = text.innerHTML.match(/pp?\.?\s*(\d+(?:[–-]\d+)?)/)[1];
	item.ISSN = ISSN;
	item.publicationTitle = "Journal of the Irish Society for the Academic Study of Religions";
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
