{
	"translatorID": "6ed5e5c7-9e0c-4e3b-a0c8-87d65da6fbb1",
	"label": "ubtue_Revue des Questions Scientifiques",
	"creator": "Timotheus Kim",
	"target": "https?://www\\.rqs\\.be/app/views/revue",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-02-03 18:14:28"
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
	var rows = doc.querySelectorAll('.w3-padding-32 div:nth-child(1)');
	for (let i=0; i<rows.length; i++) {
		let href = i+1;
		var title = rows[i].innerText.match(/.*n°.*/) + rows[i].innerHTML.match(/data-show-.*pub=.*/);
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
			for (var i in items) {
				scrape(doc, items[i]);
			}
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, text) {
	
	//Z.debug(text)
	var item = new Zotero.Item('journalArticle');
	//wegen type error "split is not a function"
	var str = text.toString(); //Z.debug(str)
	// trenner trennt zwischen Abstract und bibliographischen Angaben
	var trenner = str.split('Résumé');
	// metadata mit Komma getrennt für bibliographische Angaben
	var authorEntry = trenner[0].split(',');
	// Titelbereich trennen mit "in Revue des Questions" oder "Tome"
	var titleTrenner = str.split(/in\s?revue\s?des\s?questions|tome/i);
	//Z.debug(titleTrenner)
	//Element-Array nach erstem Komma als item.title ausgegeben
	let titleEntry = titleTrenner;
	let title = titleEntry[0].trim().replace(/.*\D(\))\s?,+/, '').replace(/,$/, '');//Z.debug(title)
	//let title = titleEntry[0].trim().replace(/^[^,]*,/, '').replace(/,$/, '').replace(/^[^,]*\),/, '');Z.debug(title)//zweite/r Verfasser aus dem Titel entfernen.
	item.title = title;
	if (title.match(/compte\s?rendu/i)) item.tags.push('RezensionstagPica');
	//Element-Array mit "(...)" als item.creators ausgegeben
	for (let m in authorEntry) {
		let authors = authorEntry[m].trim();//Z.debug(authors)
		if (authors.match(/[a-zA-Z\u00C0-\u017F]*\s\([a-zA-Z\u00C0-\u017F].*\)$/)) {
		//if (authors.match(/[a-zA-Z\u00C0-\u017F]*\s\([a-zA-Z\u00C0-\u017F].*\)/) && authors.length < 25) {
			authors = authors.replace(/\(/, ',').replace(/\),?/, ';');//"(" durch "," ersetzen für die Trennung von Nach- und Vornamen. Bei meheren Verfasser ")" als Trenner ";" für die Funktion ZU.cleanAuthor verwenden.
			item.creators.push(ZU.cleanAuthor(authors.replace(';', ''), "author", true));
		}
	}
	let cleanMetadata = trenner[0].replace(/(\.[\w].*)/, '').replace(/\.?$/, '');
	let pages = cleanMetadata.split('p.');
	item.pages = pages[1];
	if (trenner[1] && trenner[1] !== 'null') item.abstractNote = trenner[1].replace('Summary', '\\n4207').replace(/Détails Auteur.*$/, '').replace(/\"\d+\",\d+/, '').replace(/"\d+">$/, '').replace(/data-show-extract-pub=.*/, '');
	item.volume = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "w3-section", " " )) and (((count(preceding-sibling::*) + 1) = 2) and parent::*)]//*[contains(concat( " ", @class, " " ), concat( " ", "w3-xlarge", " " ))]');
	item.date = ZU.xpathText(doc, '//*[(((count(preceding-sibling::*) + 1) = 1) and parent::*)]//*[contains(concat( " ", @class, " " ), concat( " ", "w3-xlarge", " " ))]');
	item.issue = ZU.xpathText(doc,'//*[contains(concat( " ", @class, " " ), concat( " ", "m2", " " )) and (((count(preceding-sibling::*) + 1) = 3) and parent::*)]//*[contains(concat( " ", @class, " " ), concat( " ", "w3-xlarge", " " ))]');
	item.ISSN = "0035-2160";
	let url = ZU.xpath(doc, '//*[(@id = "btn-show-num-pdf")] | //*[(@id = "sidebar")]');
	let marker = str.match(/"(\d{4})">$/)[1];
	if (url) item.url = url[0].baseURI + '&publication=' + marker;
	item.url = item.url.replace(/"/g, '');
	item.complete();
	
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.rqs.be/app/views/revue.php?id=544",
		"items": "multiple"
	}
]
/** END TEST CASES **/
