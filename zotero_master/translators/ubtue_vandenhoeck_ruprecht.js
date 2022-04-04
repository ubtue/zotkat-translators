{
	"translatorID": "dc098d90-7a52-4938-89ee-bc027d2f70df",
	"label": "ubtue_vandenhoeck_ruprecht",
	"creator": "Timotheus Kim",
	"target": "https://www.vr-elibrary.de/(toc|doi)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-03-31 15:27:17"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2021 Universitätsbibliothek Tübingen.  All rights reserved.
	T
	his program is free software: you can redistribute it and/or modify
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
	if (url.includes('/doi/book/') && getSearchResults(doc)) return "multiple";
	else if (url.includes('/doi/')) return "journalArticle";
	else if (url.includes('/toc/') && getSearchResults(doc)) return "multiple";
	else return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[@class="issue-item__title"]/a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
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

function fixCase(str, titleCase) {
	if (str.toUpperCase() != str) return str;
	if (titleCase) {
		return ZU.capitalizeTitle(str, true);
	}
	return str.charAt(0) + str.substr(1).toLowerCase();
}

// Keep this in line with target regexp
var replURLRegExp = /\/doi\/((?:abs|abstract|full|figure|ref|citedby|book)\/)?/;

function scrape(doc, url) {
	url = url.replace(/[?#].*/, "");
	var doi = url.match(/10\.[^?#]+/)[0];
	var citationurl = url.replace(replURLRegExp, "/action/showCitFormats?doi=");
	
	ZU.processDocuments(citationurl, function(citationDoc){
		var filename = citationDoc.evaluate('//form//input[@name="downloadFileName"]', citationDoc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
		var get = '/action/downloadCitation';
		//to dwonload also abstract in RIS "&include=abs"	
		var post = 'doi=' + doi + '&downloadFileName=' + filename + '&format=ris&direct=true&include=abs&include=cit';
		ZU.doPost(get, post, function (text) {
			var translator = Zotero.loadTranslator("import");
			// Calling the RIS translator
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function (obj, item) {
				//subtitle
				let subtitle = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "citation__subtitle", " " ))]');
				if (subtitle) {
					item.shortTitle = fixCase(item.title);
					item.title = fixCase(item.title) + ': ' + subtitle;
				}
				else item.title = fixCase(item.title);
				for (var i=0; i<item.creators.length; i++) {
					item.creators[i].lastName = fixCase(item.creators[i].lastName, true);
					if (item.creators[i].firstName) {
						item.creators[i].firstName = fixCase(item.creators[i].firstName, true);
					}
				}
				
				item.url = url;
				if (ZU.xpathText(doc, '//span[@class="citation__access__type"]') != null) {
					if (ZU.xpathText(doc, '//span[@class="citation__access__type"]').match(/(open(\s+)?access)|(kostenlos)/i)) {
						item.notes.push({'note': 'LF:'});
					}
				}
				let authorTags = ZU.xpath(doc, '//div[contains(@class, "accordion-tabbed__tab-mobile")]');
				for (let authorTag of authorTags) {
					if (ZU.xpathText(authorTag, './/a[@class="orcid-link"]') != null) {
						let author = ZU.xpathText(authorTag, './a/@title');
						let orcid = ZU.xpathText(authorTag, './/a[@class="orcid-link"]');
						orcid = orcid.replace('https://orcid.org/', '')
					item.notes.push({note: "orcid:" + orcid + ' | ' + author});	
					}
				}
				//book review
				let docType = ZU.xpathText(doc, '//meta[@name="dc.Type"]/@content');
				if (docType === "book-review")
					item.tags.push("RezensionstagPica");
				if (!item.language) {
					var metaLang = doc.querySelector("meta[name='dc.Language']");
					if (metaLang && metaLang.getAttribute("content"))
						item.language = metaLang.getAttribute("content")
				}
				let switchToDE = "https://www.vr-elibrary.de/action/doLocaleChange?locale=de&requestUri=/doi/"+ doi;
					ZU.processDocuments(switchToDE, function (url) {
						let scrapeAbstractsDE = ZU.xpathText(url, '//*[contains(concat( " ", @class, " " ), concat( " ", "abstractInFull", " " ))]');
						if (scrapeAbstractsDE) {
							item.abstractNote = ZU.trimInternal(scrapeAbstractsDE.replace(/^(abstract|zusammenfassung)/gi, '')); //+= '\\n4207 ' + ZU.trimInternal(scrapeAbstractsDE.replace(/^(abstract|zusammenfassung)/gi, ''));
						}
						if (item.series == "Jahrbuch der Religionspädagogik (JRP)") {
							item.itemType = "journalArticle";
							item.DOI = ZU.xpathText(doc, "//meta[@scheme='doi']/@content");
							if (item.volume != undefined) {
							if (item.volume.match(/\d+/) != null) {
								item.volume = item.volume.match(/\d+/)[0];
							}
							item.ISSN = "2567-9384";
							item.publicationTitle = "Jahrbuch der Religionspädagogik (JRP)";
							item.title = ZU.xpathText(doc, '//title').replace(/\s+\|\s+Jahrbuch\s+der\s+Religionspädagogik\s+\(JRP\)$/, '');
							}
						}
						let splitIndex = item.title.indexOf("| Jahrbuch der Religionspädagogik (JRP)");
						if (splitIndex != -1) {
							item.title = item.title.substring(0, splitIndex);
						}
						
						let newNotes = [];
						for (let note of item.notes) {
							if (note['note'].match(/^(?:<p>)?doi:/) == null) {
								newNotes.push(note);
							}
						}
						item.notes = newNotes;
						var bibTexGet = '/action/downloadCitation';
						var bibTexPost = 'doi=' + doi + '&downloadFileName=' + filename + '&format=bibtex&direct=true&include=abs&include=cit';
						ZU.doPost(bibTexGet, bibTexPost, function (text) {
							let creatorString = text.match(/author\s*=\s*{(.+?)}/);
							if (creatorString != null) {
								let creators = creatorString[1].trim().split(/\s+and\s+/);
								let newCreators = [];
								for (let creator of creators) {
									let inverse = false;
									if (item.url.match(/\/weme/) != null) inverse = true;
									newCreators.push(ZU.cleanAuthor(creator, 'author', inverse));
								}
								item.creators = newCreators;
							}
							item.complete();
						});
					});
				//item.complete();
			});
			translator.translate();
		});
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.vr-elibrary.de/doi/10.13109/9783666703034.8",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "»Die Sprache, mit der ich Gott beschreiben könnte, gibt es nicht« – Gedanken von Kindern, Jugendlichen und jungen Erwachsenen",
				"creators": [
					{
						"lastName": "Menne",
						"firstName": "Andreas",
						"creatorType": "author"
					}
				],
				"date": "September 5, 2021",
				"DOI": "10.13109/9783666703034.8",
				"ISSN": "2567-9384",
				"extra": "DOI: 10.13109/9783666703034.8",
				"language": "de",
				"libraryCatalog": "ubtue_vandenhoeck_ruprecht",
				"pages": "8-13",
				"publicationTitle": "Jahrbuch der Religionspädagogik (JRP)",
				"series": "Jahrbuch der Religionspädagogik (JRP)",
				"url": "https://www.vr-elibrary.de/doi/10.13109/9783666703034.8",
				"volume": "37",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.vr-elibrary.de/doi/book/10.13109/9783666703034",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.vr-elibrary.de/doi/10.13109/9783666703034.8",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "»Die Sprache, mit der ich Gott beschreiben könnte, gibt es nicht« – Gedanken von Kindern, Jugendlichen und jungen Erwachsenen",
				"creators": [
					{
						"lastName": "Menne",
						"firstName": "Andreas",
						"creatorType": "author"
					}
				],
				"date": "September 5, 2021",
				"DOI": "10.13109/9783666703034.8",
				"ISSN": "2567-9384",
				"extra": "DOI: 10.13109/9783666703034.8",
				"language": "de",
				"libraryCatalog": "ubtue_vandenhoeck_ruprecht",
				"pages": "8-13",
				"publicationTitle": "Jahrbuch der Religionspädagogik (JRP)",
				"series": "Jahrbuch der Religionspädagogik (JRP)",
				"url": "https://www.vr-elibrary.de/doi/10.13109/9783666703034.8",
				"volume": "37",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.vr-elibrary.de/toc/weme/74/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.vr-elibrary.de/doi/10.13109/weme.2022.74.1.20",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Deutungsassistenz: Empirische Analysen zur Rolle der Krankenhausseelsorger*innen                im säkularen Kontext",
				"creators": [
					{
						"firstName": "Dennis",
						"lastName": "Bock",
						"creatorType": "author"
					},
					{
						"firstName": "Emilia",
						"lastName": "Handke",
						"creatorType": "author"
					}
				],
				"date": "January 14, 2022",
				"DOI": "10.13109/weme.2022.74.1.20",
				"ISSN": "0043-2040",
				"abstractNote": "Das Krankenhaus ist ein Ort, der beispielhaft für eine sich immer stärker säkularisierende Umwelt steht. Für die religiöse Kommunikation der seelsorgenden Pastor*innen ergeben sich damit spezifische kreative Übersetzungsherausforderungen. Wie diese gelöst werden, zeigt der vorliegende Aufsatz am Beispiel von Interviews mit Krankenhausseelsorgenden, die 2019 in Hamburg geführt wurden.",
				"issue": "1",
				"language": "de",
				"libraryCatalog": "ubtue_vandenhoeck_ruprecht",
				"pages": "20-33",
				"publicationTitle": "Wege zum Menschen",
				"shortTitle": "Deutungsassistenz",
				"url": "https://www.vr-elibrary.de/doi/10.13109/weme.2022.74.1.20",
				"volume": "74",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
