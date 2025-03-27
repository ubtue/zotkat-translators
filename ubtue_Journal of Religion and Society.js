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
	"lastUpdated": "2025-03-27 10:02:13"
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
		
		// Extract page numbers (e.g., "(pp. 1–4)")
		let pageMatch = title.match(/\(pp\.\s*(\d+)\s*–\s*(\d+)\)/i);
		let pages = pageMatch ? `${pageMatch[1]}-${pageMatch[2]}` : null;
		
		if (checkOnly) return true;
		found = true;
		items[href] = {
			title: title.replace(/\(pp\.\s*\d+\s*–\s*\d+\)/i, '').trim(), // Remove page info from title
			pages: pages
		};
	}
	return found ? items : false;
}

function doWeb(doc, url) {
    if (detectWeb(doc, url) == "multiple") {
        // Get items once and reuse them
        var searchResults = getSearchResults(doc, false);
        
        Zotero.selectItems(searchResults, function (selectedItems) {
            if (selectedItems) {
                // Preserve all original data including pages
                var itemsToProcess = {};
                for (let url in selectedItems) {
                    itemsToProcess[url] = searchResults[url];
                }
                processHandleUrls(itemsToProcess);
            }
        });
    }
    else {
        processHandleUrls({ 
            [url]: { 
                title: doc.title, 
                pages: null 
            } 
        });
    }
}

function processHandleUrls(items) {
    for (let url in items) {
        let handleId = url.split('/handle/')[1];
        let oaiUrl = `https://cdr.creighton.edu/oai/request?verb=GetRecord&metadataPrefix=dim&identifier=dim:cdr.creighton.edu:${handleId}`;
        
        // Add retry mechanism
        fetchWithRetry(oaiUrl, 3, 2000, function(response) {
            var parser = new DOMParser();
            var xml = parser.parseFromString(response, "text/xml");
            parseOAI(xml, url, items[url].pages, items[url].title);
        });
    }
}

// Retry function with exponential backoff
function fetchWithRetry(url, maxRetries, initialDelay, successCallback, errorCallback) {
    var retries = 0;
    
    function attemptFetch() {
        ZU.doGet(url, function(response) {
            successCallback(response);
        }, function(error) {
            retries++;
            if (retries < maxRetries) {
                var delay = initialDelay * Math.pow(2, retries - 1);
                Z.debug(`Retry ${retries}/${maxRetries} in ${delay}ms for ${url}`);
                setTimeout(attemptFetch, delay);
            } else {
                errorCallback(error);
            }
        });
    }
    
    attemptFetch();
}

function parseOAI(xml, url, storedPages, storedTitle) {
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

    // Language
    let langField = ZU.xpath(dimNode, './/dim:field[@element="title"]/@lang', ns);
    if (langField.length > 0) {
        item.language = langField[0].value.split('_')[0];
    }

    // ISSN
    item.ISSN = ZU.xpathText(dimNode, './/dim:field[@element="identifier"][@qualifier="issn"]', ns) || "1522-5658";
    
    // Pages - use stored value (from getSearchResults)
    item.pages = storedPages;
    
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
