{
	"translatorID": "8f0d9d23-f26e-4504-a022-6e39c9274744",
	"label": "ubtue_georgefox",
	"creator": "Helena Nebel",
	"target": "georgefox.edu\\/.+\\/vol.+\\/iss.+\\/",
	"minVersion": "3.0.4",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-05-25 09:39:09"
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
	if (url.match(/\/iss/) && getSearchResults(doc, true)) {
		return "multiple";
	} 
	else return "journalArticle";
}

function getSearchResults(doc, checkOnly) {
  let items = {};
  let found = false;
  
  rows = ZU.xpath(doc, '//div[@class="doc"]//a');
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

function invokeEmbeddedMetadataTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		if (ZU.xpath(doc, '//div[@id="authors"]') != null) {
				let html = ZU.xpath(doc, '//body')[0].innerHTML.replace(/\n/g, '');
				if (html.match(/<p class="author"><a href=.+?><strong>(.+?)<\/strong>.+?<div id="orcid" class="element"><h4>Author ORCID Identifier<\/h4><p>ORCID: https:\/\/orcid.org\/(.+?)<\/p><\/div>/) != null) {
					let orcidInformation = html.match(/<p class="author"><a href=.+?><strong>(.+?)<\/strong>.+?<div id="orcid" class="element"><h4>Author ORCID Identifier<\/h4><p>ORCID: https:\/\/orcid.org\/(.+?)<\/p><\/div>/);
					let author = orcidInformation[1];
					let orcid = orcidInformation[2];
					i.notes.push({note:  author + ' | orcid:' + orcid + ' | ' + 'taken from website'});
		}
		}
		if (i.ISSN == "2693-2148") {
			i.notes.push('artikelID:' + i.pages);
			i.pages = '';
			if (i.title.match(/^Book\s+review/gi) != null) i.tags.push('RezensionstagPica');
			}
		i.attachments = [];
		i.complete();
	});
	translator.translate();
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
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
	} else
		invokeEmbeddedMetadataTranslator(doc, url);
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://digitalcommons.georgefox.edu/ree/vol42/iss1/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://digitalcommons.georgefox.edu/ree/vol42/iss1/2/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Aspects of the Holocaust During the Slovak Autonomy Period (October 6, 1938, to March 14, 1939)",
				"creators": [
					{
						"firstName": "Madeline",
						"lastName": "Vadkerty",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.55221/2693-2148.2315",
				"ISSN": "2693-2148",
				"abstractNote": "Antisemitism was not a new phenomenon in Slovakia and can be traced back to the Middle Ages and beyond. Looking at the more recent past, after the Austro-Hungarian Compromise in 1867, Jews became equal citizens in the eyes of the state. The Hungarian Parliament passed an Act of Emancipation for Jews that same year, mainly for the purpose of economic development, which was beneficial for the Jewish population. A year later, Hungary's Nationality Act was issued as part of an active policy of magyarization (Hungarianization). However, it did not affect Jews, who were considered a religious group and not a national group. Jews thrived under these new conditions, but ethnic and national groups, such as the Slovaks who were subjected to the new legislation, possessed only limited linguistic and cultural rights.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "digitalcommons.georgefox.edu",
				"publicationTitle": "Occasional Papers on Religion in Eastern Europe",
				"url": "https://digitalcommons.georgefox.edu/ree/vol42/iss1/2",
				"volume": "42",
				"attachments": [],
				"tags": [],
				"notes": [
					"artikelID:2"
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
