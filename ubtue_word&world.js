{
	"translatorID": "cc9857c7-879b-4424-84ab-305d4f41047c",
	"label": "ubtue_word&world",
	"creator": "Helena Nebel",
	"target": "wordandworld.luthersem.edu/issues.aspx\\?(article|issue)_id=",
	"minVersion": "3.0.4",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-08-16 13:35:33"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Universitätsbibliothek Tübingen.  All rights reserved.

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
	if (url.match(/\?issue_id=/) && getSearchResults(doc, true)) {
		return "multiple";
	} 
	else if (url.match(/\?article_id=/)) return "journalArticle";
	else return false;
}

function getSearchResults(doc, checkOnly) {
  let items = {};
  let found = false;
  
  rows = ZU.xpath(doc, '//h5/a[contains(@href, "article_id=")]');
  for (let row of rows) {
	if (row.textContent != "PDF") {
	let href = ZU.xpathText(row, './@href');
	let title = row.textContent;
	if (!href || !title) continue;
	if (checkOnly) return true;
	found = true;
	items[href] = title;
  }
  }
  return found ? items : false;
}

function getArticle(doc, url) {
	let infoTag = ZU.xpath(doc, '//div[@id="ww_ai_wrap"]')[0];
	item = new Zotero.Item('journalArticle');
	item.tags = [];
	item.title = ZU.xpathText(infoTag, './h2');
	for (let authorTag of ZU.xpath(infoTag, './/a[@class="vtip"]')) {
		item.creators.push(ZU.cleanAuthor(authorTag.textContent, "author"));
	}
	let issueInfo = ZU.xpathText(infoTag, './/a[contains(@href, "issue_id")]');
	if (issueInfo.match(/Vol\.?\s*(\d+).+No.?\s*(\d+).+(\d{4})/i)) {
		item.volume = issueInfo.match(/Vol\.?\s*(\d+).+No.?\s*(\d+).+(\d{4})/i)[1];
		item.issue = issueInfo.match(/Vol\.?\s*(\d+).+No.?\s*(\d+).+(\d{4})/i)[2];
		item.date = issueInfo.match(/Vol\.?\s*(\d+).+No.?\s*(\d+).+(\d{4})/i)[3];
		item.url = url;
		if (infoTag.textContent.match(/\d{4}\)(.+?)Download\s+Article\s+PDF/)) {
			item.abstractNote = infoTag.textContent.match(/\d{4}\)(.+?)Download\s+Article\s+PDF/)[1];
			if (item.abstractNote.match(/^Download\s+Article\s+PDF/)) item.abstractNote = "";
		}
		item.publicationTitle = "Word & World : Theology for Christian Ministry";
		item.notes.push('LF:');
		item.ISSN = "0275-5270";
		if (infoTag.textContent.match(/Article\s*Type:?\s+Review/i)) {
			item.tags.push('RezensionstagPica');
		}
	}
	item.complete();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, getArticle);
		});
	} else
		getArticle(doc, url);
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://wordandworld.luthersem.edu/issues.aspx?issue_id=166",
		"items": "multiple"
	}
]
/** END TEST CASES **/
