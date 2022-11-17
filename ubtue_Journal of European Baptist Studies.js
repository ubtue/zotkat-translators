{
	"translatorID": "a97f8c1f-e6f5-46b5-8377-3abc9af1bb3c",
	"label": "ubtue_Journal of European Baptist Studies",
	"creator": "Timotheus Kim",
	"target": "^https?://(ojs2)?\\.uni-tuebingen\\.de/ojs/index\\.php/jebs/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-11-18 15:29:29"
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
	if (url.match(/\/issue\/view/) && getSearchResults(doc)) return "multiple";
	 else if(url.includes('/article/')) return "journalArticle";
	else return false
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "media-heading", " " ))]//a');
	for (let row of rows) {
		let href = row.href;
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
		if (i.pages.match(/^\d+–\d+-\d+–\d+/)) {
			let firstandlastpages = i.pages.split('–');
			i.pages = firstandlastpages[0] + '-' + firstandlastpages[2] ; // Z.debug(item.pages)
		}
		if (i.issue === "0") delete i.issue;
		//if (i.abstractNote.match(/No abstract available/)) delete i.abstractNote;
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
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://jebs.eu/ojs/index.php/jebs/article/view/265",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Relationship between State and Church",
				"creators": [
					{
						"firstName": "Uwe",
						"lastName": "Swarat",
						"creatorType": "author"
					}
				],
				"date": "2020/06/09",
				"ISSN": "1804-6444",
				"abstractNote": "Baptists have long stood for freedom of religion and of conscience, and these two are inextricably bound together with the relationship between church and state. This paper examines the following church-state models: the Eastern Church model of the established church; the Roman Catholic model of political theocracy; the theology and praxis of Martin Luther’s doctrine of the two regiments; the Reformed Christocratic mode; the Anabaptist model of strict separation of Christians from public affairs; and finally the Baptist model, which emphasises separation of church and state, but permits Christians to take on civil roles in society. The author concludes by pointing out the shortcomings of the state-church and theocratic models, preferring instead the Baptist model of state-church separation, which also attempts to implement Luther’s doctrine of the two regiments.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "jebs.eu",
				"pages": "9-29",
				"publicationTitle": "Journal of European Baptist Studies",
				"rights": "Copyright (c) 2020 Uwe Swarat",
				"url": "https://jebs.eu/ojs/index.php/jebs/article/view/265",
				"volume": "20",
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
				"tags": [
					{
						"tag": "Separation of church and state"
					},
					{
						"tag": "State church"
					},
					{
						"tag": "The doctrine of the two kingdoms"
					},
					{
						"tag": "Theocracy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
