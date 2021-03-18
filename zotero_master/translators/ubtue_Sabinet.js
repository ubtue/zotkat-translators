{
	"translatorID": "af110456-03a1-4335-9b39-613f2814cdd2",
	"label": "ubtue_Sabinet",
	"creator": "Timotheus Kim",
	"target": "^https://journals.co.za/[a-zA-Z]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-03-18 09:23:09"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Universitätsbibliothek Tübingen.  All rights reserved.
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
	if (url.includes('/doi'))
		return "journalArticle";
	else if (url.includes('/toc/') && getSearchResults(doc))
		return "multiple";
	else 
		return false
}


function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[@class="issue-item__title"]/a')
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
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
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var risURL = "//journals.co.za/action/downloadCitation";
	var doi = ZU.xpathText(doc, '//meta[@name="dc.Identifier" and @scheme="doi"]/@content');
	if (!doi) {
		doi = url.match(/10\.[^?#]+/)[0];
	}
	var post = "doi=" + encodeURIComponent(doi) + "&include=abs&format=ris&direct=false&submit=Download+Citation";

	// Z.debug(pdfurl);
	// Z.debug(post);
	ZU.doPost(risURL, post, function (text) {
		// The publication date is saved in DA and the date first
		// appeared online is in Y1. Thus, we want to prefer DA over T1
		// and will therefore simply delete the later in cases both
		// dates are present.
		// Z.debug(text);
		if (text.includes("DA  - ")) {
			text = text.replace(/Y1[ ]{2}- .*\r?\n/, '');
		}
		
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			// The subtitle will be neglected in RIS and is only present in
			// the website itself. Moreover, there can be problems with
			// encodings of apostrophs.
			var subtitle = ZU.xpathText(doc, '//div[contains(@class, "publicationContentSubTitle")]/h1');
			var title = ZU.xpathText(doc, '//div[contains(@class, "publicationContentTitle")]/h1');
			if (title) {
				item.title = title.trim();
				if (subtitle) {
					item.title += ': ' + subtitle.trim();
				}
			}
			// The encoding of apostrophs in the RIS are incorrect and
			// therefore we extract the abstract again from the website.
			var abstract = ZU.xpathText(doc, '//article//div[contains(@class, "abstractSection")]/p');
			if (abstract) {
				item.abstractNote = abstract;
			}
			
			/*for (let tag of tags) {
				item.tags.push(tag.textContent);
			}*/
			
			// Workaround while Sabinet hopefully fixes RIS for authors
			for (let i = 0; i < item.creators.length; i++) {
				if (!item.creators[i].firstName) {
					let type = item.creators[i].creatorType;
					let comma = item.creators[i].lastName.includes(",");
					item.creators[i] = ZU.cleanAuthor(item.creators[i].lastName, type, comma);
				}
			}
			// mark open access articles as "LF"
			let accessIcon = ZU.xpathText(doc, '//*[contains(@class, "citation__access__type")]');Z.debug(accessIcon)
			if (accessIcon && accessIcon.match(/open\s+access/gi)) item.notes.push({note: 'LF:'});
			item.language = ZU.xpathText(doc, '//meta[@name="dc.Language"]/@content');
			//scraping orcid number 
			let authorSectionEntries = ZU.xpath(doc, '//*[contains(@class, "loa-accordion")]');Z.debug(authorSectionEntries)
			for (let authorSectionEntry of authorSectionEntries) {
				let authorInfo = authorSectionEntry.textContent;Z.debug(authorInfo)
				//let orcidHref = authorSectionEntry.querySelector('.textContent');
				if (authorInfo) {
					let author = authorInfo.split("http")[0];Z.debug(author)
					let orcid = authorInfo.replace(/.*(\d{4}-\d+-\d+-\d+x?)/i, '$1').replace("Search for more papers by this author", "").trim();
					item.notes.push({note: "orcid:" + orcid + " | author=" + author + " | taken from website"});
				}
			}
			//deduplicate
			item.notes = Array.from(new Set(item.notes.map(JSON.stringify))).map(JSON.parse);
	
			item.complete();
		});
		translator.translate();
	});
}
