{
	"translatorID": "e86123a9-59a1-474a-ad01-f54fc210f6e0",
	"label": "ubtue_TheoWeb",
	"creator": "Helena Nebel",
	"target": "^https?://(www\\.)?theo-web\\.de/(ausgaben/\\d{4}/\\d+-jahrgang-\\d{4}-heft-\\d+(/.*)?|zeitschrift/ausgabe-\\d{4}-\\d{2}\\w?/?)|openjournals\\.fachportal-paedagogik\\.de/theo-web/(issue/view/\\d+|article/view/\\d+)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-09-30 11:23:12"
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
var pagesData = {};
var pagesList = [];

function detectWeb(doc, url) {
	if (/\/article\/view\/\d+/.test(url)) {
		return "journalArticle";
	} else if (/\/issue\/view\/\d+/.test(url)) {
		return "multiple";
	} else if (/\/ausgaben\/?$/.test(url) || /\/\d+-jahrgang-\d{4}-heft-\d+\/?$/.test(url)) {
		if (doc.querySelector('td.th-titel')) {
			return "multiple";
		}
	} else if (/\/zeitschrift\/ausgabe-\d{4}-\d{2}\w?\/?$/.test(url)) {
		if (doc.querySelector("div.download-pdf")) {
			return "multiple";
		}
	}
	return false;
}

function normalizeUrl(url) {
	return new URL(url, document.baseURI).href;
}

function getSearchResults(doc, checkOnly) {
	var items = {};

	let articleLinks = doc.querySelectorAll('.ubhdOjsTheme_articleLinks a.ubhdOjsTheme_toTheArticle[href*="/article/view/"]');
	if (articleLinks.length) {
		for (let link of articleLinks) {
			let href = link.href;
			let titleNode = link.closest(".obj_article_summary")?.querySelector("h3");
			let title = titleNode?.textContent?.trim();

			if (href && title) {
				if (checkOnly) return true;
				items[href] = title;
			}
		}
		if (checkOnly) return false;
		return items;
	}

	var found = false;
	var rows = ZU.xpath(doc, '//tr');
	for (let row of rows) {
		let href = ZU.xpathText(row, './/td[@class="th-titel"]/a/@href');
		let title = ZU.xpathText(row, './/td[@class="th-titel"]/a');
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
		articleData[href] = row;
		let pageText = ZU.xpathText(row, './/th[@class="th-site"]') || "";
		pageText = pageText.replace(/\n+|\s+/g, '');
		pagesData[href] = pageText;
		pagesList.push(pageText);
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (/\/article\/view\/\d+/.test(url)) {
		invokeEmbeddedMetadataTranslator(doc, url);
	} else if (/\/issue\/view\/\d+/.test(url)) {
		let items = getSearchResults(doc, false);
		Zotero.selectItems(items, function (selectedItems) {
			if (!selectedItems) return;
			let urls = Object.keys(selectedItems);
			ZU.processDocuments(urls, invokeEmbeddedMetadataTranslator);
		});
	} else if (/\/ausgaben\/?$/.test(url) || /\/\d+-jahrgang-\d{4}-heft-\d+\/?$/.test(url)) {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) return;
			for (let i in items) {
				scrapeNewLayout(doc, articleData[i]);
			}
		});
	} else if (/\/zeitschrift\/ausgabe-\d{4}-\d{2}\w?\/?$/.test(url)) {
		scrapeOldLayout(doc, url);
	}
}

