{
	"translatorID": "cd7bdef7-2d51-4553-b623-8e9242caf817",
	"label": "ubtue_nirc",
	"creator": "Paula Hähndel",
	"target": "https://nirc.nanzan-u.ac.jp/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-08-05 14:12:01"
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
	if (url.match(/article/)) {
		return "journalArticle";
	}
	else {
		if (getSearchResults(doc)) return "multiple";
	}
	return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//ul//a[@class="sub"]');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = rows[i].textContent;
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function getYear(doc, item) {
	let rows = ZU.xpath(doc, '//div[h2]');
	for (let r in rows) {
		let row = rows[r].textContent;
		if (row.includes("Volume "+item.volume) && row.includes("Issue "+item.issue)) {
			item.date = row.match(/\s(\d{4})\s/)[1];
		}
	}
	item.complete();
}

function getPages(doc, url, item) {
	let rows = ZU.xpath(doc, '//ul//a[@class="sub"]');
	for (let i in rows) {
		let row = rows[i].textContent;
		if (row.includes(item.title.trim())) {
			if (row.match(/\[\d+-?\d*\]/)) item.pages = row.match(/\[(\d+-?\d*)\]/)[1];
		} 
	}
	if (item.pages) item.pages = item.pages.trim().replace(/^([^-]+)-\1$/, '$1');
	let urlo = url.substring(0,url.lastIndexOf("issue")-1);
	ZU.processDocuments(urlo, function (doc) {
			getYear(doc, item)
		});
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	let translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, item) {
		item.itemType = 'journalArticle';
		if (item.title == "NIRC") item.ISSN = "0304-1042";
		if (ZU.xpathText(doc, '//main/div/p')) {
			item.abstractNote = ZU.xpathText(doc, '//main/div/p').replace(/\n/g," ");
		}
		if (ZU.xpath(doc, '//div[@class="component-article-authors"]/p')) {
			let names = ZU.xpath(doc, '//div[@class="component-article-authors"]/p');
			for (let i in names) {
				let name = names[i].textContent;
				firstname = name.substring(0,name.lastIndexOf(" "));
				lastname = name.substring(name.lastIndexOf(" ")+1);
				item.creators.push({"firstName": firstname, "lastName": lastname, "creatorType": "author"});
			}
		}
		let issueinfo = ZU.xpathText(doc, '//main//h1//a');
            if (issueinfo) {
            let volumeMatch = issueinfo.match(/Volume (\d+)/);
            item.volume = volumeMatch ?  volumeMatch[1] : null;
            let issueMatch = issueinfo.match(/Issue (\d+)/);
            item.issue = issueMatch ? issueMatch[1] : null;
		}
		if (ZU.xpathText(doc, '//main//h1//span')) {
			let title = ZU.xpathText(doc, '//main//h1//span');
			item.title = title.substring(title.indexOf(",")+2).trim();
		}
		if (item.title.match(/^Review of:/) || item.title.match(/^Review Discussion/)) {
			item.tags.push("RezensionstagPica");
		}
		item.attachments = [];
		//item.complete();
		let urlo = url.substring(0,url.lastIndexOf("article")-1);
		ZU.processDocuments(urlo, function (doc) {
			getPages(doc, urlo, item)
		});
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
		"url": "https://nirc.nanzan-u.ac.jp/journal/6/issue/341",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://nirc.nanzan-u.ac.jp/journal/6/issue/341/article/2330",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Korea in the Kamiyo: Locating Korea in the Age of the Gods Narratives in Early Modern Japan",
				"creators": [
					{
						"firstName": "Ilsoo",
						"lastName": "Cho",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISSN": "0304-1042",
				"abstractNote": "Early modern Japan witnessed new and unprecedented debates surrounding ancient history, including a school of thought that suggested a significant Korean influence upon ancient Japan. This line of thought contrasted sharply with the contemporary school of kokugaku, which emphasized the traditional understanding of Japan as entirely indigenous. Scholars of kokugaku often positioned their work as a polemic against what they perceived as the widespread influence of traditions imported from China, especially Confucianism, for their alleged corruption of an autochthonic Japanese culture. Modern interpreters of kokugaku thereby focused on the issue of their revulsion of Chinese influence. Focusing on Motoori Norinaga, often considered the consummator of kokugaku, this article analyzes Norinaga’s responses to interpretations of a possible Korean origin of Japanese culture and customs. By contriving commentaries that eliminated such possibilities, this article argues that Norinaga attempted to defend the traditional understanding of ancient Japan as entirely indigenous and unified ab initio.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "nirc.nanzan-u.ac.jp",
				"pages": "1-20",
				"shortTitle": "Korea in the Kamiyo",
				"url": "https://nirc.nanzan-u.ac.jp/journal/6/issue/341/article/2330",
				"volume": "49",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://nirc.nanzan-u.ac.jp/journal/3/issue/347/article/2367",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Annual Update: Japanese Journal of Religious Studies",
				"creators": [
					{
						"firstName": "Matthew D.",
						"lastName": "McMullen",
						"creatorType": "author"
					}
				],
				"ISSN": "0304-1042",
				"language": "en",
				"libraryCatalog": "nirc.nanzan-u.ac.jp",
				"pages": "7-9",
				"shortTitle": "Annual Update",
				"url": "https://nirc.nanzan-u.ac.jp/journal/3/issue/347/article/2367",
				"volume": "47",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
