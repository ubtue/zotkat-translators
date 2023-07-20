{
	"translatorID": "6b25538e-7436-4137-9643-2ede7c2fc533",
	"label": "ubtue_etf",
	"creator": "Paula Hähndel",
	"target": "https://web.etf.cuni.cz/ETF",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-07-20 11:30:05"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Universitätsbibliothek Tübingen.  All rights reserved.
	Modified 2021 by Paula Hähndel
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
	var rows = ZU.xpath(doc, '//tbody//td//a');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = rows[i].innerText;
		if (title.includes("doi.org") || href.includes(".pdf") || href.includes("creativecommons.org/licenses/")) continue
		if (!href || !title) continue;
		found = true;
		items[href] = title;
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

function ExtractData(text, wordeng, wordcs) {
	if (text.includes(wordeng) || text.includes(wordcs)) {
		regex = new RegExp("(?:"+wordeng+"|"+wordcs+")","");
		let abs = text.substring(text.match(regex).index); 
		abs = abs.match(/<p[^>]*>([^<]+(?:<i|<a)?[^<]+(?:<\/i|<\/a)?[^<]+)</)[1];
		return abs;
		}
	return false
}

function GetMetaData(urls, doc) {
	let rows = ZU.xpath(doc, '//div[@class="pageContent "]')[0].innerHTML.split(/<div\sclass="anchorDiv"\sid="/);
	let issueinfos = ZU.xpath(doc, '//div/p[b]');
	let year = "";
	let volume = "";
	let issue = "";
	for (let i in issueinfos) {
		let issueinfo = issueinfos[i].innerHTML;
		if (issueinfo.includes("Year")) {
			year = issueinfo.match(/>([^<]+)</)[1].trim();
		}
		if (issueinfo.includes("Volume")) {
			volume = issueinfo.match(/>([^<]+)</)[1].trim();
		}
		if (issueinfo.includes("Issue")) {
			issue = issueinfo.match(/>([^<]+)</)[1].trim();
		}
	} 
	delete rows[0];
	delete rows[1];
	for (let url in urls) { 
		item = new Zotero.Item('journalArticle');
		item.url = url; 
		item.title = urls[url];
		let nr = item.url.match(/#(\d+)/)[1];
		let row = "";
		for (let i in rows) {
			if (rows[i].match(/^(\d)+/)[1] == nr) row = rows[i];
		}

		let abs = ExtractData(row, "Abstract", "Abstrakt");
		if (abs) item.abstractNote = abs.trim();
		let author = ExtractData(row, "Author", "Autor");
		if (author) {
			let indexLastSpace = author.match(/(?!.*\s)/).index
			let lastname = author.substring(indexLastSpace).trim();
			let firstname = author.substring(0,indexLastSpace).trim();
			item.creators.push({"firstName" : firstname, "lastName" : lastname, "creatorType" : "author"});
		}
		let citation = ExtractData(row, "Citation", "Citace");
		if (citation) {
			//item.volume = Arabic(citation.match(/vol\.\s*([^,]+)/)[1]);
			//item.issue = citation.match(/issue\s*(\d+)/)[1];
			//item.date = citation.match(/(\d{4})/)[1];
			item.pages = citation.match(/(?:p|s)\.\s*(\d+-?\d*)/)[1]
			item.pages = item.pages.replace(/^([^-]+)-\1$/, '$1');
			item.publicationTitle = citation.match(/i>([^<]+)</)[1];
		}
		item.volume = volume;
		item.date = year;
		item.issue = issue;
		let doi = ExtractData(row, "DOI", "DOI");
		if (doi) {
			item.DOI = doi.match(/doi\.org\/([^"]+)"/)[1];
		}
		if (item.title.includes("Book review")) {
			item.tags.push('RezensionstagPica');
		}
		let tag = ExtractData(row, "Keyword", "Klíčová slova");
		if (tag) {
			let tags = tag.split(/–|-|,\s/);
			for (i in tags) {
				item.tags.push(tags[i].trim());
			}
		}
		if (item.publicationTitle == "Communio Viatorum") {
			item.ISSN = "0010-3713";
			item.language = "eng";
		}
		item.attachments = [];
		item.complete();
	};
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			//let articles = [];
			//for (let i in items) {
			//	articles.push(i);
			//}
			GetMetaData(items, doc);
		});
	} else GetMetaData([url], doc);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://web.etf.cuni.cz/ETFN-162.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://web.etf.cuni.cz/ETFN-189.html",
		"items": "multiple"
	}
]
/** END TEST CASES **/
