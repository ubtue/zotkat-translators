{
	"translatorID": "dde9787d-9ab5-4c49-808c-ec7bf0f0bb8e",
	"label": "ubtue_Journal of Religion and Society",
	"creator": " Timotheus Kim",
	"target": "^https?://(www\\.)?moses\\.creighton\\.edu/JRS",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-11-17 14:46:21"
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
	//like ubtue_Quaderni di storia religiosa medievale.js 
	var links = doc.querySelectorAll('a[href*="handle"]');
	var text = doc.querySelectorAll('.title, .books a');
	for (let i = 0; i < links.length; ++i) {
		let href = links[i].href;
		if (href.match(/handle/)) href = 'http://hdl.handle.net/' + links[i].href.split(/handle\//)[1].split(/\/\d{4}-.*.pdf/)[0];Z.debug(href)
		let title = ZU.trimInternal(text[i].textContent);
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
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	// translator.setDocument(doc);
	translator.setHandler('itemDone', function (obj, item) {
		let handlePID = ZU.xpathText(doc, '//meta[@name="DC.identifier" and @scheme="DCTERMS.URI"]/@content');
		if (handlePID) item.notes.push({note: 'handle:' + handlePID});
		//volume number are stored unusually in DC.description, therefore it should be checked for the presence of numbers
		let itemVolume = ZU.xpathText(doc, '//meta[@name="DC.description"]/@content');
		if (itemVolume && itemVolume.match(/^\d+/)) item.volume = itemVolume;
		let abstractKeywordsEntry = ZU.xpathText(doc, '//meta[@name="DCTERMS.abstract"]/@content');
		if (abstractKeywordsEntry && abstractKeywordsEntry !== null) item.abstractNote = abstractKeywordsEntry.split('|Keywords: ')[0];
		if (abstractKeywordsEntry && abstractKeywordsEntry !== null) {
			let keywords = abstractKeywordsEntry.split('|Keywords: ')[1].split(',');
			if (keywords && keywords !== null) {
				for (let k of keywords) {
					item.tags.push(k.trim().replace(/^\w/gi,function(m){ return m.toUpperCase();}));
				}	
			}		
		}
		//search and remove keyword "Journal Article" 
		item.tags = item.tags.filter(e => e !== 'Journal Article');
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "journalArticle";
		trans.doWeb(doc, url);
	});
}



/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://moses.creighton.edu/JRS/toc/2016.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://moses.creighton.edu/JRS/toc/Supplement.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://moses.creighton.edu/JRS/toc/SS17.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://moses.creighton.edu/JRS/toc/2021.html",
		"items": "multiple"
	}
]
/** END TEST CASES **/
