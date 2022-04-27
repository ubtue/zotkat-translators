{
	"translatorID": "7100a927-4daa-4e1a-8b63-ce883a42b35c",
	"label": "ubtue_Herder",
	"creator": "Hjordis Lindeboom",
	"target": "https://www.herder.de/[a-zA-Z]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-04-26 07:58:13"
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
	let authorsElement = ZU.xpath(doc, '//span[@class="byline"]/a');
	if (authorsElement.length > 0) {
	let authors = [];
	for (let author of authorsElement) authors.push(author.textContent);
		return authors;
	}
	return false;
}

function extractIssueAndYearFromURL(item, url) {
	if (url.match(/\/[^\/]+-\d{4}\/[^\/]+-\d{4}\//) != null) {
		item.issue = url.match(/\/[^\/]+-\d{4}\/([^\/]+)-\d{4}\//)[1].replace('-', '/');
		item.volume = url.match(/\/([^\/]+)-\d{4}\/[^\/]+-\d{4}\//)[1];
		item.date = url.match(/\/[^\/]+-(\d{4})\/[^\/]+-\d{4}\//)[1];
	}
	else if (url.match(/\/(\d+)-\d{4}\//)) {
	item.issue = url.match(/\/(\d+)-\d{4}\//)[1];
	item.date = url.match(/\/\d+-(\d{4})\//)[1];
	}
	else item.date = url.match(/(\d{4})\//)[0];
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
				item.creators.push(ZU.cleanAuthor(author.replace(/prof\b|dr\b/gi, ''), "authors"));
		}
		extractIssueAndYearFromURL(item, url);
		let itemAbstract = doc.querySelector('#base_0_area1main_0_aZusammenfassung');
		if(itemAbstract) item.abstractNote = itemAbstract.textContent;
		if (item.abstractNote != null) {
			item.abstractNote = item.abstractNote.replace(/(?:Zusammenfassung\s*\/\s*(?:Summary|Abstract)(?:\n\s*)*)|\n/g, "");
		}
		item.pages = extractPages(doc);
		let publicationTitle = ZU.xpathText(doc, '//*[(@id = "ctl02_imgLogo")]/@alt');
		if (publicationTitle) item.publicationTitle = publicationTitle;
		let pageTitle = ZU.xpathText(doc, '//title').trim();
		if (pageTitle.match(/^Buchrezension/))
			item.tags.push('RezensionstagPica');
		if (pageTitle.trim().match(item.title + ': ')) {
			item.title += pageTitle.split(item.title)[1];
		}
		if (item.publicationTitle == "Biblische Notizen") {
			item.ISSN = "2628-5762";
			item.volume = item.issue;
			item.issue = "";
		}
		if (item.publicationTitle == "Römische Quartalschrift") {
			item.ISSN = "0035-7812";
		}
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
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.herder.de/bn-nf/hefte/archiv/2021/188-2021/und-es-waren-hirten-in-demselben-land-vom-verstaendnis-der-hirten-zu-einer-neuen-hermeneutik-der-lukanischen-weihnachtsgeschichte-teil-2/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "„Und es waren Hirten in demselben Land...“: Vom Verständnis der Hirten zu einer neuen Hermeneutik der lukanischen Weihnachtsgeschichte – Teil 2",
				"creators": [
					{
						"firstName": "Cornelius",
						"lastName": "Vollmer",
						"creatorType": "authors"
					}
				],
				"date": "2021",
				"ISSN": "2628-5762",
				"abstractNote": "Den bisher nicht restlos überzeugenden Lösungsversuchen, weshalb die Frohbotschaft des Engels von der Geburt Jesu im Lukasevangelium ausgerechnet an Hirten ergeht, legt der Autor mit der nicht nur in der Bibel überlieferten, sondern auch in der Umwelt des Alten und Neuen Testaments geläufigen sowie heute noch bekannten Metapher des Hirten als König oder Herrscher eine neue Deutung vor. Kontextgemäß können dann die Hirten, die während des von Augustus anlässlich der Eingliederung Judäas in die Provinz Syria angeordneten und von seinem Statthalter Quirinius durchgeführten Zensus „in demselben Land“ (χώρα: 2,8) waren, nur die genannten römischen Machthaber sein, die – so die lukanische Utopie nach alttestamentlichen Vorbildern, wo in der messianischen Heilszeit fremde Könige zum Zion ziehen – sich dem neugeborenen davidischen Herrscher unterwerfen und den Gott Israels loben. Anfänglich aber knechten und unterdrücken sie ihre Herde / das Volk (sichtbarer Ausdruck dafür ist der Zensus sowie in 2,8 φυλάσσοντες φυλακὰς = „bewachen“ im Sinne von Freiheitsberaubung), wobei Lukas unter anderem die bekannteste Prophezeiung von der Geburt des davidischen Friedensherrschers aus Jes 9,1-6 aktualisiert, wo gleichermaßen die Geburt während einer Notzeit (nachts!), unter einer militärischen Besatzermacht, stattfindet.",
				"language": "de",
				"libraryCatalog": "www.herder.de",
				"pages": "3-26",
				"publicationTitle": "Biblische Notizen",
				"shortTitle": "„Und es waren Hirten in demselben Land...“",
				"url": "https://www.herder.de/bn-nf/hefte/archiv/2021/188-2021/und-es-waren-hirten-in-demselben-land-vom-verstaendnis-der-hirten-zu-einer-neuen-hermeneutik-der-lukanischen-weihnachtsgeschichte-teil-2/",
				"volume": "188",
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
	},
	{
		"type": "web",
		"url": "https://www.herder.de/gd/hefte/archiv/2021/13-2021/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.herder.de/bn-nf/hefte/archiv/2022/192-2022/the-annunciation-narrative-luke-127-38-read-in-times-of-metoo/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Annunciation Narrative (Luke 1:27-38) Read in Times of #MeToo",
				"creators": [
					{
						"firstName": "Bart J.",
						"lastName": "Koet",
						"creatorType": "authors"
					},
					{
						"firstName": "Bert Jan Lietaert",
						"lastName": "Peerbolte",
						"creatorType": "authors"
					}
				],
				"date": "2022",
				"ISSN": "2628-5762",
				"abstractNote": "In diesem Artikel beurteilen wir die von Michael Pope in seinem Beitrag in JBL 137 aufgestellte Behauptung, dass die Verkündigungserzählung in Lukas 1 sexuelle Sprache widerspiegelt und eine Implikation enthält, dass Maria Opfer einer Vergewaltigung durch den Engel Gabriel wurde. Das Ergebnis unserer Untersuchung ist klar: Wir finden die Beweise für diese Behauptung nicht überzeugend. Die Elemente, die zu Gunsten von Popes Argument verwendet werden, spiegeln bestenfalls Indizien wider und überzeugen uns nicht. Die Vorstellung Marias als Jungfrau, die Verwendung des Verbs εἰσέρχομαι, die Begegnung mit einem Engelswesen als solche und die für Maria verwendete δούλη -Terminologie bilden auch in ihrer Gesamtheit keinen ausreichenden Grund, die besprochene Passage als Beschreibung einer Vergewaltigung zu interpretieren. Schließlich ist das Gespräch zwischen Maria und Gabriel in 1,34-35 das ultimative Argument gegen seine Lesart: Wäre in 1,28 eine Vergewaltigung angedeutet worden, wäre Marias Frage in V.34 sinnlos gewesen, und Gabriel hätte in V.35 nicht mit einem Futur geantwortet. Damit ist der Fall erledigt und es zeigt sich, dass Popes Lesart eher das #metoo-Setting des 21. Jahrhunderts widerspiegelt als den Diskurs des ersten Jahrhunderts bei Lukas.",
				"language": "de",
				"libraryCatalog": "www.herder.de",
				"pages": "91-103",
				"publicationTitle": "Biblische Notizen",
				"shortTitle": "The Annunciation Narrative (Luke 1",
				"url": "https://www.herder.de/bn-nf/hefte/archiv/2022/192-2022/the-annunciation-narrative-luke-127-38-read-in-times-of-metoo/",
				"volume": "192",
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
	},
	{
		"type": "web",
		"url": "https://www.herder.de/rq/hefte/archiv/116-2021/1-2-2021/augustins-predigten-dokumente-prallen-lebens-animation-zu-frischer-lektuere/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Augustins Predigten: \"Dokumente prallen Lebens\". Animation zu frischer Lektüre",
				"creators": [
					{
						"firstName": "Hubertus R.",
						"lastName": "Drobner",
						"creatorType": "authors"
					}
				],
				"date": "2021",
				"ISSN": "0035-7812",
				"abstractNote": "Augustine’s Sermons: ‘Documents of Abundant Life’. Animation for fresh reading” – The discovery of 26 new sermons of Augustine in Mainz changed research in many ways, not so much because they contained revolutionary new insights into Augustine’s theology, but because they provided the impetus to read all his sermons with new eyes, also with regard to the everyday life of his time. For if one accuses the medieval editors of having been interested only in Augustine’s “timeless theological themes” and not in the details of daily life, one cannot entirely absolve modernity of this either, and one can only wish that current research will increasingly read Augustine’s sermons for what they are: not only sources for Augustine’s thought, but documents of the life of his time.",
				"issue": "1/2",
				"language": "de",
				"libraryCatalog": "www.herder.de",
				"pages": "1-13",
				"publicationTitle": "Römische Quartalschrift",
				"shortTitle": "Augustins Predigten",
				"url": "https://www.herder.de/rq/hefte/archiv/116-2021/1-2-2021/augustins-predigten-dokumente-prallen-lebens-animation-zu-frischer-lektuere/",
				"volume": "116",
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
