{
	"translatorID": "eef070eb-efe9-4f32-8a8b-f5b1d0a61e43",
	"label": "ubtue_Musik und Gottesdienst",
	"creator": "Timotheus Kim",
	"target": "https?://www\\.rkv\\.ch/zeitschrift/category",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-25 14:31:37"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2021 Timotheus Kim
	
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

function detectWeb(doc, url) {
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.jd_content_wrapper');
	for (let row of rows) {
		let title = text(row, '.author') + ' | ' + text(row, '.title') + ' | ' +  'https://www.rkv.ch' + attr(row, 'a', 'href') + ' | ' + row.baseURI;
		let href = row.innerHTML;
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
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
				scrape(doc, items[i]);
			}
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, text) {
	var item = new Zotero.Item('journalArticle');
	var str = text.replace(/Übersetzt und überarbeitet von|\(Nachtrag I\)|\(Nachtrag II\)/gi, '').split('|');
	let authors = str[0].split(/und|,|&|\//);
	for (let author of authors) {
		item.creators.push(ZU.cleanAuthor(author, "author"));

	}
		item.title = str[1].toString();
		item.url = str[2].toString();
		item.volume = str[3].match(/\d{2}/).toString();
		item.date = str[3].match(/\d{4}/).toString();
		item.ISSN = "1015-6798";
		item.notes.push({note: "LF"});
		item.publicationTitle = "Musik und Gottesdienst";
		item.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.rkv.ch/zeitschrift/category/18-2019",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.rkv.ch/zeitschrift/category/21-2020",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.rkv.ch/zeitschrift/category/22-2021",
		"items": "multiple"
	}
]
/** END TEST CASES **/