function scrapeNewLayout(doc, row) {
	var item = new Zotero.Item('journalArticle');
	item.title = ZU.xpathText(row, './td[@class="th-titel"]').trim();
	item.url = 'https://www.theo-web.de' + ZU.xpathText(row, './td[@class="th-titel"]/a/@href');

	for (let creatorCell of ZU.xpath(row, './td[@class="th-autor"]')) {
		for (let creator of creatorCell.textContent.split(/\s*,\s*/)) {
			item.creators.push(ZU.cleanAuthor(creator.replace(/\s*Sr\.\s*/, ''), "author"));
		}
	}

	let firstPage = pagesData[ZU.xpathText(row, './td[@class="th-titel"]/a/@href')];
	if (pagesList.indexOf(firstPage) + 1 < pagesList.length) {
		let lastPage = parseInt(pagesList[pagesList.indexOf(firstPage) + 1]) - 1;
		item.pages = firstPage + '-' + lastPage.toString();
	} else {
		item.pages = firstPage + '-';
	}

	let match = item.url.match(/\/(\d+)-jahrgang-(\d{4})-heft-(\d+)\//);
	if (match) {
		item.volume = match[1];
		item.date = match[2];
		item.issue = match[3];
	}

	item.ISSN = "1863-0502";
	item.publicationTitle = "Zeitschrift für Religionspädagogik. Theo-Web";

	ZU.doGet(item.url, function (text) {
		let parser = new DOMParser();
		let html = parser.parseFromString(text, "text/html");
		item.abstractNote = ZU.xpathText(html, '//meta[@name="description"]/@content');
		let keywords = ZU.xpathText(html, '//meta[@name="keywords"]/@content');
		if (keywords) {
			item.tags = keywords.split(/\s*,\s*/);
		}

		let doiTag = ZU.xpathText(html, '//p[@class="artikel-info"]');
		if (doiTag) {
			let doiMatch = doiTag.match(/https:\/\/doi.org\/([^\s]+)/);
			if (doiMatch) {
				item.DOI = doiMatch[1];
			}
		}

		item.complete();
	});
}

function scrapeOldLayout(doc, url) {
	let items = {};
	let entries = doc.querySelectorAll("div.download-pdf");

	for (let entry of entries) {
		let text = entry.querySelector("div.spalte-rechts p")?.textContent.trim();
		let pdfLink = entry.querySelector("a[href$='.pdf']")?.href;

		if (!text || !pdfLink) continue;

		if (!pdfLink.startsWith("http")) {
			let base = (new URL(url)).origin;
			pdfLink = base + (pdfLink.startsWith("/") ? "" : "/") + pdfLink;
		}

		let preview = text.slice(0, 120).replace(/\s+/g, " ").trim();
		items[pdfLink] = preview;
	}

	let reviewEntries = new Set();

	let h2s = Array.from(doc.querySelectorAll("h2"));
	for (let h2 of h2s) {
		if (h2.textContent.includes("Rezensionen")) {
			let sibling = h2.nextElementSibling;
			while (sibling && sibling.tagName !== "H2") {
				if (sibling.classList.contains("download-pdf")) {
					reviewEntries.add(sibling);
				}
				sibling = sibling.nextElementSibling;
			}
			break;
		}
	}

	Zotero.selectItems(items, function (selectedItems) {
		if (!selectedItems) return;

		for (let pdfUrl in selectedItems) {
			let entry = [...doc.querySelectorAll("div.download-pdf")].find(e => {
				let link = e.querySelector("a[href$='.pdf']");
				return link && normalizeUrl(link.href) === normalizeUrl(pdfUrl);
			});
			if (!entry) continue;

			let text = entry.querySelector("div.spalte-rechts p")?.textContent.trim();
			if (!text) continue;

			let item = new Zotero.Item("journalArticle");

			let hasAbstract = false;
			let pagesMatch = text.match(/\(Seiten?\s*\d+([-–]\d+)?\)/i);
			if (!pagesMatch) {
				pagesMatch = text.match(/,?\s*Seite\s*\d+([-–]\d+)?/i);
			} else {
				hasAbstract = true;
			}

			if (pagesMatch) {
				item.pages = pagesMatch[0].replace(/[^\d–\-]/g, "").trim();
				text = text.replace(pagesMatch[0], "").trim();
			}

			let authorStr, rest;

			let colonIndex = text.indexOf(":");
			if (colonIndex !== -1) {
				authorStr = text.substring(0, colonIndex).trim();
				rest = text.substring(colonIndex + 1).trim();
			} else {
				let commaIndex = text.indexOf(",");
				if (commaIndex !== -1) {
					authorStr = text.substring(0, commaIndex).trim();
					rest = text.substring(commaIndex + 1).trim();
				} else {
					item.title = text;
					authorStr = null;
					rest = null;
				}
			}

			if (authorStr) {
				let authors = authorStr.split(/\s*(?:\/|&| und )\s*/);
				for (let name of authors) {
					name = name.replace(/\.+$/, '').trim();
					if (name) item.creators.push(ZU.cleanAuthor(name, "author"));
				}
			}

			if (rest) {
				if (hasAbstract) {
					let periodIndex = rest.indexOf(". ");
					if (periodIndex !== -1) {
						item.title = rest.substring(0, periodIndex + 1).trim();
						item.abstractNote = rest.substring(periodIndex + 1).trim();
					} else {
						item.title = rest;
					}
				} else {
					item.title = rest;
				}
			}

			item.publicationTitle = "Zeitschrift für Religionspädagogik. Theo-Web";
			item.ISSN = "1863-0502";
			item.url = url;

			let h1 = doc.querySelector("h1");
			if (h1) {
				let h1Text = h1.textContent;

				let volumeMatch = h1Text.match(/(\d+)\.\s*Jahrgang/i);
				if (volumeMatch) {
					item.volume = volumeMatch[1];
				}
				let yearMatch = h1Text.match(/Jahrgang\s+(\d{4})/i);
				if (yearMatch) {
					item.date = yearMatch[1];
				}
				let issueMatch = h1Text.match(/Heft\s+(\d+)/i);
				if (issueMatch) {
					item.issue = issueMatch[1];
				}
			}

			let langMeta = doc.querySelector('meta[name="language"]');
			if (langMeta) {
				item.language = langMeta.getAttribute("content");
			}

			if (reviewEntries.has(entry)) {
				item.notes.push({ note: "RezensionstagPica" });
			}

			item.attachments.push({
				url: pdfUrl,
				title: "Full Text PDF",
				mimeType: "application/pdf"
			});

			item.complete();
		}
	});
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	let translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, item) {
		item.itemType = 'journalArticle';
		item.attachments = [];
		item.complete();
	});
	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.theo-web.de/ausgaben/2022/21-jahrgang-2022-heft-1",
		"items": "multiple"
	}
]
/** END TEST CASES **/
