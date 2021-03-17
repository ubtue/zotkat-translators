{
	"translatorID": "af110456-03a1-4335-9b39-613f2814cdd2",
	"label": "ubtue_Sabinet",
	"creator": "Madeesh Kannan",
	"target": "^https://journals.co.za/[a-zA-Z]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-03-17 15:49:09"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Universitätsbibliothek Tübingen.  All rights reserved.
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
	if (url.includes('/doi'))
		return "journalArticle";
	else if (url.includes('/toc/') && getSearchResults(doc))
		return "multiple";
	else 
		return false
}


function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[@class="issue-item__title"]/a')
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function invokeEMDTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		// add keywords
		i.tags = ZU.xpath(doc, '//li/strong[contains(text(), "Keyword(s)")]/../a').map(n => n.textContent);

		// add the persistent handle
		var handleLink = ZU.xpathText(doc, '//a[contains(@href,"hdl.handle.net")]/@href').trim();
		if (!handleLink || handleLink.length < 24) {
			Z.debug("invalid handle Id");
			return;
		}

		var handle = handleLink.substring(23);   // strip the the domain name
			i.notes.push({
				note: "hdl:" + handle,
			});
		
		i.complete();
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
			ZU.processDocuments(articles, invokeEMDTranslator);
		});
	} else
		invokeEMDTranslator(doc, url);
}
