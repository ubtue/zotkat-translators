{
	"translatorID": "7100a927-4daa-4e1a-8b63-ce883a42b35c",
	"label": "ubtue_Herder",
	"creator": "Hjordis Lindeboom",
	"target": "https://www.herder.de/[a-zA-Z]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-04-23 13:28:43"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Universitätsbibliothek Tübingen.  All rights reserved.
	Modified 2021 by Timotheus Kim
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
	if (url.match(/\/(\d+\-)*\d{4}\/[a-z]+/)) {
		return "journalArticle";
	} else if (getSearchResults(doc)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//ul[@class="article-list"]//a');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function extractAuthors(doc) {
	let authorsElement = doc.querySelector('span.byline > a');
	if (authorsElement)
		return authorsElement ? authorsElement.innerText.split(',') : '';
	return false;
}

function extractIssue(doc, item, issueAndYear) {
	let issueNumber = issueAndYear.match(/\d+/g);
	if (issueNumber)
		item.issue = issueNumber[0];
}

function extractYear(doc, item, issueAndYear) {
	let year = issueAndYear.match(/\d{4}/g);
	if (year)
		item.date = year[0];
}

function extractPages(doc) {
	let itemPath = doc.querySelector('span.article-infoline');
	if (itemPath) {
		itemPath = itemPath.textContent;
		let itemPages = itemPath.match(/\d+\-\d+/gi);
		let singlePage = itemPath.match(/S\.\s*\d+/gi);
		if (itemPages)
			return itemPages.toString(); //typeOf must be string
		else {
			if (singlePage && singlePage[0])
				return singlePage[0].replace('S.', '').toString(); //typeOf must be string
			return false;
		}
	}
	return false;
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	let translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, item) {
		item.itemType = 'journalArticle';
		let itemTitle = doc.querySelector('span.headline');
		if (itemTitle)
			item.title = itemTitle.textContent;
		if (extractAuthors(doc)) {
			item.creators = [];
			for (let author of extractAuthors(doc))
				item.creators.push(ZU.cleanAuthor(author.replace(/prof|dr/gi, ''), "authors"));
		}
		let extractionPath = doc.querySelectorAll('span.headline');
		for (let extract of extractionPath) {
			let testString = extract.textContent;
			if (testString.match(/\d{4}/g)) {
				let issueAndYear = extract.textContent;
				extractIssue(doc, item, issueAndYear);
				extractYear(doc, item, issueAndYear);
				break;
			}
		}
		let itemAbstract = doc.querySelector('#base_0_area1main_0_aZusammenfassung');
		if(itemAbstract) item.abstractNote = itemAbstract.textContent;
		item.pages = extractPages(doc);
		let publicationTitle = ZU.xpathText(doc, '//*[(@id = "ctl02_imgLogo")]/@alt');
		if (publicationTitle) item.publicationTitle = publicationTitle;
		item.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			let articles = [];
			for (let i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
	} else invokeEmbeddedMetadataTranslator(doc, url);
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.herder.de/bn-nf/hefte/archiv/2021/188-2021/und-es-waren-hirten-in-demselben-land-vom-verstaendnis-der-hirten-zu-einer-neuen-hermeneutik-der-lukanischen-weihnachtsgeschichte-teil-2/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "„Und es waren Hirten in demselben Land...“",
				"creators": [
					{
						"firstName": "Cornelius",
						"lastName": "Vollmer"
					}
				],
				"date": "2021",
				"abstractNote": "Zusammenfassung / Summary\n                    \n                    Den bisher nicht restlos überzeugenden Lösungsversuchen, weshalb die Frohbotschaft des Engels von der Geburt Jesu im Lukasevangelium ausgerechnet an Hirten ergeht, legt der Autor mit der nicht nur in der Bibel überlieferten, sondern auch in der Umwelt des Alten und Neuen Testaments geläufigen sowie heute noch bekannten Metapher des Hirten als König oder Herrscher eine neue Deutung vor. Kontextgemäß können dann die Hirten, die während des von Augustus anlässlich der Eingliederung Judäas in die Provinz Syria angeordneten und von seinem Statthalter Quirinius durchgeführten Zensus „in demselben Land“ (χώρα: 2,8) waren, nur die genannten römischen Machthaber sein, die – so die lukanische Utopie nach alttestamentlichen Vorbildern, wo in der messianischen Heilszeit fremde Könige zum Zion ziehen – sich dem neugeborenen davidischen Herrscher unterwerfen und den Gott Israels loben. Anfänglich aber knechten und unterdrücken sie ihre Herde / das Volk (sichtbarer Ausdruck dafür ist der Zensus sowie in 2,8 φυλάσσοντες φυλακὰς = „bewachen“ im Sinne von Freiheitsberaubung), wobei Lukas unter anderem die bekannteste Prophezeiung von der Geburt des davidischen Friedensherrschers aus Jes 9,1-6 aktualisiert, wo gleichermaßen die Geburt während einer Notzeit (nachts!), unter einer militärischen Besatzermacht, stattfindet.",
				"issue": "188",
				"language": "de",
				"libraryCatalog": "www.herder.de",
				"pages": "3-26",
				"url": "https://www.herder.de/bn-nf/hefte/archiv/2021/188-2021/und-es-waren-hirten-in-demselben-land-vom-verstaendnis-der-hirten-zu-einer-neuen-hermeneutik-der-lukanischen-weihnachtsgeschichte-teil-2/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
