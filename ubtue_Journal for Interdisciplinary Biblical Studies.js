{
	"translatorID": "757997c3-731e-4344-b312-7adecb8e99bf",
	"label": "ubtue_Journal for Interdisciplinary Biblical Studies",
	"creator": "Timotheus Kim",
	"target": "^https?://jibs\\.group\\.shef\\.ac\\.uk",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-12-01 13:22:29"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2021 Universitätsbibliothek Tübingen.

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
	var rows = doc.querySelectorAll('[href*="item"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
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
		//if the meta tags "citation_author" contains "Journal for Interdisciplinary Biblical Studies“ as authors. delete it from the creators field
		for (let i of item.creators) {
			if (i.firstName.match(/Journal for Interdisciplinary Biblical/i)) {
				delete i.firstName;
				delete i.lastName;
			}
		}
		let keywords = ZU.xpathText(doc, '//meta[@name="citation_keyword"]/@content');//Z.debug(keywords)
		if (keywords && keywords != null) {
			keywords = keywords.split(/\s*,\s*/);
			for (let keyword of keywords) {
			item.tags.push(keyword.replace(/^\w/gi,function(m){ return m.toUpperCase();}));
			}
		}
		let doi = ZU.xpathText(doc, '//meta[@name="citation_handle_id"]/@content');
		if (!item.DOI && doi) item.DOI = doi.replace('http://dx.doi.org/', '');
		if (!item.ISSN) item.ISSN = '2633-0695';
		if (!item.publicationTitle) item.publicationTitle = 'Journal for Interdisciplinary Biblical Studies';
		//scrape text from "notes:" field on the website because no structure metadata avaiable for date
		let date = ZU.xpathText(doc, "//*[contains(text(),'Date:')]//following-sibling::dd[1]");//Z.debug("date: " + date)
		if (!item.date && date.match(/\d{4}/)) item.date = date;
		//scrape text from "notes:" field on the website because no structure metadata avaiable for volumesIssuePageEntry
		let volumesIssuePageEntry = ZU.xpathText(doc, "//*[contains(text(),'Notes:')]//following-sibling::dd[1] | //*[contains(text(),'Abstract:')]//following-sibling::dd[1] | //a[@class='bp-deposits-download button']/@href").split(/Journal for Interdisciplinary Biblical Studies|jibs/i)[1].trim();//Z.debug("volumesIssuePageEntry: " + volumesIssuePageEntry)
		let reMatchVolume = /\d{1}/i;
		let volume = volumesIssuePageEntry.match(reMatchVolume)[0];//Z.debug("volume: " + volume)
		if (!item.volume && volume) item.volume = volume;
		let reSplitIssue = /\.|issue/i;//Z.debug(volumesIssuePageEntry)
		let issue = volumesIssuePageEntry.split(reSplitIssue)[1].trim().match(/^\d{1}/)[0];//Z.debug("issue: " + issue)
		if (!item.issue && issue) item.issue = issue;
		//four different seperator for page numbers
		let reSplitPages = /\W:|pp\.|pages|pp\-/;
		//two different hypen types for matching pages (-|–) from volumesIssuePageEntry
		if (!item.pages && volumesIssuePageEntry.split(reSplitPages).length > 1) item.pages = volumesIssuePageEntry.split(reSplitPages)[1].trim().replace(/\.$/, '').match(/\d+(-|–)\d+/).toString().replace(/,(-|–)$/, '');
		let url = ZU.xpathText(doc, '//meta[@property="og:url"]/@content');
		if (!item.url && itemUrl) item.url = url;
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
		"url": "https://jibs.group.shef.ac.uk/archive/volume-3/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://jibs.group.shef.ac.uk/volume-2/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://jibs.group.shef.ac.uk/volume-1/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://jibs.group.shef.ac.uk/archive/volume-3/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
