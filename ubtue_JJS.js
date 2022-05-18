{
	"translatorID": "70d46621-7e9e-4ce8-a10c-72edf90e7c4e",
	"label": "ubtue_JJS",
	"creator": "Helena Nebel",
	"target": "www.jjs-online.net(\\/archives\\/article\\/)|(\\/contents\\/search\\/)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 95,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-04-26 09:21:06"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2021 Universitätsbibliothek Tübingen.  All rights reserved.
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
	if (url.match(/\/contents\/search\//) && getSearchResults(doc)) return "multiple";
	else if (url.match(/\/article\//)) return "journalArticle";
	else return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[@role="tablist"]');
	for (let row of rows) {
		let href = ZU.xpathText(row, './/a[contains(@href, "/article/")]/@href');
		if (href != null) {
			let title = ZU.xpathText(row, './/span[@class="title"]');
			if (!href || !title) continue;
			found = true;
			items[href] = title;
		}
	}
	Z.debug(items)
	return found ? items : false;
}

function scrape(doc, url) {
	let i = new Zotero.Item("journalArticle");
	i.title = ZU.xpathText(doc, '//span[@class="title"]');
	let metadata = ZU.xpathText(doc, '//span[@class="metadata"]');
	i.pages = metadata.match(/\|\s+pp\.\s+([\d]+(?:–[\d]+)?)\s*$/)[1].replace('–', '-');
	i.issue = metadata.match(/\|\s+no\.\s+([\d-]+)\s+\|/)[1];
	i.volume = metadata.match(/\|\s+vol\.\s+([\d-]+)\s+\|/)[1];
	i.date = metadata.match(/\s+(\d{4})\s+/)[1];
	i.abstractNote = ZU.xpathText(doc, '//span[@class="abstract"]');
	i.DOI = ZU.xpathText(doc, '//span[@class="doi"]/a/@href').replace(/https?:\/\/doi\.org\//, '');
	i.url = url;
	i.language = "eng";
	let creators = ZU.xpath(doc, '//span[@class="author"]');
	for (let creator of creators) {
		i.creators.push(ZU.cleanAuthor(creator.textContent, 'author'));
	}
	i.ISSN = "2056-6689";
	i.publicationTitle = "Journal of Jewish Studies";
	if (ZU.xpathText(doc, '//span[@class="by"]') != null) {
		if (ZU.xpathText(doc, '//span[@class="by"]').match(/^Reviewed\s+by\s+.+/) != null) {
			i.creators.push(ZU.cleanAuthor(ZU.xpathText(doc, '//span[@class="by"]').match(/^Reviewed\s+by\s+(.+$)/)[1], 'author'));
			i.tags.push('RezensionstagPica');
			let isbn = ZU.xpathText(doc, '//span[@class="isbn"]');
			i.tags.push('#reviewed_pub#isbn::' + isbn.replace(/ISBN\s+/, '') + '#');
		}
	}
	
	i.attachments = [];
	i.complete();
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
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.jjs-online.net/archives/article/3520",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "What did the Rabbis know about grammar? Exegesis and grammatical gender in late antiquity",
				"creators": [
					{
						"firstName": "Benjamin",
						"lastName": "Williams",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.18647/3520/jjs-2022",
				"ISSN": "2056-6689",
				"abstractNote": "The first systematic analyses of Hebrew grammar were composed by Rabbanite and Karaite scholars of the tenth and eleventh centuries, partly by drawing on the conventions of Arabic linguistics. However, certain technical grammatical terms, including the expressions leshon zakhar (‘masculine’) and leshon neqevah (‘feminine’), can be found in Midrashic and Talmudic texts. This article considers the grammatical knowledge underlying the rabbinic expositions. Points of comparison are sought in late-antique grammatical treatises and non-rabbinic interpretive works, including Philo’s commentaries and scholia on the Iliad and Aeneid, with particular attention to perceived relationships between grammatical gender and cultural gender norms. By differentiating this understanding of linguistic gender from those articulated in the commentaries and grammars of medieval Jewish scholars of the Muslim world, the article argues that the rabbinic expositions were shaped by grammatical concepts that are well attested in late-ancient Graeco-Roman textual scholarship.",
				"issue": "1",
				"language": "eng",
				"libraryCatalog": "ubtue_JJS",
				"pages": "1-23",
				"publicationTitle": "Journal of Jewish Studies",
				"shortTitle": "What did the Rabbis know about grammar?",
				"url": "https://www.jjs-online.net/archives/article/3520",
				"volume": "73",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.jjs-online.net/archives/article/3532",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Charity in Rabbinic Judaism: Atonement, Rewards, and Righteousness",
				"creators": [
					{
						"firstName": "Krista N.",
						"lastName": "Dalton",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.18647/3532/jjs-2022",
				"ISSN": "2056-6689",
				"issue": "1",
				"language": "eng",
				"libraryCatalog": "ubtue_JJS",
				"pages": "196-199",
				"publicationTitle": "Journal of Jewish Studies",
				"shortTitle": "Charity in Rabbinic Judaism",
				"url": "https://www.jjs-online.net/archives/article/3532",
				"volume": "73",
				"attachments": [],
				"tags": [
					{
						"tag": "#reviewed_pub#isbn::978-1-13859-996-3#"
					},
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.jjs-online.net/contents/search/searchme:/year:2022/type:all/volume:73/fpage:",
		"items": "multiple"
	}
]
/** END TEST CASES **/
