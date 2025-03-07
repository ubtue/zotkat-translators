{
	"translatorID": "dde9787d-9ab5-4c49-808c-ec7bf0f0bb8e",
	"label": "ubtue_Journal of Religion and Society",
	"creator": " Timotheus Kim",
	"target": "^https?://(www\\.)?(moses)?\\.creighton\\.edu/JRS",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-07 13:57:58"
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
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var links = doc.querySelectorAll('a[href*="handle"]');
	var text = doc.querySelectorAll('.title, .books a');
	if (text.length === 0) {
		text = doc.querySelectorAll('p.chap');
	}	
	for (let i = 0; i < text.length; ++i) {
		let href = links[i].href;
		if (href.match(/handle/)) href = 'https://cdr.creighton.edu/handle/' + links[i].href.split(/handle\//)[1].split(/\/\d{4}-.*.pdf/)[0];
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
			if (items) {
				processHandleUrls(Object.keys(items));
			}
		});
	}
	else {
		processHandleUrls([url]);
	}
}

function processHandleUrls(urls) {
	for (let url of urls) {
		// Convert handle URL to OAI identifier
		// use Format "dim" https://cdr.creighton.edu/server/oai/request?verb=ListMetadataFormats
		// e.g. https://cdr.creighton.edu/oai/request?verb=GetRecord&metadataPrefix=dim&identifier=dim:cdr.creighton.edu:10504/154065
		let handleId = url.split('/handle/')[1];
		let oaiUrl = `https://cdr.creighton.edu/oai/request?verb=GetRecord&metadataPrefix=dim&identifier=dim:cdr.creighton.edu:${handleId}`;
		
		ZU.doGet(oaiUrl, function(response) {
			// Process XML response
			var parser = new DOMParser();
			var xml = parser.parseFromString(response, "text/xml");
			parseOAI(xml, url);
		});
	}
}

function parseOAI(xml, url) {
	var item = new Zotero.Item("journalArticle");
	
	var ns = {
		'dim': 'http://www.dspace.org/xmlns/dspace/dim'
	};
	
	var dimNode = ZU.xpath(xml, '//dim:dim', ns)[0];
	if (!dimNode) return;
	
	// Title
	item.title = ZU.xpathText(dimNode, './/dim:field[@element="title" and not(@qualifier)]', ns);
	
	// Authors
	var authors = ZU.xpath(dimNode, './/dim:field[@element="contributor"][@qualifier="author"]', ns);
	for (let authorNode of authors) {
		item.creators.push(ZU.cleanAuthor(authorNode.textContent, "author", true));
	}
	
	// Date
	item.date = ZU.xpathText(dimNode, './/dim:field[@element="date"][@qualifier="issued"]', ns);
	
	// Abstract
	item.abstractNote = ZU.xpathText(dimNode, './/dim:field[@element="description"][@qualifier="abstract"]', ns);
	
	// Volume
	item.volume = ZU.xpathText(dimNode, './/dim:field[@element="description"][@qualifier="volume"]', ns);

	// Subjects/Tags
	var subjects = ZU.xpath(dimNode, './/dim:field[@element="subject"][not(@qualifier)]', ns);
	for (let subjectNode of subjects) {
		item.tags.push(subjectNode.textContent.trim());
	}
	
	// Journal Title
	item.publicationTitle = ZU.xpathText(dimNode, './/dim:field[@element="source"]', ns);
	
	// URL
	item.url = url;

	// Language - get it from the title field's lang attribute
	let langField = ZU.xpath(dimNode, './/dim:field[@element="title"]/@lang', ns);
	if (langField.length > 0) {
		item.language = langField[0].value.split('_')[0]; // converts 'en_US' to 'en'
	}

	// ISSN
	item.ISSN = ZU.xpathText(dimNode, './/dim:field[@element="identifier"][@qualifier="issn"]', ns);
	item.ISSN = item.ISSN || "1522-5658";
	
	item.complete();
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
	},
	{
		"type": "web",
		"url": "http://moses.creighton.edu/JRS/toc/2016.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://cdr.creighton.edu/items/ed690a94-8999-4405-8bfd-661b1d0bec31",
		"detectedItemType": false,
		"items": []
	}
]
/** END TEST CASES **/
