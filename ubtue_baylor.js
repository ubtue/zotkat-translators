{
	"translatorID": "e93adc6a-96fc-4256-92ca-48a15e7202a4",
	"label": "ubtue_baylor",
	"creator": "Helena Nebel",
	"target": "https?://www.baylor.edu/prs/index.php\\?id=",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-10-10 10:28:34"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Universitätsbibliothek Tübingen.  All rights reserved.
	
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

var articleData = {};
var date = "";
var volume = "";
var issue = "";
var ISSN = "";

function romanToInt(r) {
	if (r.match(/^[IVXLCM]+/i)) {
		r = r.toUpperCase()
	const sym = { 
		'I': 1,
		'V': 5,
		'X': 10,
		'L': 50,
		'C': 100,
		'D': 500,
		'M': 1000
	}
	let result = 0;
	for (i=0; i < r.length; i++){
		const cur = sym[r[i]];
		const next = sym[r[i+1]];
		if (cur < next){
			result += next - cur 
			i++
		} else {
			result += cur
		}
	}

	return result; 
	}
	else return r;
};


function detectWeb(doc, url) {
	if (getSearchResults(doc, true)) return "multiple";
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var html = ZU.xpath(doc, '//div[@class="contentMain"]');
	let volumeInformation = ZU.xpathText(doc, '//title');
	if (volumeInformation && volumeInformation.match(/\d{4}\s+Volume\s+\d+(?:\s+|$)/)) {
		date = volumeInformation.match(/(\d{4})\s+Volume\s+\d+(?:\s+|$)/)[1];
		volume = volumeInformation.match(/\d{4}\s+Volume\s+(\d+)(?:\s+|$)/)[1];
	}
	let issues = html[0].innerHTML.split('<h3><a name="issue');
	let article_nr = 0;
	for (let issue of issues) {
		let issueNumber = "";
		if (issue.match(/<u>Issue\s+\d+/)) {
			issueNumber = issue.match(/<u>Issue\s+(\d+)/)[1];
		}
		else continue;

		for (let article of issue.split(/<p>(?:&nbsp;)+<\/p>/)) {
			article = article.replace(/<\/?i>/g, '')
			if (article.match(/<p><(?:b|strong)>([^<]+)<\/(?:b|strong)>.*<\/p>\n*<p>(.+?)<\/p>\n*<p>[^<]+<\/p>\n*/)) {
				
				let abstract = "";
				let possible_abstracts = article.match(/<p>(.+?)<\/p>/g);
				for (let possible_abstract of possible_abstracts) {
					if (possible_abstract.length > 300) {
						abstract = possible_abstract.replace(/<\/?p>/g, '')
					}
				}
				items[date + ':::' + volume + ':::' + issueNumber + ':::' + article_nr.toString()] = article.match(/<p><(?:b|strong)>[^<]+<\/(?:b|strong)>.*<\/p>/)[0].replace(/<\/?[^>]+>/g, '');
				
				articleData[date + ':::' + volume + ':::' + issueNumber + ':::' + article_nr.toString()] = article.match(/<p><(?:b|strong)>([^<]+)<\/(?:b|strong)>.*<\/p>\n*<p>(.+?)<\/p>\n*<p>[^<]+<\/p>\n*/)[0] + ':::' + abstract;
				article_nr += 1;
				var found = true;
			}
			else if (article.match(/<p><(?:b|strong)>[^<]+<\/(?:b|strong)>.+/)) {
				let abstract = "";
				let possible_abstracts = article.match(/<p>(.+?)<\/p>/g);
				for (let possible_abstract of possible_abstracts) {
					if (possible_abstract.length > 300) {
						abstract = possible_abstract.replace(/<\/?p>/g, '')
					}
				}
				items[date + ':::' + volume + ':::' + issueNumber + ':::' + article_nr.toString()] = article.match(/<p><(?:b|strong)>[^<]+<\/(?:b|strong)>.+/)[0].replace(/<\/?[^>]+>/g, '');
				articleData[date + ':::' + volume + ':::' + issueNumber + ':::' + article_nr.toString()] = article.match(/<p><(?:b|strong)>[^<]+<\/(?:b|strong)>.+/)[0] + ':::' + abstract;
				
				article_nr += 1;
				var found = true;
			}
		}
	}
	//Z.debug(articleData)
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		if (url.match(/baylor.edu\/prs\//)) ISSN = "0093-531X";
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				scrape(doc, articleData[i], i);
			}
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, text, data) {
	//Z.debug(data)
	var item = new Zotero.Item('journalArticle');
	if (data.match(/(\d+):::(\d+):::0?(\d+):::/)) {
		item.date = data.match(/(\d+):::(\d+):::0?(\d+):::/)[1];
		item.volume = data.match(/(\d+):::(\d+):::0?(\d+):::/)[2];
		item.issue = data.match(/(\d+):::(\d+):::0?(\d+):::/)[3];
	}
	if (text.match(/<p><(?:b|strong)>([^<]+)<\/(?:b|strong)>.*<\/p>\n*<p>(.+?)<\/p>\n*<p>[^<]+<\/p>\n*/)) {
		let title = text.match(/<p><(?:b|strong)>([^<]+)<\/(?:b|strong)>.*<\/p>\n*<p>(.+?)<\/p>\n*<p>[^<]+<\/p>\n*/)[1].split(/:\s+pp./)[0].replace(/:$/, '');
		let author = text.match(/<p><(?:b|strong)>([^<]+)<\/(?:b|strong)>.*<\/p>\n*<p>(.+?)<\/p>\n*<p>[^<]+<\/p>\n*/)[2];
		item.title = title;
		item.creators.push(ZU.cleanAuthor(author, 'author', false));
	}
	else {
		let title = text.match(/<p><(?:b|strong)>([^<]+)<\/(?:b|strong)>.*<\/p>/)[1].split(/:\s+pp./)[0].replace(/:$/, '');
		item.title = title;
	}
	let removed_tags = text.replace(/<\/?[^>]+?>/g, '').split(':::')[0];
	if (removed_tags.match(/pp?\.?\s+\d+(?:-\d+)?/)) item.pages = removed_tags.match(/pp?\.?\s+(\d+(?:[–-]\d+)?)/)[1];
	item.abstractNote = text.replace(/<\/?[^>]+?>/g, '').split(':::')[1].replace(/&nbsp;/g, '');
	Z.debug(ISSN);
	item.ISSN = ISSN;
	item.complete();

	
	
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.baylor.edu/prs/index.php?id=985507",
		"items": "multiple"
	}
]
/** END TEST CASES **/
