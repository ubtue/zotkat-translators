{
	"translatorID": "b4005714-d7da-4590-b7df-60af1e7af34c",
	"label": "ubtue_eastrs",
	"creator": "Paula Hähndel",
	"target": "https://www.eastrs.org/|https://hcommons.org/deposits/item",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-16 07:40:24"
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
	if (url.includes("item")) {
		return "journalArticle";
	} else if (getSearchResults(doc)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	let rows = ZU.xpath(doc, '//div[@class="entry-content"]')[0].innerHTML.split("<h4");
	for (let i = 1; i < rows.length; i++) {
		let row = rows[i].substring(rows[i].indexOf(">")+1);
		//Z.debug(items)
		if (row.includes("</h4>")) {
			let title = row.substring(0,row.indexOf("</h4>")).replace("<br>"," ").replace(/<em>|<\/em>/,"");
			let href=".pdf"		
			if (row.match(/<a\s+href="[^"]+"/)) {
				href = row.match(/<a\s+href="([^"]+)"/)[1];
			}
			if (title.trim() == "Book Reviews"){
				let reviews = row.split("</p>")
				for (let r in reviews) {
					let review = reviews[r].substring(reviews[r].indexOf("em>")+3);
					if (review.includes("</em>")) {
						title = review.substring(0,review.indexOf("</em>")).replace("<br>"," ").replace(/<em>|<\/em>/,"");
						href = review.match(/<a\s+href="([^"]+)"/)[1];
						found = true;
						if (href.includes(".pdf")) href=i+"+"+r;
						items[href] = title;
					}
				}
			}
			else {
				found = true;
				if (href.includes(".pdf")) href="KeinLink"+i;
				items[href] = title;
			}
		}
		//if (!href || !title) continue;
		//found = true;
		//items[href] = title;
	}
	return found ? items : false;
}

function GetMetaData(articles, doc, url) {
	let rows = ZU.xpath(doc, '//div[@class="entry-content"]')[0].innerHTML.split("<h4");
	delete rows[0];
	let heft = ZU.xpathText(doc, '//h1');
	let journal = "";
	let year = "";
	if (heft.match(/\s\d{4}/)) year = heft.match(/\s(\d{4})/)[1];
	if (heft.includes("volume")) journal = heft.match(/volume\s*(\d+)/)[1];
	if (heft.includes("issue")) heft = heft.match(/issue\s*(\d+)/)[1];
	let reviewdois = [];
	for (let r in rows){
		let row = rows[r].substring(rows[i].indexOf(">")+1);
		if(row.includes("Book Review")) {
			let reviews = row.split("</p>")
				for (let r in reviews) {
					let review = reviews[r].substring(reviews[r].indexOf("em>")+3);
					if (review.includes("</em>")) {
						reviewdois.push(review.match(/<a\s+href="([^"]+)"/)[1]);
					}
				}
		}
	}
	for (let a in articles) {
		item = new Zotero.Item('journalArticle');
		if (!a.includes("KeinLink")) item.url = a;
		item.title = articles[a];
		let row = "";
		for (let r in rows){
			row = rows[r].substring(rows[r].indexOf(">")+1);
			if (row.includes(item.title) || row.includes(a)) {
				row = row.substring(row.indexOf(">")+1);
				break;
			}
		}
		if (row.match(/<p>/)) {
			names = row.substring(row.indexOf("<p>")+3);
			names = names.substring(0,names.indexOf("<"));
			let firstname = names.substring(0,names.lastIndexOf(" "));
			let lastname = names.substring(names.lastIndexOf(" ")+1);
			item.creators.push({"firstName": firstname, "lastName": lastname, "creatorType": "author"})
		}
		if (row.match(/p\.?\s+\d+-?\d*/)) {
			item.pages = row.match(/p\.?\s+(\d+-?\d*)/)[1];
			item.pages = item.pages.trim().replace(/^([^-]+)-\1$/, '$1');
		}
		if (row.includes("doi")){
			if (row.match(/(\d{2}\.\d{5}\/[^\s]{9})/)[1]) item.DOI = row.match(/(\d{2}\.\d{5}\/[^\s]{9})/)[1];
		}
		let isReview = false;
		if (reviewdois.includes(a)) {
			isReview = true;
		}
		item.volume = journal;
		item.issue = heft;
		item.date = year;
		if (url.includes("eastrs")) item.ISSN = "0935-7467";
		item.language = "eng"; //default language
		if (a.includes("KeinLink")) item.complete();
		else ZU.processDocuments(item.url, function(doc) {scrape(doc, a, isReview, item.DOI, item)})
	}
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
	else {
		item = new Zotero.Item('journalArticle');
		scrape(doc, url, false, "NoDOI", item);
	}
}



