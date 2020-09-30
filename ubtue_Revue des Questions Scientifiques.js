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
	"lastUpdated": "2020-09-30 14:57:56"
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
	var rows = doc.querySelectorAll('.w3-padding-32 div:nth-child(1)'); //Z.debug(rows)
	for (let i=0; i<rows.length; i++) {
		let href = i+1;
		var title = rows[i].innerText.match(/.*n°.*/) + rows[i].innerHTML.match(/data-show-pub="([0-9X]+)"/);
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
	//wegen type error split ist not a function
	var str = text.toString(); //Z.debug(str)
	// trenner trennt zwischen Abstract und bibliographischen Angaben
	var trenner = str.split("Résumé"); //Z.debug(trenner)
	// metadata mit Komma getrennt für bibliographische Angaben
	var metadata = trenner[0].split(','); //Z.debug(metadata)
	if (metadata[1].match(/\w*\s\(\w*\)/) && metadata[1].length < 30) {
		item.title = metadata[2];
	} else if (metadata[1].match(/\w*\s\(\w*\)/) && metadata[1].length > 30 && metadata[3].match(/in Revue des Questions Scientifiques/)){
		item.title = metadata[1] + ':' + metadata[2];
	} else {
		item.title = metadata[1];
	}
	var firstAuthor = metadata[0];
	var secondAuthor = metadata[1];
	if (secondAuthor.match(/[a-zA-Z\u00C0-\u017F]*\s\([a-zA-Z\u00C0-\u017F]*\)/) && secondAuthor.length < 25) {
		var creators = metadata[0].replace(/\(/, ',').replace(/\),?/, ';') + metadata[1].replace(',', '/').replace(/\(/, ',').replace(/\)/, '');
	} else {
		creators = metadata[0].replace(/\(/, ',').replace(/\)/, '');
	}
	if (creators) creators = creators.split(';'); //Z.debug(creators)
	for (var i=0; i<creators.length; i++) {
		item.creators.push(ZU.cleanAuthor(creators[i], "author", true));
		item.creators[i].lastName = ZU.capitalizeTitle(item.creators[i].lastName , true);
	}
	var cleanMetadata = trenner[0].replace(/(\.[\w].*)/, '').replace(/\.?$/, '');
	var pages = cleanMetadata.split('n°5, p.'); //Z.debug(pages)
	item.pages = pages[1];//Z.debug(trenner[1])
	if (trenner[1]) item.abstractNote = trenner[1].replace('Summary', ' ').replace('Détails Auteur(s)PrixGratuitdata-show-pub=', '').replace(/\"\d+\",\d+/, '');
	item.volume = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "w3-section", " " )) and (((count(preceding-sibling::*) + 1) = 2) and parent::*)]//*[contains(concat( " ", @class, " " ), concat( " ", "w3-xlarge", " " ))]');
	item.date = ZU.xpathText(doc, '//*[(((count(preceding-sibling::*) + 1) = 1) and parent::*)]//*[contains(concat( " ", @class, " " ), concat( " ", "w3-xlarge", " " ))]');
	item.issue = ZU.xpathText(doc,'//*[contains(concat( " ", @class, " " ), concat( " ", "m2", " " )) and (((count(preceding-sibling::*) + 1) = 3) and parent::*)]//*[contains(concat( " ", @class, " " ), concat( " ", "w3-xlarge", " " ))]');
	item.ISSN = "0035-2160";
	var url = ZU.xpath(doc, '//*[(@id = "btn-show-num-pdf")] | //*[(@id = "sidebar")]');//Z.debug(url)
	var markerArray = str.split(',');//Z.debug(markerArray)
	var marker = markerArray[markerArray.length - 1];
	if (url) item.url = url[0].baseURI + '&publication=' + marker;
	item.language = 'fr';
	item.complete();
	
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.rqs.be/app/views/revue.php?id=544",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.rqs.be/app/views/revue.php?id=544",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.rqs.be/app/views/revue.php?id=544",
		"items": "multiple"
	}
]
/** END TEST CASES **/
