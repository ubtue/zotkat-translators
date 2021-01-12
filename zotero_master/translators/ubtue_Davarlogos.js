{
	"translatorID": "1bab66b7-fa6d-4004-80bb-a7127beddec3",
	"label": "ubtue_Davarlogos",
	"creator": "Timotheus Kim",
	"target": "^http(s)?://publicaciones\\.uap\\.edu\\.ar/index\\.php/davarlogos/(article|issue)/view",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-10-06 14:42:42"
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
	if (url.match(/article/)) return "journalArticle";
		else if (url.match(/\/issue\/view/)) return "multiple";
	else return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "title", " " ))]//a')
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function postProcess(doc, item) {
	let authors = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "authors", " " ))]')
	if (item.creators.length===0) {
		for (let author of authors) {
			item.creators.push(ZU.cleanAuthor(author.textContent, "author"));
		}
	}
	
	let tagentry = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "keywords", " " ))]//*[contains(concat( " ", @class, " " ), concat( " ", "value", " " ))]');
	if (tagentry) {
		let tags = ZU.unescapeHTML(tagentry.split(/\s*,\s*/));
			for (var i in tags) {
				item.tags.push(tags[i].replace(/^\w/gi,function(m){return m.toUpperCase();}));
		}
	}
	
	if (!item.abstractNote) {
		item.abstractNote = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "item abstract", " " ))]');
		if (item.abstractNote && item.abstractNote.length > 0)
			item.abstractNote = ZU.unescapeHTML(item.abstractNote[0].textContent.trim().replace('Resumen', ''));
	}
	let yearVolumeIssueEntry = ZU.xpathText(doc, '//ol');
	let volume = yearVolumeIssueEntry.split('/')[2].split('Núm.')[0].replace('Vol.', '');
	if (volume) item.volume = volume;
	let issue = yearVolumeIssueEntry.split('/')[2].split('Núm.')[1].split('\(')[0];
	if (issue) item.issue = issue;
	let year = yearVolumeIssueEntry.split('/')[2].split('Núm.')[1].split('\(')[1].split('\)')[0];
	if (year) item.date = year;
	item.url = attr(doc, '.pdf', 'href');
	item.ISSN = '1666-7832';
	item.itemType = 'journalArticle';
	let title = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "subtitle", " " ))] | //*[contains(concat( " ", @class, " " ), concat( " ", "page_title", " " ))]');
	if(title) item.title = title;
	item.complete();
}

function invokeEMTranslator(doc, item) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(doc, i);
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