function scrape(doc, url, isReview, doi, i) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		/*
		if (i.ISSN.match(/\d{7}./)) i.ISSN = i.ISSN.substring(0,4) + "-" + i.ISSN.substring(4);
		if (i.pages) i.pages = i.pages.trim().replace(/^([^-]+)-\1$/, '$1');
		if (ZU.xpathText(doc, '//div[@id="abstract_de"]//p')) {
			i.abstract = ZU.xpathText(doc, '//div[@id="abstract_de"]//p');
		}*/
		let infotext = ZU.xpathText(doc, "//dl[@class='defList']");
		if (infotext && infotext.includes("Attribution")) {
			i.notes.push({note : "LF:"});
		}
		if (infotext && infotext.includes("Book review") && !isReview) {
			i.tags.push("RezensionstagPica");
		}
		if(isReview) i.tags.push("RezensionstagPica");
		if(doi != "NoDOI") i.DOI = doi;
		i.attachments = [];
		//i.url = url;
		i.complete();
	});
	translator.translate();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.eastrs.org/spes-christiana-volume-33-issue-2/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://hcommons.org/deposits/item/hc:49977/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Ethical Issues in Revelation",
				"creators": [
					{
						"firstName": "Laszlo Istvan",
						"lastName": "Hangyas",
						"creatorType": "author"
					}
				],
				"date": "December 2022",
				"ISSN": "0935-7467",
				"abstractNote": "The Apocalypse can be considered a theology of power. This article discusses seven ethical issues related to the use and abuse of dele-gated power/authority (exousia). First and foremost, delegated authority is a relational term with dual-directional aspects. It implies that both humans and heavenly beings are morally responsible creatures. Second, this responsibility includes God-given basic human rights: life, freedom, and dignity. Embedded in these basic rights is resistance when one is confronted by unjust authority. Third, our personal freedom comes with discernment. Humans and heavenly beings are all created by God as free moral agents. Fourth, a seven times reoccurring Greek noun for patient endurance (hupomone) that signifies an active virtue, a courageous perseverance and persistence that cannot be shaken by fear or evil or danger. The fifth ethical issue is unity. In Revelation two opposing powers (good and evil) aim at unity for two completely different reasons and using contrary means. The sixth issue is therefore influence. The seventh ethical is-sue is the certainty of final victory that offers a theology of hope and rewards in every chiastic unit of the Apocalypse.",
				"issue": "2",
				"language": "en-US",
				"libraryCatalog": "hcommons.org",
				"pages": "93-106",
				"publicationTitle": "Spes Christiana",
				"url": "https://hcommons.org/deposits/item/hc:49977/",
				"volume": "33",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "LF:"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hcommons.org/deposits/item/hc:49987/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Ryan E. Stokes. The Satan: How God’s Executioner Became the Enemy. Grand Rapids, MI: Eerdmans, 2019. 304 pp.",
				"creators": [
					{
						"firstName": "Korpman Matthew",
						"lastName": "J",
						"creatorType": "author"
					}
				],
				"date": "December 2022",
				"ISSN": "0935-7467",
				"abstractNote": "There is not a plethora of books in the area of biblical studies dedicated exclu-sively to the topic of the Satan, and even among those that have recently emerged, most simply serve as a recapitulation of the available information. Ryan Stokes’ new monograph however changes this, boldly suggesting a new hypothesis regarding the meaning of the word satan and the dating of tradi-tional texts alongside the more typical and expected summaries of available evidence. Stokes’ hypothesis not only potentially changes how one under-stands the Satan’s classic definition and purpose in Ancient Israel and Early Judaism, but even has consequences for how exegesis on the book of Job may proceed in forthcoming studies.",
				"issue": "2",
				"language": "en-US",
				"libraryCatalog": "hcommons.org",
				"pages": "141-143",
				"publicationTitle": "Spes Christiana",
				"shortTitle": "Ryan E. Stokes. The Satan",
				"url": "https://hcommons.org/deposits/item/hc:49987/",
				"volume": "33",
				"attachments": [],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [
					{
						"note": "LF:"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
