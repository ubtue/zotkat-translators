{
	"translatorID": "f5e796cb-0d76-475c-b9b0-f657a39d8ff0",
	"label": "ubtue_RHPR",
	"creator": "Timotheus Kim",
	"target": "^https?://classiques-garnier\\.com",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 80,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2020-08-19 15:07:42"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.
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
	if (url.match(/revue/) && getSearchResults(doc)) return "multiple";
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "titleInfo", " " ))]');
	for (let row of rows) {
		let href = row.innerHTML.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/)[0];
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		
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
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else
		invokeEMTranslator(doc, url);
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://search.library.utoronto.ca/search?N=0&Ntk=Anywhere&Ntt=nimni+challenge+of+post-zionism&Ntx=mode%252Bmatchallpartial&Nu=p_work_normalized&Np=1&formName=search_form_simple",
		"items": [
			{
				"itemType": "book",
				"title": "The challenge of Post-Zionism: alternatives to Israeli fundamentalist politics",
				"creators": [
					{
						"firstName": "Ephraim",
						"lastName": "Nimni",
						"creatorType": "editor"
					}
				],
				"date": "2003",
				"ISBN": "9781856498937 9781856498944",
				"callNumber": "DS113.4 .C45 2003",
				"extra": "OCLC: 50670646",
				"libraryCatalog": "search.library.utoronto.ca",
				"numPages": "209",
				"place": "London ; New York",
				"publisher": "Zed Books",
				"series": "Postcolonial encounters",
				"shortTitle": "The challenge of Post-Zionism",
				"attachments": [],
				"tags": [
					{
						"tag": "Israel"
					},
					{
						"tag": "National characteristics, Israeli"
					},
					{
						"tag": "Philosophy"
					},
					{
						"tag": "Politics and government"
					},
					{
						"tag": "Post-Zionism"
					},
					{
						"tag": "Zionism"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://search.library.utoronto.ca/search?N=0&Ntk=Anywhere&Ntt=adam+smith&Ntx=mode%252Bmatchallpartial&Nu=p_work_normalized&Np=1&formName=search_form_simple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://demo1.orex.es/cgi-bin/koha/opac-detail.pl?biblionumber=3",
		"items": [
			{
				"itemType": "book",
				"title": "Carlota Fainberg",
				"creators": [
					{
						"firstName": "Antonio",
						"lastName": "Muñoz Molina",
						"creatorType": "author"
					}
				],
				"date": "1999",
				"ISBN": "9788420441610",
				"libraryCatalog": "demo1.orex.es",
				"numPages": "174",
				"place": "Madrid",
				"publisher": "Alfaguara",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
