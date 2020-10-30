{
	"translatorID": "e33ab64f-9112-4c31-bab1-6a1cf93bc4ec",
	"label": "Ichthys",
	"creator": "Timotheus Kim",
	"target": "https?://ichthys-online\\.de/(ausgabe|suche|article)?",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-10-29 11:43:05"
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
// attr()/text() v2
function attr(docOrElem ,selector ,attr ,index){ var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector); return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){ var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector); return elem?elem.textContent:null; }


function detectWeb(doc, url) {
	if (getSearchResults(doc, true)) return "multiple";
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[(@id = "search-filter-results-1585")]//h2//a | //*[(@id = "wp")]//h2'); //Z.debug(rows)
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href; //Z.debug(href)
		let title = rows[i].textContent;
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
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, text) {
	//Z.debug(text)
	var url = text.toString();
	var item = new Zotero.Item('journalArticle');
	var review = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "cat-links", " " ))]//a'); //Z.debug(review)
	if (review.match(/Rezensionen/)) {
		item.tags.push('RezensionstagPica');
			
	}
	var titleAuthorsEntry = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "entry-title", " " ))]//a'); //Z.debug(titleAuthorsEntry)
	var titleEntry = titleAuthorsEntry.split(':')[1]; //Z.debug(titleEntry);
	var subtitle = ZU.xpathText(doc, '//p[(((count(preceding-sibling::*) + 1) = 1) and parent::*)]'); //Z.debug(subtitle)
	var reviewTitle = ZU.xpathText(doc, '//p[(((count(preceding-sibling::*) + 1) = 6) and parent::*)]');
	var reviewTitleTwo = ZU.xpathText(doc, '//p[(((count(preceding-sibling::*) + 1) = 5) and parent::*)]');
	//usually an article title hasn't comma between lastName and firstName, e.g. "Jonathan Reinert: Kirchengeschichte, Theolgie und Geschichtswissenschaft"
	//review title has a comma. e.g.  "Dietz, Thorsten: Weiterglauben"
	//if they differ from the general cataloging rules as explained above, you have to fix the regex below | with comma = review article ;  comma ≠ journal article
	if (titleAuthorsEntry.match(/^\s{1}?[a-zA-Z\u0080-\uFFFF]+,\s{1}/)) { //Review title
		item.title = reviewTitle;
	} else { //Article title
		item.title = titleEntry + ': ' + subtitle.replace(/ichthys.*/i, '');//if subtitel is not in the xpath position 1, then delete it. E.g " ichthys 29 (2013), Heft 1"
	}
	var authorEntry = titleAuthorsEntry.split(':')[0]; //Z.debug(authorEntry);
	var authors = authorEntry.split(','); //Z.debug(authors);
	//Rezensionen eigentlich immer mit Komma dann folgendne regex verwenden:/^\s{1}?[a-zA-Z\u0080-\uFFFF]+\s{1}/ z.b. "Armin Baum: Einleitung in das Neue Testament" Wenn mit Komma /^\s{1}?[a-zA-Z\u0080-\uFFFF]+,\s{1}/ "Armin, Baum: Einleitung in das Neue Testament"
	if (!titleAuthorsEntry.match(/^\s{1}?[a-zA-Z\u0080-\uFFFF]+,\s{1}/) && !authorEntry.match(/;/)) {
		for (let author of authors) {
			author = author.trim().split(' ').reverse(); //Z.debug(author)
			if (author && !author[2]) {
				item.creators.push(ZU.cleanAuthor(author.toString(), "author", true))
			} 
			else if (author[2].length) {
				let reverse = author[0] + ' ' + author[1] + ' ' + author[2];
				let mulitpleNames = reverse.trim().split(/(^[a-zA-Z\u0080-\uFFFF]+,\s)/); //Z.debug(mulitpleNames)
					item.creators.push(ZU.cleanAuthor(mulitpleNames.toString(), "author", true));
			}
		}
	}
	//Review authors
	if (subtitle.match(/Rezensiert/)) {
		let	reviewAuthor = subtitle.trim().split('Rezensiert von')[1].split(' ').reverse(); //Z.debug(reviewAuthor)
		item.creators.push(ZU.cleanAuthor(reviewAuthor.toString(), "author", true));
	}
	
	let volumeIssueYearTwo = ZU.xpathText(doc, '//p[(((count(preceding-sibling::*) + 1) = 1) and parent::*)]'); //Z.debug(volumeIssueYearTwo)
	let volumeIssueYear = ZU.xpathText(doc, '//p[(((count(preceding-sibling::*) + 1) = 2) and parent::*)]'); //Z.debug(volumeIssueYear)
	let volumeIssueYearThree = ZU.xpathText(doc, '//p[(((count(preceding-sibling::*) + 1) = 3) and parent::*)]'); //Z.debug(volumeIssueYearThree)
	if (volumeIssueYear.match(/ichthys/i)) {
		item.volume = volumeIssueYear.split('ichthys')[1].split('\(')[0];
	} else if (volumeIssueYearTwo.match(/ichthys/i)) {
		item.volume = volumeIssueYearTwo.split('ichthys')[1].split('\(')[0];
	} else {
		item.volume = volumeIssueYearThree.split('ichthys')[1].split('\(')[0];
	}
	
	if (volumeIssueYear.match(/ichthys/i)) {
		item.date = volumeIssueYear.split('ichthys')[1].split('\(')[1].split('\)')[0];
	} else if (volumeIssueYearTwo.match(/ichthys/i)) {
		item.date = volumeIssueYearTwo.split('ichthys')[1].split('\(')[1].split('\)')[0];
	} else {
		item.date = volumeIssueYearThree.split('ichthys')[1].split('\(')[1].split('\)')[0];
	}
	//change split string if "Ichthys Nr. 4 (Jg. 3, 1987) (Heft vergriffen)""
	if (volumeIssueYear.match(/ichthys/i)) {
		item.issue = volumeIssueYear.split('ichthys')[1].split('\(')[1].split('\)')[1].split('Heft')[1];
	} else if (volumeIssueYearTwo.match(/ichthys/i)) {
		item.issue = volumeIssueYearTwo.split('ichthys')[1].split('\(')[1].split('\)')[1].split('Heft')[1];
	} else {
		item.issue = volumeIssueYearThree.split('ichthys')[1].split('\(')[1].split('\)')[1].split('Heft')[1];
	}
	
	item.url = url;	
	
	let pagesEntryOne = ZU.xpathText(doc, '//p[(((count(preceding-sibling::*) + 1) = 3) and parent::*)]');
	let pagesEntryTwo = ZU.xpathText(doc, '//p[(((count(preceding-sibling::*) + 1) = 2) and parent::*)]');
	if (pagesEntryOne.match(/seiten/i)) {
		item.pages = pagesEntryOne.replace(/Seiten/, '');
	} else if (pagesEntryTwo.match(/seiten/i)) {
		item.pages = pagesEntryTwo.replace(/Seiten/, '');
	}
	
	let tagentry = ZU.xpathText(doc, '//p[(((count(preceding-sibling::*) + 1) = 11) and parent::*)]');//Z.debug(tagentry)
	if (tagentry){
		let tags = tagentry.split(',');
			for (let i in tags) {
			item.tags.push(tags[i].replace('Schlagwörter:', '').trim().replace(/^\w/gi,function(m){return m.toUpperCase();}));
		}
	}
	item.ISSN = '1861-8065';
	item.language = 'ger';
	item.complete();
	
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ichthys-online.de/artikel/2020_36_099/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Dalferth, Infolg; Peng-Keller, Simon (Hg.): Beten als verleiblichtes Verstehen. Neue Zugänge zu einer Hermeneutik des Gebets, Freiburg 2016, 302 Seiten, 40 €",
				"creators": [
					{
						"firstName": "Tobias",
						"lastName": "Friesen",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISSN": "1861-8065",
				"issue": "1",
				"language": "ger",
				"libraryCatalog": "Ichthys",
				"pages": "99-101",
				"shortTitle": "Dalferth, Infolg; Peng-Keller, Simon (Hg.)",
				"volume": "36",
				"attachments": [],
				"tags": [
					{
						"tag": "Aufsatzband"
					},
					{
						"tag": "Dogmatik"
					},
					{
						"tag": "Gebet"
					},
					{
						"tag": "Hermeneutik"
					},
					{
						"tag": "Leiblichkeit"
					},
					{
						"tag": "RezensionstagPica"
					},
					{
						"tag": "Spiritualität"
					},
					{
						"tag": "Sprachtheologie"
					},
					{
						"tag": "Verstehen"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ichthys-online.de/artikel/2020_36_015/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Ereignisse und Mächte, Gestalten und Wahrheiten und die Verkündigung der Kirche: Wir verwenden Cookies, um unsere Website und unseren Service zu optimieren., Fähnchen im Wind?",
				"creators": [
					{
						"firstName": "Roland",
						"lastName": "Deines",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISSN": "1861-8065",
				"issue": "1",
				"language": "ger",
				"libraryCatalog": "Ichthys",
				"pages": "15-27",
				"shortTitle": "Ereignisse und Mächte, Gestalten und Wahrheiten und die Verkündigung der Kirche",
				"volume": "36",
				"attachments": [],
				"tags": [
					{
						"tag": "Barmer Theologische Erklärung"
					},
					{
						"tag": "Heiliger Geist"
					},
					{
						"tag": "Inkulturation"
					},
					{
						"tag": "Kanon"
					},
					{
						"tag": "Kirche"
					},
					{
						"tag": "Kontext"
					},
					{
						"tag": "Kultur"
					},
					{
						"tag": "Versuchung"
					},
					{
						"tag": "Zeitgeist"
					},
					{
						"tag": "Zweites Vatikanisches Konzil"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
