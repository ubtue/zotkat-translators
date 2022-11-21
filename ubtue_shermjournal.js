{
	"translatorID": "547b660c-ce13-4979-8f7e-b865187a2763",
	"label": "ubtue_shermjournal",
	"creator": "Helena Nebel",
	"target": "shermjournal.org\\/vol",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-21 16:30:10"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Simon Kornblith

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

// builds a list of DOIs
var dois = [];
function getDOIs(doc) {
	dois = [ZU.xpathText(doc, '//span[contains(., "DOI: ")]').replace("DOI: ", "")];
	const DOIre = /\b10\.[0-9]{4,}\/[^\s&"']*[^\s&"'.,]/g;
	var rows = ZU.xpath(doc, '//div[@role="listitem"]');
	for (var i = 0; i < rows.length; i++) {
		var href = ZU.xpathText(rows[i], './descendant::a/@href');
		var title = ZU.trimInternal(ZU.xpathText(rows[i], './/h2/span'));
		let doi = rows[i].textContent.match(DOIre);
		if (!href || !title || !doi) continue;
		if (doi[0]) doi = doi[0].replace(/[^\d]+$/g, '');
		dois.push(doi);
	}
	return dois;
}

function detectWeb(doc, url) {
	// Blacklist the advertising iframe in ScienceDirect guest mode:
	// http://www.sciencedirect.com/science/advertisement/options/num/264322/mainCat/general/cat/general/acct/...
	// This can be removed from blacklist when 5c324134c636a3a3e0432f1d2f277a6bc2717c2a hits all clients (Z 3.0+)
	const blacklistRe = /^https?:\/\/[^/]*(?:google\.com|sciencedirect\.com\/science\/advertisement\/)/i;
	
	if (!blacklistRe.test(url)) {
		var DOIs = getDOIs(doc);
		if (DOIs.length) {
			return "multiple";
		}
	}
	return false;
}

function retrieveDOIs(dois) {
	let items = {};
	let numDOIs = dois.length;

	for (const doi of dois) {
		items[doi] = null;
		
		const translate = Zotero.loadTranslator("search");
		translate.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");
		translate.setSearch({ itemType: "journalArticle", DOI: doi });
	
		// don't save when item is done
		translate.setHandler("itemDone", function (_translate, item) {
			if (!item.title) {
				Zotero.debug("No title available for " + item.DOI);
				item.title = "[No Title]";
			}

			items[item.DOI] = item;
		});
		/* eslint-disable no-loop-func */
		translate.setHandler("done", function () {
			numDOIs--;
			
			// All DOIs retrieved
			if (numDOIs <= 0) {
				// Check to see if there's at least one DOI
				if (!Object.keys(items).length) {
					throw new Error("DOI Translator: could not find DOI");
				}
				
				// Only show items that resolved successfully
				let select = {};
				for (let doi in items) {
					let item = items[doi];
					if (item) {
						select[doi] = item.title || "[" + item.DOI + "]";
					}
				}
				Zotero.selectItems(select, function (selectedDOIs) {
					if (!selectedDOIs) return;
					for (let selectedDOI in selectedDOIs) {
						let item = items[selectedDOI];
						ZU.doGet(item.url, 	function (text) {
							var parser = new DOMParser();
							var html = parser.parseFromString(text, "text/html");
							if (ZU.xpathText(html, '//span/span/span')) {
								let tag_nr = ZU.xpathText(html, '//span/span/span').split(/,\s+/).length;
								let tag_field_length = ZU.xpathText(html, '//span/span/span').length;
								if (tag_field_length/tag_nr < 40) {
									item.tags = ZU.xpathText(html, '//span/span/span').split(/,\s+/);
								}
							}

							item.libraryCatalog = "ubtue_shermjournal";
							item.complete();
							}
							);
							

						
					}
				});
			}
		});
	
		// Don't throw on error
		translate.setHandler("error", function () {});
	
		translate.translate();
	}
}

function doWeb(doc) {
	var dois = getDOIs(doc);
	retrieveDOIs(dois);
}



/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
