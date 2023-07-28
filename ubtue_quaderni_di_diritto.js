{
	"translatorID": "8fc26805-a49f-4081-a63f-efa8666ce19b",
	"label": "ubtue_quaderni_di_diritto",
	"creator": "Paula Hähndel",
	"target": "^https?://www.quadernididirittoecclesiale.org",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-07-28 14:35:45"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Universitätsbibliothek Tübingen.  All rights reserved.
	
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
	if (getSearchResults(doc)) {
		return "multiple";
	}
	else {
		return "journalArticle";
	}
	//return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpathText(doc, '//div[@class="article"]//p').split(", ");
	for (let i = 1; i < rows.length; i++) {
		if (!rows[i].trim().match(/\d\s*-/)) continue;
		let page = rows[i].trim().match(/(\d+)\s*-/)[1];
		let title = rows[i].trim().match(/\d\s*-\s*(.+)/)[1];
		if (!page || !title) continue;
		found = true;
		items[page] = title;
	}
	return found ? items : false;
}

function romValue(rom) {
			if (rom == "I" || rom == "i") return 1;
			else if (rom == "V" || rom == "v") return 5;
			else if (rom == "X" || rom == "x") return 10;
			else if (rom == "L" || rom == "l") return 50;
			else if (rom == "C" || rom == "C") return 100;
			else if (rom == "D" || rom == "D") return 500;
			else if (rom == "M" || rom == "M") return 1000;
		}

function Arabic(num) {
	if (parseInt(num)) return num;
	let numv=[];
	for (let i in num){
		numv[i] = romValue(num[i]);
	}
	let value = 0; 
	let i=0;
	while (i < numv.length-1) {
		if (numv[i] < numv[i+1]) {
			value = value + numv[i+1];
			value = value - numv[i];
			i++;
		}
		else value = value + numv[i];
		i++;
	}
	if (i<numv.length) value = value + numv[i];
	return value;
}

function GetMetaData(pages, doc) {
	let rows = ZU.xpathText(doc, '//div[@class="article"]//p').split(", ");
	let rowshtml = ZU.xpath(doc, '//div[@class="article"]//p');
	let items = [];
	let issn = "1124-1179";
	let volume = "";
	let issue = 0;
	let year = "";
	for (let i in rows) {
		if (i == 0 && rows[i].trim().match(/N.\s\d/)) {
			issue = rows[i].trim().match(/N.\s(\d+)/)[1];
			if (rows[i].trim().match(/-\s*[IVXLCDM]+\s*-/)) {
				volume = Arabic(rows[i].trim().match(/-\s*([IVXLCDM]+)\s*-/)[1]);
			}
			if (rows[i].trim().match(/\s\d{4}\s/)) {
				year = rows[i].trim().match(/\s(\d{4})\s/)[1];
			}
		}
		else if (rows[i].trim().match(/\d+\s*-/)) {
			//item = new Zotero.Item('journalArticle');
			let page = rows[i].trim().match(/(\d+)\s*-/)[1];
			//if (!pages[page]) continue;
			let title = "";
			let authors = "";
			if (rows[i].trim().match(/\d\s*-\s*./)) {
				title = rows[i].trim().match(/\d\s*-\s*(.+)/)[1];
			}
			for (let r in rowshtml) {
				if (title && rowshtml[r].innerHTML.includes(page) && rowshtml[r].innerHTML.includes(title.substr(2,3))) {
					if (rowshtml[r].innerHTML.match(/>\s*(?:a cura )?di/)) {
						authors = rowshtml[r].innerHTML.match(/>\s*(?:a cura )?di\s*([^<]*)/)[1];
						if (!title.match(RegExp(authors))) continue;
						let indexAuthors = title.match(RegExp(authors)).index;
						title = title.substr(0,indexAuthors-3);
						if (title.substr(title.length-7) == "a cura ") title = title.substr(0,title.length-7)
						if (title.includes("(in formato")) {
							let indexEx = title.match(/\(in formato[^)]*\)/).index;
							title = title.substr(0,indexEx).trim();
						}
					}
				}
			}
			items.push({"title" : title, "author" : authors, "page" : page});
		}
	} //Z.debug(items)
	for (let j = 0; j < items.length; j++) {
		if (pages[items[j]["page"]]) {
			item = new Zotero.Item('journalArticle');
			item.title = items[j]["title"];
			item.pages = items[j]["page"] + "-";
			if (j+1 < items.length) {
				item.pages = item.pages + (parseInt(items[j+1]["page"])-1).toString(); //guess last page
				item.pages = item.pages.replace(/^([^-]+)-\1$/, '$1');
			}
			if (items[j]["author"]) {
				let indexLastSpace = items[j]["author"].match(/(?!.*\s)/).index
				let lastname = items[j]["author"].substr(indexLastSpace).trim();
				let firstname = items[j]["author"].substr(0,indexLastSpace).trim();
				item.creators.push({"firstName" : firstname, "lastName" : lastname, "creatorType" : "author"});
			}
		item.volume = volume;
		item.date = year;
		item.issue = issue;
		item.ISSN = issn;
		item.attachments = [];
		item.complete();
		}
	};
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			GetMetaData(items, doc);
		});
	} else GetMetaData([url], doc);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.quadernididirittoecclesiale.org/rivista/qde2022-1",
		"items": "multiple"
	}
]
/** END TEST CASES **/
