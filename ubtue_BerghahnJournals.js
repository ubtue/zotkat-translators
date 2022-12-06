{
	"translatorID": "a685c846-fc0a-4988-8a25-56dbd550a516",
	"label": "ubtue_BerghahnJournals",
	"creator": "Madeesh Kannan",
	"target": "^https?://www.berghahnjournals.com/view/journals/.*/[0-9]+/[0-9]+/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-12-06 10:14:13"
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

function detectWeb(doc, url) {
	if (url.match(/\/view\/journals\//) && url.match(/issue|volume/i) && getSearchResults(doc, url)) return "multiple";
	else if (url.match(/\/view\/journals\//)) return "journalArticle";
}

function getSearchResults(doc, url) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//li[contains(@class,"type-article")]//a[contains(@href, "/view/journals/")]');
	
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent).replace(/pdf/i, '');
		let exclude = ['HTML', 'XML', 'EPUB', 'PDF'];
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");   // Embedded Metadata
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		i.itemType = "journalArticle";
		// add keywords
		var keywords;
		if (keywords = ZU.xpath(doc, '//p[contains(@class, "articleBody_keywords")]//a'))
			i.tags = keywords.map(n => n.textContent);
		i.attachments = [];
		i.title = ZU.xpathText(doc, '//meta[@name="citation_title"]/@content');
		if (i.title.match(/^Review/i)) i.tags.push('RezensionstagPica');
		i.DOI = ZU.xpathText(doc, '//meta[@name="citation_doi"]/@content');
		if (ZU.xpathText(doc, '//meta[@name="citation_journal_title"]/@content') == "Religion and Society") {
			i.ISSN = "2150-9301";
			i.publicationTitle = "Religion and Society";
		}
		if (!i.issue) {
			i.issue = ZU.xpathText(doc, '//meta[@name="citation_issue"]/@content');
		}
		if (!i.volume) {
			i.volume = ZU.xpathText(doc, '//meta[@name="citation_volume"]/@content');
		}
		if (!i.pages) {
			i.pages = ZU.xpathText(doc, '//meta[@name="citation_firstpage"]/@content') + '-' + ZU.xpathText(doc, '//meta[@name="citation_lastpage"]/@content');
		}
		if (!i.date) {
			i.date = ZU.xpathText(doc, '//meta[@name="citation_publication_date"]/@content');
		}
		if (ZU.xpathText(doc, '//a[@rel="license"]/@href') && ZU.xpathText(doc, '//a[@rel="license"]/@href').match('creativecommons')) {
			i.notes.push('LF:');
		}
		if (i.abstractNote) i.abstractNote = i.abstractNote.replace(/^abstract:?\s*/i, '');
		i.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc, url), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else
		invokeEMTranslator(doc);
}/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
