{
	"translatorID": "8d4364fa-3672-46fe-8646-014ae6e166a0",
	"label": "ubtue_foi_et_vie",
	"creator": "Paula Hähndel",
	"target": "https?://www.foi-et-vie.fr/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-31 14:17:23"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Universitätsbibliothek Tübingen.  All rights reserved.
	Modified 2023 by Paula Hähndel
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
	return "multiple";
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[@class="toc"]//a[@class="normal"]');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = rows[i].textContent;
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function GetMetaData(articles, doc, url) {
	let rows = ZU.xpath(doc, '//div[@class="toc"]/ul/li');

	/*let hefte = ZU.xpath(doc, '//div/ul/li[a]');
	let heftdois = {};
	for (let r in hefte){
		heft = hefte[r].innerHTML;
		if (heft.includes("Heft") && heft.match(/^<a href="#" data-pages="\[(?:\d+,?)+\]">Heft/)) {
			heftnr = heft.match(/Heft (\d+)/)[1];
			heftdois[heftnr] = heft.match(/<a class="fa noul" href="[^\s"]+/g);
			for (let i in heftdois[heftnr]) {
				heftdois[heftnr][i] = heftdois[heftnr][i].match(/<a class="fa noul" href="([^\s"]+)/)[1];
			}
		}
	}
	let reviewdois = [];
	for (let r in rows){
		review = rows[r].innerHTML;
		if(review.includes("Rezension")) {
			if (review.match(/^<a href="#" data-pages="\[(?:\d+,?)+\]">Rezension/)) {
				reviewdoi = review.match(/<a class="fa noul" href="[^\s"]+/g);
				for (let i in reviewdoi) {
					reviewdois.push(reviewdoi[i].match(/<a class="fa noul" href="([^\s"]+)/)[1]);
				}
			}
		}
	}
	let journal = ZU.xpathText(doc, '//div//dl');*/
	let date = url.match(/=(\d{4})_/)[1];
	let issuenr = url.match(/_0*(\d+)/)[1];
	let volumenr = parseInt(date)-1897;
	let infos = ZU.xpathText(doc, '//div[@id="Breadcrumb"]/a'); Z.debug(infos)

	for (let a in articles) {
		item = new Zotero.Item('journalArticle');
		item.url = a;
		item.title = articles[a];
		let row = "";
		let r = 0;
		while (r < rows.length){
			row = rows[r].innerHTML;
			r++;
			if (row.includes(a.substring(a.lastIndexOf("/")+1))) {
				break;
			}
		}
		names = row.match(/author=[^"]+"/g);
		for (let j in names) {
			name = names[j].match(/author=([^"]+)"/)[1];
			let firstname = "";
			let lastname = "";
			if (name.match(/,?[^,]+/)) {
				lastname = name.match(/,?([^,]+)/)[1].trim();
			}
			if (name.match(/,[^,]+/)) {
				firstname = name.match(/,([^,]+)/)[1].trim();
			}
			item.creators.push({"firstName": firstname, "lastName": lastname, "creatorType": "author"})
		}
		item.volume = volumenr;
		item.date = date;
		item.issue = issuenr;
		let firstpage = row.match(/firstPage">(\d+)</)[1];
		let lastpage = "unknown"
		if (r < rows.length) {
			lastpage = parseInt(rows[r].innerHTML.match(/firstPage">(\d+)</)[1])-1;
		}
		item.pages = firstpage + "-" + lastpage;
		item.pages = item.pages.trim().replace(/^([^-]+)-\1$/, '$1');
		item.ISSN = "0015-5357";
		item.attachments = [];
		item.complete();
	}
	//translator.translate();
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
			GetMetaData(items, doc, url);
		});
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.foi-et-vie.fr/archive/review.php?code=2022_04",
		"items": "multiple"
	}
]
/** END TEST CASES **/
