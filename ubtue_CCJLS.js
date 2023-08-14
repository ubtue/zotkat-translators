{
	"translatorID": "6856341c-97a9-4940-9877-97685d65a222",
	"label": "ubtue_CCJLS",
	"creator": "Paula Hähndel",
	"target": "https://ccjls.scholasticahq.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-14 13:02:17"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Universitätsbibliothek Tübingen.  All rights reserved.
	Modified 2023 by Paula Hähndel
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
	if (url.includes("article")) {
		return "journalArticle";
	} else if (getSearchResults(doc)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//a[@class="article-title"]');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (title.includes("Front Matter")) continue;
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
  if (detectWeb(doc, url) == "multiple") {
	Zotero.selectItems(getSearchResults(doc, url, false), function (items) {
	  if (items) ZU.processDocuments(Object.keys(items), scrape);
	});
  } else
  {
	scrape(doc, url);
  }
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		i.itemType = "journalArticle";
		if (i.pages) i.pages = i.pages.trim().replace(/^([^-]+)-\1$/, '$1');
		if (ZU.xpathText(doc, '//meta[@name="citation_copyright"]/@content')) { 
			if (ZU.xpathText(doc, '//meta[@name="citation_copyright"]/@content').trim() == "no_license") {
				i.notes.push({"note": "LF"});
			}
		}
		/*if (ZU.xpathText(doc, '//div[@id="abstract_de"]//p')) {
			i.abstract = ZU.xpathText(doc, '//div[@id="abstract_de"]//p');
		}*/
		/*if (ZU.xpathText(doc, '//section[@class="section"]//a') && ZU.xpathText(doc, '//section[@class="section"]//a').includes("Review")) {
			i.notes.push({"note": "RezensionstagPica"})
		}*/
		i.attachments = [];
		let sideText = ZU.xpathText(doc, '//script');
		if (sideText.includes("e_issn")) {
			i.ISSN = sideText.match(/e_issn\":\"([^\"]+)\"/)[1];
		}
		i.complete();
	});
	translator.translate();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ccjls.scholasticahq.com/issue/3769",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Vol. 22, Issue 3, 2021 | Published by Criminology, Criminal Justice, Law & Society",
				"creators": [],
				"ISSN": "2332-886X",
				"abstractNote": "This issue contains four feature articles.",
				"language": "en",
				"libraryCatalog": "ccjls.scholasticahq.com",
				"url": "https://ccjls.scholasticahq.com/issue/3769",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ccjls.scholasticahq.com/article/30143-war-stories-analyzing-memoirs-and-autobiographical-treatments-written-by-american-correctional-professionals",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "War Stories? Analyzing Memoirs and Autobiographical Treatments Written by American Correctional Professionals",
				"creators": [
					{
						"firstName": "Jeffrey Ian",
						"lastName": "Ross",
						"creatorType": "author"
					},
					{
						"firstName": "Richard",
						"lastName": "Tewksbury",
						"creatorType": "author"
					},
					{
						"firstName": "Lauren",
						"lastName": "Samuelsen",
						"creatorType": "author"
					},
					{
						"firstName": "Tiara",
						"lastName": "Caneff",
						"creatorType": "author"
					}
				],
				"date": "2021/11/30",
				"DOI": "10.54555/ccjls.3769.30143",
				"ISSN": "2332-886X",
				"abstractNote": "Over the past century, many American correctional professionals (including correctional officers, wardens, and support staff) have written memoirs and autobiographies that described their experiences working at one or more facilities. Although the number of books of this nature pales in comparison to those that have been written and published by convicts and exconvicts, enough of them have been released in order to warrant a more in-depth analysis. This article presents the results of a content analysis of 30 English language, American based memoirs/autobiographies published between 1996 and 2017, on 14 variables. Not only does this study contextualize these books, but it also provides an analytic framework for their review. The conclusion points out areas where continued scholarship on this topic may be conducted. In particular, the article argues that more first-hand treatments need to be conducted on the prison institution by current or former correctional professionals who have experience working inside correctional institutions.",
				"issue": "3",
				"journalAbbreviation": "CCJLS",
				"language": "en",
				"libraryCatalog": "ccjls.scholasticahq.com",
				"publicationTitle": "Criminology, Criminal Justice, Law & Society",
				"shortTitle": "War Stories?",
				"url": "https://ccjls.scholasticahq.com/article/30143-war-stories-analyzing-memoirs-and-autobiographical-treatments-written-by-american-correctional-professionals",
				"volume": "22",
				"attachments": [],
				"tags": [
					{
						"tag": "correctional officers"
					},
					{
						"tag": "correctional professionals"
					},
					{
						"tag": "first-hand accounts"
					},
					{
						"tag": "memoirs"
					}
				],
				"notes": [
					{
						"note": "LF"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
