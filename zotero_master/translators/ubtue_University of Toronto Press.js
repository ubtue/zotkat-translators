{
    "translatorID": "4ccf849b-f9e9-4cec-9bae-7c10aa4dea53",
    "label": "ubtue_University of Toronto Press",
    "creator": "Madeesh Kannan",
    "target": "^https?://(www\\\\.)?utpjournals\\.press/((doi)|(toc))/",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 90,
    "inRepository": true,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2020-09-23 12:53:40"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Universitätsbibliothek Tübingen.  All rights reserved.

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
    if (url.match(/\/toc\//))
        return "multiple";
    else if (url.match(/\/doi\//)) {
        // placeholder, actual type determined by the embedded metadata translator
        return "journalArticle";
    }
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[@class="art_title linkable"]/a')
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function postProcess(doc, item) {
	var volIssue = ZU.xpathText(doc, '//div[@class="journalNavTitle"]');
	var page = ZU.xpathText(doc, '//span[@class="articlePageRange"]');

	if (!item.volume && (match = volIssue.match(/Volume\s(\d+)/)))
		item.volume = match[1];
	if (!item.issue && (match = volIssue.match(/Issue\s(\d+)/)))
		item.issue = match[1];
	if (!item.pages && (match = page.match(/^pp\.\s(\d+-\d+)/)))
		item.pages = match[1];

	var abstract = ZU.xpathText(doc, '//div[contains(@class, "abstractInFull")]//p');
	if (!item.abstractNote || item.abstractNote.length < abstract.length)
		item.abstractNote = abstract;

    var keywords = ZU.xpath(doc, '//kwd-group//a');
    if (keywords)
        item.tags = keywords.map(function(x) { return x.textContent.trim(); })

    item.complete();
}

function invokeEmbeddedMetadataTranslator(doc, url) {
    var translator = Zotero.loadTranslator("web");
    translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
    translator.setDocument(doc);
    translator.setHandler("itemDone", function (t, i) {
        postProcess(doc, i);
    });
    translator.translate();
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
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
    } else
        invokeEmbeddedMetadataTranslator(doc, url);
}
/** BEGIN TEST CASES **/
var testCases = [
    {
        "type": "web",
        "url": "https://utpjournals.press/doi/full/10.3138/tjt-2020-0003",
        "items": [
            {
                "itemType": "journalArticle",
                "title": "Quantum Mechanics and Salvation: A New Meeting Point for Science and Theology",
                "creators": [
                    {
                        "firstName": "Emily",
                        "lastName": "Qureshi-Hurst",
                        "creatorType": "author"
                    }
                ],
                "date": "2020-07-02",
                "DOI": "10.3138/tjt-2020-0003",
                "abstractNote": "Quantum mechanics has recently indicated that temporal order is not always fixed, a finding that has far-reaching philosophical and theological implications. The phenomena, termed “indefinite causal order,” shows that events can be in a superposition with regard to their order. In the experimental setting with which this article is concerned, two events, A and B, were shown to be in the ordering relations “A before B” and “B before A” at the same time. This article introduces an ongoing project that seeks to make sense of this result, with a particular focus on the methodology by which this research will be undertaken. Specific research questions, particularly regarding what indefinite causal order might mean for the metaphysics of time and the doctrine of salvation, are introduced. The collaborative approach detailed brings together the disciplinary skills of a working scientist and a working theologian. What is offered is a collaborative methodology for interaction between science and religion that is more than the sum of its parts. Alister McGrath’s idea of multiple rationalities is employed as an epistemological framework within which this research takes place. Within an epistemologically pluralistic model, collaborative efforts are not only encouraged but necessary. Complex reality requires an equally complex, usually interdisciplinary, explanation. I argue that such dialogue is both theologically justified and culturally valuable and indicates the direction in which this research will be taken.",
                "archiveLocation": "world",
                "issue": "1",
                "language": "en",
                "libraryCatalog": "utpjournals.press",
                "pages": "3-13",
                "publicationTitle": "Toronto Journal of Theology",
                "rights": "Toronto Institute of Theology 2019",
                "shortTitle": "Quantum Mechanics and Salvation",
                "url": "https://utpjournals.press/doi/abs/10.3138/tjt-2020-0003",
                "volume": "36",
                "attachments": [
                    {
                        "title": "Snapshot",
                        "mimeType": "text/html"
                    }
                ],
                "tags": [
                    {
                        "tag": "indefinite causal order"
                    },
                    {
                        "tag": "philosophy of time"
                    },
                    {
                        "tag": "quantum mechanics"
                    },
                    {
                        "tag": "salvation"
                    },
                    {
                        "tag": "science and religion"
                    }
                ],
                "notes": [],
                "seeAlso": []
            }
        ]
    }
]
/** END TEST CASES **/
