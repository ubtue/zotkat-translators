{
	"translatorID": "5e3f67c9-f4e5-4dc6-ad9a-93bf263a585a",
	"label": "Philosophy Documentation Center",
	"creator": "Madeesh Kannan",
	"target": "^https://www.pdcnet.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-10-20 17:26:12"
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
  if (url.includes('/jrv/')) {
	return "JournalArticle";
  } else
  if (url.includes('/collection-anonymous/')) {
	return "multiple";
  }
  return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "purchase", " " ))]');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let titles = ZU.trimInternal(rows[i].outerHTML);
		let title = titles.match(/Item_Title=.*&/)[0].split(';')[0].replace(/Item_Title=/, ''); //Z.debug(title)
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
		if (i.publicationTitle = 'Philotheos') i.ISSN = '2620-0163';
		i.complete();
		//postProcess(doc, i);
	});
	translator.translate();
}

/*function postProcess(doc, item) {
	let tagentry = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "toggleAbstract", " " ))]')
	if (tagentry) {
		item.tags.push("Book Reviews");
		
	}
		item.complete();
}*/
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.pdcnet.org/philotheos/content/philotheos_2019_0019_0002_0149_0165",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Investigating the terms of transition from a dialogue to dialectics in Plato’s Charmides",
				"creators": [
					{
						"firstName": "Christos",
						"lastName": "Terezis",
						"creatorType": "author"
					}
				],
				"date": "2019/10/01",
				"DOI": "10.5840/philotheos20191928",
				"ISSN": "2620-0163",
				"abstractNote": "In this article, following the introductory chapters of the Platonic dialogue Charmides (153a1-154b7), we attempt to investigate the terms of transition from a simple dialogue to dialectics. Interpreting the expressive means used, we attempt to explain how Plato goes from historicity to systematicity, in order to create the appropriate conditions to build a definition about a fundamental virtue as well as to set the criteria to be followed in a philosophical debate. Our study is divided in two sections, each of which is also divided in two subsections. In the first section, we investigate the historical context of the dialogue and the terms of transition from a single dialogue to dialectics. In the second section, we attempt to define according to Socrates’ judgments the mental and moral quality of the young men as well as the terms and conditions of the right interlocutor. At the end of each section, we present a table of concepts to bring to light the conceptual structures that Plato builds, which reveal the philosophical development in this dialogue.",
				"extra": "DOI: 10.5840/philotheos20191928",
				"issue": "2",
				"libraryCatalog": "www.pdcnet.org",
				"pages": "149-165",
				"publicationTitle": "Philotheos",
				"url": "https://www.pdcnet.org/pdc/bvdb.nsf/purchase?openform&fp=philotheos&id=philotheos_2019_0019_0002_0149_0165",
				"volume": "19",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
