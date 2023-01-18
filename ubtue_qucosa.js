{
	"translatorID": "08f8f45c-6889-4fe0-bb57-aa7e5a503051",
	"label": "ubtue_qucosa",
	"creator": "Helena Nebel",
	"target": "slub.qucosa.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-12-20 15:50:42"
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
	if (getSearchResults(doc)) return "multiple";
		else return "journalArticle";
}

function getSearchResults(doc) {
	if (ZU.xpathText(doc, '//dd[preceding-sibling::dt[contains(., "Dokumenttyp")]][1]')) {
		if (!ZU.xpathText(doc, '//dd[preceding-sibling::dt[contains(., "Dokumenttyp")]][1]').match(/Zeitschriftenheft/)) {
			return false;
		}
	}
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//span[contains(@class,"related-items")]//li/a[contains(@href, "slub.qucosa.de")]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function postProcess(doc, item) {
	if (ZU.xpathText(doc, '//dd[preceding-sibling::dt[contains(., "Freie Schlagwörter")]][1]')) {
		let tagentry = ZU.xpathText(doc, '//dd[preceding-sibling::dt[contains(., "Freie Schlagwörter")]][1]');
		let tags = tagentry.split(/\s*,|;\s*/);
			for (let i in tags){
				item.tags.push(tags[i].replace(/^\w/gi,function(m){return m.toUpperCase();}));
		}
	}
	if (ZU.xpathText(doc, '//dd[preceding-sibling::dt[contains(., "Normschlagwörter")]][1]')) {
		let tagentry = ZU.xpathText(doc, '//dd[preceding-sibling::dt[contains(., "Normschlagwörter")]][1]');
		let tags = tagentry.split(/\s*,|;\s*/);
			for (let i in tags){
				if (!item.tags.includes(tags[i].replace(/^\w/gi,function(m){return m.toUpperCase();}))) {
					item.tags.push(tags[i].replace(/^\w/gi,function(m){return m.toUpperCase();}));
			}
		}
	}
	if (ZU.xpathText(doc, '//dd[preceding-sibling::dt[contains(., "URN Qucosa")]][1]')) {
		let urn = ZU.xpathText(doc, '//dd[preceding-sibling::dt[contains(., "URN Qucosa")]][1]');
		item.notes.push('urn:' + urn);
		if (!item.url) item.url = "https://nbn-resolving.org/" + urn;
	}
	
	item.attachments = [];
	item.complete();
}

function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("05d07af9-105a-4572-99f6-a8e231c0daef");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(doc, i);
		//i.complete();
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
]
/** END TEST CASES **/
