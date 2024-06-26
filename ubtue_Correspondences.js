{
	"translatorID": "d03f5611-9ddc-4c9a-930a-507b04458901",
	"label": "ubtue_Correspondences",
	"creator": "Paula Hähndel",
	"target": "https?://correspondencesjournal.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-09-01 12:41:06"
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
	if (!url.includes("issue")) {
		return "journalArticle";
	} else if (getSearchResults(doc)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	let pdfs = ZU.xpath(doc, '//a');
	for (let i in pdfs) {
		if (pdfs[i].text.trim() == "PDF" && getData(doc, pdfs[i].href)["title"]) {
			let title = getData(doc, pdfs[i].href)["title"];
			let href = pdfs[i];
			if (!href || !title) continue;
			found = true;
			items[href] = title;
		}
	}
	return found ? items : false;
}

function doWeb(doc, url) {
  if (detectWeb(doc, url) == "multiple") {
	Zotero.selectItems(getSearchResults(doc, url, false), function (items) {
	  if (items) {
		  getMetaData(doc, items);
	  }
	});
  } else
  {
	scrape(doc, url, "");
  }
}

function getData(doc, pdf) {
	rows = ZU.xpath(doc, '//div[@class="entry-content"]')[0].innerHTML.split("PDF");
	let href = false;
	let title = false;
	let authors = false;
	let pages = false;
	let review = false;
	let volume = ZU.xpathText(doc, '//h1[@class="entry-title"]');
	let issue = volume.match(/no.\s+(\d+)/)[1];
	let year = volume.match(/\((\d{4})\)/)[1];
	volume = volume.match(/Volume\s+(\d+),/)[1];
	for (let i = 0; i < rows.length; i++) {
		if (rows[i].includes(pdf) && !rows[i].includes("Download full issue")) {
		href = rows[i].match(/<a\s+href="([^"]+)"/)[1];
		if (href.includes("download")) href = "keinLink";
		title = rows[i].match(/^((?:.|\s)+)<br>/)[1];
		if (rows[i].match(/review/i)) review = true;
		if (review && title.includes("eviewed by")) {
			title = title.replace(/<[^<]+>/g,"");
			authors = title.match(/Reviewed by\s*((?:[^\.\n](?:\s.\.\s)?)+)\./)[1].trim();
			title = title.substring(1,title.indexOf("Reviewed by")-2).trim();
		}
		else {
			title = title.replace(/<[^<]+>/g,"");
			authors = title.match(/\n\s*((?:[^\.\n](?:\s.\.\s)?)+)\./)[1].trim();
			title = title.substring(title.match(/[^\s]{2}\./).index+3).trim();
		}
		pages = rows[i].match(/<br>([^<]+)/)[1];
		pages = pages.replace("(","").trim();
		if (review) authors = title.match(/eviewd by([^\.]+)\./); //[1].trim();
		}
	}
	return {"title": title,
	  "url": href,
	  "authors": authors,
	  "pages": pages,
	  "volume": volume,
	  "issue": issue,
	  "year": year,
	  "review": review};
}


function getMetaData(doc, items) {
	for (let pdf in items) {
		let info = getData(doc, pdf);
		let url = info["url"]; 
		if (url == "keinLink") {
			item = new Zotero.Item('journalArticle');
			item.itemType = "journalArticle";
			item.title = info["title"];
			item.pages = info["pages"];
			item.volume = info["volume"];
			item.issue = info["issue"];
			item.date = info["year"];
			if (info["review"]) item.tags.push("RezensionstagPica");
			if (info["authors"]) {
				let authors = info["authors"].split(/, | and /);
				for (let j in authors) {
					let author = authors[j].trim();
					item.creators.push({"firstName" : author.substring(0,author.lastIndexOf(" ")+1),
					  "lastName" : author.substring(author.lastIndexOf(" ")), "creatorType" : "author"});
				}
			}
			item.ISSN = "2053-7158";
			//item.notes.push({"note": "LF:"});
			item.complete();
		}
		else ZU.processDocuments(url, function(t, url) {scrape(t, url, info);});
	}
}

