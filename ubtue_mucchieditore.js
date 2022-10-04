{
	"translatorID": "cbdf96cd-29f3-4272-bf16-326f9e469ab8",
	"label": "ubtue_mucchieditore",
	"creator": "Helena Nebel",
	"target": "https://www.mucchieditore.it/index.php\\?option=com_virtuemart",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-10-04 16:49:02"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016 Sebastian Karcher

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
function getDOIs(doc) {
	// TODO Detect DOIs more correctly.
	// The actual rules for DOIs are very lax-- but we're more strict.
	// Specifically, we should allow space characters, and all Unicode
	// characters except for control characters. Here, we're cheating
	// by not allowing ampersands, to fix an issue with getting DOIs
	// out of URLs.
	// Additionally, all content inside <noscript> is picked up as text()
	// by the xpath, which we don't necessarily want to exclude, but
	// that means that we can get DOIs inside node attributes and we should
	// exclude quotes in this case.
	// DOI should never end with a period or a comma (we hope)
	// Description at: http://www.doi.org/handbook_2000/appendix_1.html#A1-4
	const DOIre = /\b10\.[0-9]{4,}\/[^\s&"']*[^\s&"'.,]/g;

	var dois = [];

	var m, DOI;
	var treeWalker = doc.createTreeWalker(doc.documentElement, 4, null, false);
	var ignore = ['script', 'style'];
	while (treeWalker.nextNode()) {
		if (ignore.includes(treeWalker.currentNode.parentNode.tagName.toLowerCase())) continue;
		// Z.debug(node.nodeValue)
		DOIre.lastIndex = 0;
		while ((m = DOIre.exec(treeWalker.currentNode.nodeValue))) {
			DOI = m[0];
			if (DOI.endsWith(")") && !DOI.includes("(")) {
				DOI = DOI.substr(0, DOI.length - 1);
			}
			if (DOI.endsWith("}") && !DOI.includes("{")) {
				DOI = DOI.substr(0, DOI.length - 1);
			}
			// only add new DOIs
			if (!dois.includes(DOI)) {
				dois.push(DOI);
			}
		}
	}
	
	// FIXME: The test for this (developmentbookshelf.com) fails in Scaffold due
	// to a cookie error, though running the code in Scaffold still works
	var links = doc.querySelectorAll('a[href]');
	for (let link of links) {
		DOIre.lastIndex = 0;
		let m = DOIre.exec(link.href);
		if (m) {
			let doi = m[0];
			if (doi.endsWith(")") && !doi.includes("(")) {
				doi = doi.substr(0, doi.length - 1);
			}
			if (doi.endsWith("}") && !doi.includes("{")) {
				doi = doi.substr(0, doi.length - 1);
			}
			// only add new DOIs
			if (!dois.includes(doi)) {
				dois.push(doi);
			}
		}
	}

	return dois;
}

function detectWeb(doc, url) {
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//ul/li[contains(div/a/@href, "product_id=")]');
	for (var i = 0; i < rows.length; i++) {
		var href = ZU.xpathText(rows[i], './div/a[contains(@href, "product_id")]/@href');
		var title = ZU.trimInternal(rows[i].textContent.split('- DOI')[0]);
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
				return;
			}
			var articles = [];
			for (let i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
}


function scrape(doc, url) {
	let doi = getDOIs(doc)[0];
	invokeDOI(doc, doi);
}

function invokeDOI(doc, doi) {
	
		const translate = Zotero.loadTranslator("search");
		translate.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");
		translate.setSearch({ itemType: "journalArticle", DOI: doi });
		translate.setHandler("itemDone", function (_translate, item) {
			let description = ZU.xpathText(doc, '//div[@class="product-description"]')
			if (description && description.match(/pp?\.\s*\d+-\d+/)) {
				item.pages = description.match(/pp?\.\s*(\d+-\d+)/)[1];
			}
			item.complete();
		});
		translate.translate();
}





/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://blog.apastyle.org/apastyle/digital-object-identifier-doi/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://libguides.csuchico.edu/citingbusiness",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.egms.de/static/de/journals/mbi/2015-15/mbi000336.shtml",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.roboticsproceedings.org/rss09/p23.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://en.wikipedia.org/wiki/Template_talk:Doi",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.developmentbookshelf.com/action/showPublications",
		"items": "multiple"
	}
]
/** END TEST CASES **/
