{
	"translatorID": "4c47c44a-08fd-49c8-b2b0-478cd3d5cabe",
	"label": "ubtue_CRI",
	"creator": "Helena Nebel",
	"target": "civicresearchinstitute.com/online/article(_abstract)?.php",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-07-05 10:42:52"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.
	
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

var ISSN = "";

function detectWeb(doc, url) {
	if (/\/article.php/.test(url) && getSearchResults(doc, url))
		return "multiple";
	else if (/\/article_abstract.php/.test(url))
		return "journalArticle";
}

function getSearchResults(doc) {
	if (ZU.xpathText(doc, '//p').match(/ISSN\s+[\dXx-]{8,9}/)) ISSN = ZU.xpathText(doc, '//p').match(/ISSN\s+([\dXx-]{8,9})/)[1];
	let items = {};
	let found = false;
	let rows = ZU.xpath(doc, '//a[@class="article_title"]');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		if(title != "Complete Issue"){
			items[href] = title;
		}
	}
	return found ? items : false;
}



function scrape(doc, url) {
	item = new Zotero.Item("journalArticle");
	if (ZU.xpathText(doc, '//h1[@class="abstract-heading"]')) {
		item.title = ZU.xpathText(doc, '//h1[@class="abstract-heading"]');
	}
	for ( let p of ZU.xpath(doc, '//p[@class="txt_authinfo"]')) {
		if (ZU.xpathText(p, './strong[contains(., "Author")]')) {
			let creatorString = ZU.xpathText(p, './em').replace(/&nbsp;/g, ' ').trim();
			for (let cre of creatorString.split(/\.[;]/)) {
				item.creators.push(ZU.cleanAuthor(cre.replace(/\.$/g, ''), 'author'))
			}
		}
		if (ZU.xpathText(p, './strong[contains(., "Source")]')) {
			let issuedInformation = p.textContent.replace(/\n+|\t+|\s+/g, ' ')
			if (issuedInformation.match(/Volume \d+, Number \d+, [^\s]+ \d{4} ? ?, pp.\d+(?:-\d+)?\(/)) {
				item.volume = issuedInformation.match(/Volume (\d+), Number \d+, [^\s]+ \d{4} ? ?, pp.\d+(?:-\d+)?\(/)[1];
				item.issue = issuedInformation.match(/Volume \d+, Number 0*(\d+), [^\s]+ \d{4} ? ?, pp.\d+(?:-\d+)?\(/)[1];
				item.date = issuedInformation.match(/Volume \d+, Number \d+, [^\s]+ (\d{4}) ? ?, pp.\d+(?:-\d+)?\(/)[1];
				item.pages = issuedInformation.match(/Volume \d+, Number \d+, [^\s]+ \d{4} ? ?, pp.(\d+(?:-\d+)?)\(/)[1];
			}
		}
	}
	let abstractText = ZU.xpathText(doc, '//div[@id="abstract"]');
	if (abstractText) {
		item.abstractNote = abstractText.replace(/Abstract:/g, '').trim();
	}
	
	if (ZU.xpathText(doc, '//div[@id="info"]')) {
		for (let info of ZU.xpathText(doc, '//div[@id="info"]').split(/\n/)) {
			if (info.match(/keywords:/i)) {
				for (let tag of info.replace(/keywords:/i, '').split(/\s*;\s*/)) {
					if (!item.tags.includes(tag.trim())) {
						item.tags.push(tag.trim());
					}
				}
			}
		}
	}
	item.attachments = [];
	item.ISSN = ISSN;
	switch(item.ISSN) {
		case "1043-500X":
		item.publicationTitle = "Journal of Offender Monitoring";
	}
	item.url = url;
	item.complete();
}

function doWeb(doc, url) {
	Z.debug(detectWeb(doc, url));
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			let articles = [];
			for (let i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else
		scrape(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://civicresearchinstitute.com/online/article.php?pid=13&iid=1185#",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://civicresearchinstitute.com/online/article_abstract.php?pid=13&iid=1185&aid=7728",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Orange County’s Electronic Monitoring Program Enhances Program Accountability and Public Safety",
				"creators": [
					{
						"firstName": "Mike",
						"lastName": "Benzer",
						"creatorType": "author"
					}
				],
				"date": "2004",
				"abstractNote": "The Orange County Florida OCCD Community Surveillance Unit undertook a self-evaluation of its practices and concluded that officers were spending more time addressing administrative tasks than officer-to-offender contact.  This article explores the solutions the unit developed to restore the proper balance to their EM program, streamlining the processing of offenders for monitoring and re-establishing intensive officer contact with offenders.",
				"issue": "1",
				"libraryCatalog": "ubtue_CRI",
				"pages": "4-5",
				"url": "https://civicresearchinstitute.com/online/article_abstract.php?pid=13&iid=1185&aid=7728",
				"volume": "17",
				"attachments": [],
				"tags": [
					{
						"tag": "EM Specialist Teams"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