function scrape(doc, url, externalInfo) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		i.itemType = "journalArticle";
		i.ISSN = "2053-7158";
		let info = doc.getElementsByClassName("entry-content")[0];
		//let info = ZU.xpath(doc, '//div[@class="entry-content"]')[0].innerHTML;
		if (i.title.lastIndexOf(":")+1 == i.title.length) {
			i.title = i.title + " " + text(info, "h2");
		}
		let authors = text(info, "p").split(/, | and /);
		for (let j in authors) {
			let author = authors[j].trim();
			i.creators.push({"firstName" : author.substring(0,author.lastIndexOf(" ")+1),
			  "lastName" : author.substring(author.lastIndexOf(" ")), "creatorType" : "author"});
		}
		i.abstractNote = info.innerText.match(/Abstract\s*([^\n]+)\n/)[1].trim();
		let tags = info.innerText.match(/Keywords?\s*([^\n]+)\n/)[1].split("; ");
		for (let j in tags) {
			i.tags.push(tags[j]);
		}
		if (externalInfo) {
			i.title = externalInfo["title"];
			i.url = externalInfo["url"];
			i.pages = externalInfo["pages"];
			i.volume = externalInfo["volume"];
			i.issue = externalInfo["issue"];
			i.date = externalInfo["year"];
			if (externalInfo["review"]) i.tag.push("RezensionstagPica");
			if (!i.creators) {
				let authors = info["authors"].split(/, | and /);
				for (let j in authors) {
					let author = authors[j].trim();
					i.creators.push({"firstName" : author.substring(0,author.lastIndexOf(" ")+1),
				  		"lastName" : author.substring(author.lastIndexOf(" ")), "creatorType" : "author"});
				}
			}
		}
		//i.notes.push({"note": "LF:"});
		i.attachments = [];
		i.complete();
	});
	translator.translate();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://correspondencesjournal.com/volume-10/issue-1/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://correspondencesjournal.com/21601-2/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Female Figures in Late Nineteenth- and Early Twentieth-Century Portuguese Occult Periodicals",
				"creators": [
					{
						"firstName": "José Vieira ",
						"lastName": " Leitão",
						"creatorType": "author"
					}
				],
				"ISSN": "2053-7158",
				"abstractNote": "The medium of almanacs and prognostication literature has, since at least the fourteenth century, occupied a relevant position within the Portuguese letters, reaching its apex during the extremely troubled nineteenth century, with women at this time stepping out of the literary shadows and taking to this medium as almanac correspondents, directors, and owners. Associated with this moment is also the emergence of occult- and magic-themed almanacs, arising from the overlap of Portuguese prognostication literature and the Books of Saint Cyprian, nineteenth-century grimoires with long-reaching early modern roots.",
				"language": "en-GB",
				"libraryCatalog": "correspondencesjournal.com",
				"url": "https://correspondencesjournal.com/21601-2/",
				"attachments": [],
				"tags": [
					{
						"tag": "Almanac culture"
					},
					{
						"tag": "Feminism"
					},
					{
						"tag": "Folk literature"
					},
					{
						"tag": "Magic"
					},
					{
						"tag": "Prognostication"
					},
					{
						"tag": "Pulp literature"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://correspondencesjournal.com/21303-2/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Hybrid Masculinity and the H. B. of L.: Practical and “Progressive” Occultism in Late-Victorian Northeast Scotland",
				"creators": [
					{
						"firstName": "Tanya ",
						"lastName": " Cheadle",
						"creatorType": "author"
					}
				],
				"ISSN": "2053-7158",
				"abstractNote": "Occultism in late-Victorian Britain was a manly endeavour, the feminisation of its discourse and structures not occurring until after 1900. Organisations were modelled on gentlemen’s clubs and promoted a masculine ideal based on erudition, honour, willpower and rationality. Yet this ideal was contradictory and unstable. A strong association existed in the public mind between psychic receptiveness and feminine passivity; this, combined with perceptions of the (male) scholar as effete and reclusive, the era’s turbulent gender politics, and esotericism’s heterodox beliefs, all served to undermine occult manhood. This paper argues that its hegemony was buttressed by the Hermetic Brotherhood of Luxor (H. B. of L.), a short-lived yet influential organisation of sex magic, co-founded in 1884 in Northeast Scotland by Peter Davidson. Utilising the approaches of microhistory and biography and drawing on the concepts of “cultural circuits,” “hegemonic masculinity” and “hybridisation,” it asserts that the Brotherhood reconfigured occult masculinity as practical and progressive by co-opting aspects from scientific manhood and feminist campaigns. Ultimately, however, it failed to fundamentally challenge hierarchies of gender, class, race, and sexuality and instead constitutes an example of “hybrid masculinity,” whereby superficial accommodations ensure the hegemonic ideal’s continued dominance. While this new model of manhood endured, the H. B. of L. collapsed in 1886, a result not of its transgressive teachings but the exposure of its secretary’s prior conviction for fraud. While sexual deviance was tacitly permitted in the occult networks of the fin-de-siècle, criminality and its working-class associations were not.",
				"language": "en-GB",
				"libraryCatalog": "correspondencesjournal.com",
				"shortTitle": "Hybrid Masculinity and the H. B. of L.",
				"url": "https://correspondencesjournal.com/21303-2/",
				"attachments": [],
				"tags": [
					{
						"tag": "Hermetic Brotherhood of Luxor"
					},
					{
						"tag": "Practical occultism"
					},
					{
						"tag": "Scotland"
					},
					{
						"tag": "hybrid masculinity"
					},
					{
						"tag": "science"
					},
					{
						"tag": "sex magic"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
