{
	"translatorID": "b60e74db-2e5d-4b2a-94ac-f484737364b1",
	"label": "ubtue_Open Journal Systems Multi-Wrapper",
	"creator": "Madeesh Kannan",
	"target": "/(article|issue)/(view)?",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-06-02 09:53:22"
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
	if (url.match(/\/issue\/view/) && getSearchResults(doc))
		return "multiple";
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//a[contains(@href, "/article/view/") and not(contains(@href, "/pdf"))]')
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);

		if (!href || !title)
			continue;
		if (title.match(/PDF|EPUB|XML|HTML|Download Full Text/i))
			continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function invokeBestTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setDocument(doc);
	translator.setHandler("translators", function (o, valid_translators) {
		if (valid_translators && valid_translators.length > 0) {
			translator.setTranslator(valid_translators);
			translator.translate();
		}
	});
	translator.setHandler("itemDone", function (t, item) {
		if (item.issue === "0")
			item.issue = "";

		if (item.volume === "0")
			item.volume = "";
		
		var authorNames = ZU.xpath(doc, '//meta[@name = "DC.Creator.PersonalName"]');
		newCreators = [];
		for (let entry in authorNames) {
			var authorName = authorNames[entry].content;
			if (authorName.match(/\(review/i)) {
				authorName = authorName.substring(0, authorName.indexOf(" ("));
			newCreators.push(ZU.cleanAuthor(authorName, "author")) ;
			item.tags.push("RezensionstagPica");
			}
			else if (authorName.match(/\(book/i)) {
				item.title = authorName.substring(0, authorName.indexOf(" (")) + ', ' + item.title;
			}
		}
		if (newCreators.length != 0) {
			item.creators = newCreators;
		}
		
		if (item.ISSN === "1893-4773") {
			var articleType = ZU.xpath(doc, '//meta[@name = "DC.Type.articleType"]');
			if (articleType) {
				if (articleType[0]['content'] == "Bokanmeldelser"){
					item.tags.push("RezensionstagPica");
				}
			}
			
		}
		
		item.complete();
	});
	translator.getTranslators();
}

function doWeb(doc, url) {
	let items = getSearchResults(doc);
	if (items) {
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			let articles = [];
			for (let i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeBestTranslator);
		});
	} else {
		// attempt to skip landing pages for issues.
		let tocLinks = ZU.xpath(doc, '//a[contains(@href, "/issue/view/") and not(contains(@href, "/pdf"))]')
		for (let entry in tocLinks) {
			let link = tocLinks[entry].href;
			if (link.match(/\/issue\/view\/\d+\/showToc$/i)) {
				ZU.processDocuments([link], invokeBestTranslator);
				break;
			}
		}
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://jps.library.utoronto.ca/index.php/renref/issue/view/1976",
		"items": "multiple"
	}
]
/** END TEST CASES **/
