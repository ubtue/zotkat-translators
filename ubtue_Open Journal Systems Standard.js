{
	"translatorID": "a5d5ca83-b975-4abe-86c9-d956d7b9c8fa",
	"label": "ubtue_Open Journal Systems Standard",
	"creator": "Timotheus Kim",
	"target": "\\/(article|issue)\\/(view)?",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 98,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-11-14 15:43:29"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.
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

var reviewURLs = [];

function detectWeb(doc, url) {
	if (url.match(/\/article\/view/)) return "journalArticle";
	else if (url.match(/\/issue\/view/) && getSearchResults(doc, url)) return "multiple";
}

function getSearchResults(doc, url) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.title a[href*="/view/"], .article-summary-title a[href*="/view/"], .article__title a[href*="/view/"], .summary_title, .title a[href*="/catalog/"], \
		.tocTitle a[href*="/view/"], .tocArticleTitle a[href*="/view/"], .tocTitle a[href*="/catalog/"], .media-heading a[href*="/view/"]');
	if (rows.length == 0 && url.match(/(otwsa-otssa)|(koersjournal)/)) {
		rows = ZU.xpath(doc, '//div[@class="article-summary-title"]//a');
	}
	if (rows.length == 0 && url.match(/(journals\.us\.edu)/)) {
		rows = ZU.xpath(doc, '//h4[contains(@class, "article-summary-title")]//a');
	}
	if (rows.length == 0 && url.match(/sacra\/issue\/view/)) {
		rows = ZU.xpath(doc, '//h4[contains(@class, "toc_title")]//a');
	}
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent).replace(/pdf/i, '');
		let exclude = ['HTML', 'XML', 'EPUB', 'PDF'];
		if (url.match(/verbumetecclesia\.org/)) {
			if (title == "Browse Archives") continue;
			else if (exclude.includes(title)) continue;
			else if (title.match(/^Table of Contents/)) continue;
		}

		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
		for (let section of ZU.xpath(doc, '//table[@class="tocArticle" and preceding-sibling::h4[@class="tocSectionTitle" and contains(., "Book Review")]]')) {
		let reviewTitle = ZU.xpathText(section, './/div[@class="tocTitle"]');
		for (let link of ZU.xpath(section, './/a/@href')) {
			reviewURLs.push(link.textContent);
			if (items[link.textContent.replace(/\/\d+?$/, "")] == undefined) {
				items[link.textContent.replace(/\/\d+?$/, "")] = reviewTitle;
				reviewURLs.push(link.textContent.replace(/\/\d+?$/, ""));
			}
			else reviewURLs.push(link.textContent);
		}
	}
	return found ? items : false;
}

function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {

		if (i.ISSN == undefined) i.ISSN = ZU.xpathText(doc, '//meta[@name="DC.Source.ISSN"]/@content');
		if (i.ISSN == undefined && i.url.match(/\/godsandmonsters\//) != null) i.ISSN = "IXTH-0001";
		if (i.ISSN == undefined) i.issue = ZU.xpathText(doc, '//meta[@name="DC.Source.Issue"]/@content');
		if (i.ISSN == undefined && i.url.match(/journal.colourturn/) != null) i.ISSN = "ZOJS-0001";

		//article URL and review tag for Journal of the AOS
		if (i.ISSN == "2169-2289") {
			i.url = ZU.xpathText(doc, '//meta[@name="DC.Identifier.URI"]/@content');
			let reviewTag = ZU.xpathText(doc, '//meta[@name="DC.Type.articleType"]/@content');
			if (reviewTag.match(/reviews?$/i)) {
				i.tags.push('RezensionstagPica');
			}
		}
		//replace issue number with volume number for certain journals and delete year
		if (i.ISSN == "2297-6469") {
			i.volume = i.issue.split(/\/\d{4}/i)[0];
			delete i.issue;
		}
		//replace issue number with volume number
		if (['2182-8822'].includes(i.ISSN)) {
			i.volume = i.issue;
			delete i.issue;
		}

		if (i.volume == undefined) i.volume = ZU.xpathText(doc, '//meta[@name="DC.Source.Volume"]/@content');
		if (i.pages == undefined) i.pages = ZU.xpathText(doc, '//meta[@name="DC.Identifier.Pagenumber"]/@content');
		if (i.DOI == undefined) i.DOI = ZU.xpathText(doc, '//meta[@name="DC.Identifier.DOI"]/@content');
		if (i.ISSN == "2521-6465") i.language = ZU.xpathText(doc, '//meta[@name="DC.Language"]/@content');

		if (doc.querySelector(".subtitle")) {
			if (i.title.indexOf(doc.querySelector(".subtitle").textContent.trim().replace(/\s+/g, ' ')) == -1) {
 			i.title = i.title + ' ' + doc.querySelector(".subtitle").textContent.trim();
			}
 		}
 		if (['1804-6444', '1018-1539', '1860-8213'].includes(i.ISSN)) {
 			let subTitle = ZU.xpathText(doc, '//article[@class="article-details"]//h1[@class="page-header"]/small');
 			if (subTitle) {
 				i.title += ': ' + subTitle.trim();
 			}
 		}

		if (i.ISSN == "2293-7374") {
			i.title = i.title.replace( '| Renaissance and Reformation', '');
		}
 		//title in other language for pica-field 4002
 		var articleType = ZU.xpathText(doc, '//meta[@name="DC.Type.articleType"]/@content');
 		if (articleType === "Artículos") {
 			let dcAlternativeTitle = ZU.xpathText(doc, '//meta[@name="DC.Title.Alternative"]/@content');
 			i.archiveLocation = dcAlternativeTitle;
 			if (i.archiveLocation == i.title) {
 				delete i.archiveLocation;
 			}
 		}
		if (articleType && articleType.match(/^(Book Reviews?)/gi) != null) i.tags.push("RezensionstagPica");
		 //orcid for pica-field 8910
   		// Collect all ORCID author entries from various cases
		let orcidAuthorEntryCaseA = doc.querySelectorAll('.authors, .div.authors > strong, author');
		let orcidAuthorEntryCaseB = doc.querySelectorAll('.authors li');
		let orcidAuthorEntryCaseC = doc.querySelectorAll('.authors-string li');
		let orcidAuthorEntryCaseD = doc.querySelectorAll('.authorBio');
		let orcidAuthorEntryCaseE = ZU.xpath(doc, '//div[@class="list-group-item date-published"]');
		let orcidAuthorEntryCaseF = doc.querySelectorAll('.article-main');
		let orcidAuthorEntryCaseG = doc.querySelectorAll('.authors_info');

		const positionTitlesToRemove = ["Prof", "Dr"];

		let cleanAuthorName = (name) => {
			let parts = name.split(' ');
			if (positionTitlesToRemove.includes(parts[0])) {
				parts.shift();
			}
			return parts.join(' ');
		};

		let addNote = (orcid, author) => {
			author = cleanAuthorName(author);
			i.notes.push({note: `orcid:${orcid} | ${author} | taken from website`});
		};

		if (orcidAuthorEntryCaseA.length && ['2653-1372', '0718-4727', '1983-2850'].includes(i.ISSN)) {
			for (let a of orcidAuthorEntryCaseA) {
				let orcidTag = a.querySelector('.orcid');
				let authorTag = a.querySelector('.author');
				if (orcidTag && authorTag) {
					let author = ZU.trimInternal(authorTag.childNodes[0].textContent);
					let orcid = ZU.trimInternal(orcidTag.innerText.replace(/.*(\d{4}-\d{4}-\d{4}-\d+x?)/i, '$1'));
					addNote(orcid, author);
				}
			}
		}

		if (orcidAuthorEntryCaseA.length && ['2617-1953', '2182-8822', '2627-6062'].includes(i.ISSN)) {
			for (let a of orcidAuthorEntryCaseA) {
				let orcidTag = a.querySelector('.orcid');
				let authorTag = a.querySelector('.author');
				if (orcidTag && authorTag) {
					let author = ZU.trimInternal(authorTag.childNodes[1].textContent);
					let orcid = ZU.trimInternal(orcidTag.innerText.match(/\d+-\d+-\d+-\d+x?/gi)[0]);
					addNote(orcid, author);
				}
			}
		}

		if (orcidAuthorEntryCaseA.length && ['2748-6419', '2340-4256', '1860-8213', '2413-3027'].includes(i.ISSN)) {
			for (let a of orcidAuthorEntryCaseA) {
				if (a.innerText.match(/\d+-\d+-\d+-\d+x?/gi)) {
					let orcidTag = ZU.trimInternal(a.innerHTML);
					let matches = orcidTag.match(/<strong>(.+?)<\/strong>.+?<a href="https?:\/\/orcid.org\/(.+?)" target="_blank">/g);
					if (matches) {
						for (let match of matches) {
							let author = match.match(/<strong>(.+?)<\/strong>/)[1];
							let orcid = match.match(/<a href="https?:\/\/orcid.org\/(.+?)" target="_blank">/)[1];
							addNote(orcid, author);
						}
					}
				}
			}
		}

		if (orcidAuthorEntryCaseA.length && !orcidAuthorEntryCaseA[0].innerHTML.match(/\d+-\d+-\d+-\d+x?/gi) && i.ISSN === "2340-4256") {
			for (let c of orcidAuthorEntryCaseF) {
				let name = ZU.xpathText(c, './/strong').split(',')[0];
				let orcid = ZU.xpathText(c, '//*[contains(@href, "orcid.org")]/@href');
				if (orcid) {
					orcid = orcid.match(/\d+-\d+-\d+-\d+x?/gi)[0];
					addNote(ZU.trimInternal(orcid), ZU.trimInternal(name));
				}
			}
		}

		if (orcidAuthorEntryCaseA.length && ['2174-0887', '2254-6227'].includes(i.ISSN)) {
			let allORCIDs = [];
			for (let a of orcidAuthorEntryCaseA) {
				let name = ZU.xpathText(a, './/strong');
				let orcid = ZU.xpathText(a, './/a[contains(@href, "orcid.org")]/@href');
				if (orcid && !allORCIDs.includes(orcid)) {
					addNote(orcid.replace(/https?:\/\/orcid\.org\//g, ''), ZU.trimInternal(name));
					allORCIDs.push(orcid);
				}
			}
		}

		if (orcidAuthorEntryCaseA.length && !orcidAuthorEntryCaseB.length && i.ISSN !== "2660-7743") {
			for (let a of orcidAuthorEntryCaseA) {
				if (a.innerHTML.match(/(<span>.*<\/span>.*https?:\/\/orcid\.org\/\d+-\d+-\d+-\d+x?)/gi)) {
					let author = a.innerHTML.match(/(<span>.*<\/span>.*https?:\/\/orcid\.org\/\d+-\d+-\d+-\d+x?)/gi).toString().replace('<a class="orcidImage" href="', '');
					i.notes.push({note: ZU.unescapeHTML(ZU.trimInternal(author)).replace(/https?:\/\/orcid\.org\//g, ' | orcid:') + ' | taken from website'});
				}
			}
		}

		if (orcidAuthorEntryCaseB.length) {
			for (let b of orcidAuthorEntryCaseB) {
				if (b.innerText.match(/\d+-\d+-\d+-\d+x?/gi)) {
					let orcid = b.innerHTML.match(/<a href="https?:\/\/orcid\.org\/([^"]+)/);
					if (orcid) {
						let name = b.innerHTML.match(/<span class="name">([^<]+)<\/span>/)[1];
						addNote(orcid[1], ZU.trimInternal(name));
					}
				}
			}
		}

		if (orcidAuthorEntryCaseC.length) {
			for (let c of orcidAuthorEntryCaseC) {
				if (c.innerHTML.match(/\d+-\d+-\d+-\d+x?/gi)) {
					let author = ZU.trimInternal(c.innerText).replace('+', '').replace('−', '');
					let orcid = ZU.trimInternal(c.innerHTML).match(/\d+-\d+-\d+-\d+x?/gi);
					addNote(orcid, author);
				}
			}
		}

		if (orcidAuthorEntryCaseD.length) {
			for (let c of orcidAuthorEntryCaseD) {
				if (c.innerHTML.match(/\d+-\d+-\d+-\d+x?/gi)) {
					let orcid = ZU.xpathText(c, './/a[@class="orcid"]/@href', '');
					let author = ZU.xpathText(c, './/em', '');
					if (orcid && author) {
						addNote(orcid.replace(/https?:\/\/orcid.org\//g, ''), ZU.unescapeHTML(ZU.trimInternal(author)).trim());
					}
				}
			}
		}

		if (orcidAuthorEntryCaseE.length && i.ISSN === "1988-7949") {
			for (let c of orcidAuthorEntryCaseE) {
				let name = ZU.xpathText(c, './/strong');
				let orcid = ZU.xpathText(c, './/a[contains(@href, "orcid.org")]/@href');
				if (orcid) {
					addNote(orcid.replace(/https?:\/\/orcid\.org\//g, 'orcid:'), ZU.trimInternal(name));
				}
			}
		}

		if (orcidAuthorEntryCaseG.length) {
			for (let g of orcidAuthorEntryCaseG) {
				let author = ZU.trimInternal(g.innerText);
				let orcid = ZU.trimInternal(g.innerHTML).match(/\d+-\d+-\d+-\d+x?/gi);
				addNote(orcid, author);
			}
		}


 		//clean pages e.g. pages": "6.-6." > 10.25786/cjbk.v0i01-02.631; or "pages": "01-07" > 10.25786/zfbeg.v0i01-02.793
 		if (i.pages != null) i.pages = i.pages.replace('S.', '').replace(/\./g, '').replace(/^([^-]+)-\1$/, '$1').replace(/^0/g, '').replace(/-0/g, '-').replace('â€“', '-');

 		if (i.pages == undefined) {
			let pageNumberFromDC = ZU.xpathText(doc, '//meta[@name="DC.Identifier.pageNumber"]/@content');
			//if the first page number matches the results of second page number (see regex "\1") e.g. 3-3,
			//then replace the range with a first page number e.g 3
			if (pageNumberFromDC != null) i.pages = pageNumberFromDC.trim().replace(/^([^-]+)-\1$/, '$1');
 		}
		if (i.ISSN == "2468-9963") {
			i.notes.push('artikelID:' + i.pages);
			i.pages = "";
		}

 		if (i.date == undefined && ZU.xpathText(doc, '//meta[@name="DC.Date.issued"]/@content') != undefined) {
 			i.date = ZU.xpathText(doc, '//meta[@name="DC.Date.issued"]/@content').substr(0,4);

 		}
 		if (ZU.xpathText(doc, '//meta[@name="DC.Date.issued"]/@content') && i.date.length !== 4 && i.ISSN == '1983-2850') {
			i.date = ZU.xpathText(doc, '//meta[@name="DC.Date.issued"]/@content').substr(0, 4);
		}
		if (i.issue === "0") delete i.issue;
		//clean issue number starting with zero e.g. "number": "01-02" 10.25786/cjbk.v0i01-02.632
		if(i.issue != null) i.issue = i.issue.replace(/^0|/g, '').replace(/-0/g, '-');
		if (i.volume === "0") delete i.volume;
		if (i.abstractNote == undefined) {
			i.abstractNote = ZU.xpathText(doc, '//meta[@name="DC.Description"]/@content');
		}

		else if (i.ISSN == "0555-9308") i.abstractNote = i.abstractNote.replace(/\n/, "\\n4207 ");
		if (i.abstractNote == null) {i.abstractNote = undefined}
		if (i.abstractNote !== undefined) {
			if (i.abstractNote.match(/No abstract available/)) delete i.abstractNote;
			else if (i.abstractNote.match(/^.$|^,\s?,\s?,/)) delete i.abstractNote;
		}
		if (i.tags[1] === undefined && i.tags[0] !='RezensionstagPica') delete i.tags[0];
		let tagsEntry = ZU.xpathText(doc, '//meta[@name="citation_keywords"]/@content');
		if (i.ISSN === "2413-9467" && tagsEntry) {
			tag = tagsEntry.split(/\s*,\s/);
			for (let t in tag) {
				i.tags.push(tag[t].capitalizeFirstLetter()); //alternativ .replace(/^\w/, function($0) { return $0.toUpperCase(); }))
			}
		}
		if (i.tags[0] === "book review") i.tags.push('RezensionstagPica') && delete i.tags[0];
		if (doc.querySelector(".current")) {
			if (doc.querySelector(".current").textContent.trim() === "Book Reviews" || articleType === "Recensiones" || articleType === "Rezensionen") {
				i.tags.push('RezensionstagPica');
			}
		}
		if (i.ISSN === "1982-8136") {
			if (!i.volume) {
				let issueTag = ZU.xpathText(doc, '//div[@class="item issue"]');
				if (issueTag.match(/ANO\s+\d+,\s+N.\s+\d+ \(\d{4}\):/i)) {
					i.volume = issueTag.match(/ANO\s+(\d+),\s+N.\s+\d+ \(\d{4}\):/i)[1];
					i.issue = issueTag.match(/ANO\s+\d+,\s+N.\s+(\d+) \(\d{4}\):/i)[1];
				}
			}

		}
		if (['2792-260X'].includes(i.ISSN)) {
			let abstractes = ZU.xpathText(doc, '//meta[@name="DC.Description"][@*=("es")]/@content');
			let abstracten = ZU.xpathText(doc, '//meta[@name="DC.Description"][@*=("en")]/@content');
			if (abstractes && abstracten) {
				i.notes.push({'note': 'abs:' + abstractes.trim()});
				if(abstractes.trim() == i.abstractNote.trim()) {
					i.abstractNote = abstracten.trim();
				}
				else if(abstracten.trim() != i.abstractNote.trim()) {
					i.notes.push({'note': 'abs:' + abstracten.trim()});
				}
			}
 			if (abstractes && !abstracten) {
				if(abstractes.trim() != i.abstractNote.trim()) {
					i.notes.push({'note': 'abs:' + abstractes.trim()});
				}
			}
			if (!abstractes && abstracten) {
				if(abstracten.trim() != i.abstractNote.trim()) {
					i.notes.push({'note': 'abs:' + abstracten.trim()});
				}
			}
		}
		if (i.ISSN == "1862-5886") {
			i.abstractNote = i.abstractNote.replace(/\n+/g, " ");
		}	
		//artikelnummer anstatt seitenzahlen
		if (i.ISSN == "2175-5841") {
			i.notes.push("artikelID:" + i.pages);
			i.pages = "";
			let volumeIssueEntry = ZU.xpathText(doc, '//*[@class="breadcrumb"]');
 			if (volumeIssueEntry) {
 				i.volume = volumeIssueEntry.trim().match(/v\.\s+(\d{2}),\s+n\.\s+(\d{2})/i)[1];
				i.issue = volumeIssueEntry.trim().match(/v\.\s+(\d{2}),\s+n\.\s+(\d{2})/i)[2];
			}
			if (ZU.xpathText(doc, '//meta[@name="DC.Description"][@*=("es") or @*=("en") or @*=("fr") or @*=("it") or @*=("pt")]/@content')) {
				for (let alternativeAbstract of ZU.xpath(doc, '//meta[@name="DC.Description"][@*=("es") or @*=("en") or @*=("fr") or @*=("it") or @*=("pt")]/@content')) {
					if (alternativeAbstract.value && alternativeAbstract.value != i.abstractNote) {
						i.notes.push({'note': 'abs:' + ZU.unescapeHTML(alternativeAbstract.textContent.trim())});
					}
				}
			}
			let subtitle = ZU.xpathText(doc, '//h1/small');
			if (subtitle) {
				if (i.title.match(/:$/)) {
					if (!i.title.match(subtitle)) {
					i.title = i.title + ' ' + ZU.trimInternal(subtitle);
					}
				}
				else {
					i.title = i.title + ': ' + ZU.trimInternal(subtitle);
				}
			}
		}
		if (i.ISSN === "2336-4483" && ZU.xpathText(doc, '//a[@title="Handle"]/@href')) i.notes.push('handle:' + ZU.xpathText(doc, '//a[@title="Handle"]/@href').replace(/https?:\/\/hdl.handle.net\//, ''));
		//hier anpassen:
		if (i.publicationTitle == "IJoReSH: Indonesian Journal of Religion, Spirituality, and Humanity") i.ISSN = "2962-665X";
		if (i.ISSN == "2962-665X" && !i.pages && ZU.xpathText(doc, '//a[@class="file" and contains(., "PDF")]')
		&& ZU.xpathText(doc, '//a[@class="file" and contains(., "PDF")]').match(/PDF\s*\(\d+(?:-\d+)?\)/)) i.pages = ZU.xpathText(doc, '//a[@class="file" and contains(., "PDF")]').match(/PDF\s*\((\d+(?:-\d+)?)\)/)[1];
		if (["2159-6875"].includes(i.ISSN)) {
			if (reviewURLs.includes(i.url)) i.tags.push("RezensionstagPica");
		}
		if (['2617-3697', '2660-4418', '2748-6419', '1988-3269', '1804-6444', '2391-4327', '2174-0887', '2709-8435'].includes(i.ISSN)) {
			if (ZU.xpath(doc, '//meta[@name="DC.Type.articleType"]')) {
				if (ZU.xpath(doc, '//meta[@name="DC.Type.articleType"]')[0].content.match(/(Media reviews)|(Rezensionen)|(Reseñas)|(Part\s+Two:\s+Reviews)|(Buchbesprechungen)/i)) {
					i.tags.push("RezensionstagPica");
				}
			}
		}
		var authorNames = ZU.xpath(doc, '//meta[@name = "DC.Creator.PersonalName"]');//Z.debug(authorNames)
		newCreators = [];
		for (let entry in authorNames) {
			var authorName = authorNames[entry].content;
			if (authorName.match(/\(review/i)) {
				authorName = authorName.substring(0, authorName.indexOf(" ("));
			newCreators.push(ZU.cleanAuthor(authorName, "author")) ;
			if (!i.tags.includes("RezensionstagPica")) {
					i.tags.push("RezensionstagPica");
				}
			}
			else if (authorName.match(/\(book/i)) {
				i.title = authorName.substring(0, authorName.indexOf(" (")) + ', ' + i.title;
			}
		}
		if (newCreators.length != 0) {
			i.creators = newCreators;
		}
		if (i.tags[0] == undefined) {
			let tags = ZU.xpath(doc, '//meta[@name="citation_keywords"]');
			for (let t in tags) {
				if (!i.tags.includes(tags[t].content)
				&& !i.tags.includes(tags[t].content[0].toUpperCase() + tags[t].content.substring(1)) && tags[t].content != '.')
				i.tags.push(tags[t].content);
			}
		}
 		if (i.ISSN === "1893-4773") {
			var articleType = ZU.xpath(doc, '//meta[@name = "DC.Type.articleType"]');
			if (articleType) {
				if (articleType[0]['content'] == "Bokanmeldelser"){
					if (!i.tags.includes("RezensionstagPica")) {
					i.tags.push("RezensionstagPica");
					}
				}
			}
		}
		if (['2617-3697', '2660-4418', '2748-6419', '2617-1953', '2413-9467'].includes(i.ISSN)) {
			let subtitle = ZU.xpathText(doc, '//h1/small');
			if (subtitle) {
				subtitle = subtitle.replace(/(\n*\t*)/, '');
				if (!i.title.match(subtitle)) {
					i.title = i.title + ': ' + subtitle;
				}
			}
		}
 		if (i.ISSN=="2183-2803") {
 			let abstract = ZU.xpathText(doc, '//meta[@name="DC.Description"]/@content');
 			if (abstract) {
 				i.abstractNote = abstract;
 			}
 		}
		if (i.ISSN == '2660-4418') {
			if (i.abstractNote.indexOf("\nReferences\n") !== -1) {
			i.abstractNote = i.abstractNote.substring(0, i.abstractNote.indexOf("\nReferences\n"));
			}
		}
		if (i.ISSN === '2312-3621' && i.abstractNote) {
			if (i.abstractNote.match(/https:\/\/doi\.org\/\d{2}\.\d+\/.*$/)) {
				i.DOI = i.abstractNote.substring(i.abstractNote.indexOf('https:\/\/doi\.org'), i.abstractNote.length).replace('https://doi.org/', '');
			}
		}
		if (i.ISSN == "2304-8557") {
			let abstractSplitter = /(?:\nAbstract\s?)|(?:\nOpsomming\s?)/;
			let splittingString = i.abstractNote.match(abstractSplitter);
			if (splittingString != null) {
				i.abstractNote = i.abstractNote.replace(splittingString, '\\n4207 ');
			};
			i.abstractNote = i.abstractNote.replace(/[^\\](\n)/g, " ");
		}
		if (i.ISSN == "1853-9106" && i.tags) i.tags = [];
		if (['1853-9106', '2254-6227', '1860-8213', '2500-5413'].includes(i.ISSN)) {
			if (ZU.xpathText(doc, '//meta[@name="citation_keywords"]/@content')) {
				let tagsEntry = ZU.xpathText(doc, '//meta[@name="citation_keywords"]/@content');
				tag = tagsEntry.split(/–|−/g);
				for (let t in tag) {
					i.tags.push(tag[t].capitalizeFirstLetter());
				}
			}
			if (ZU.xpathText(doc, '//meta[@name="DC.Title"]/@content')) {
				for (let parallelTitle of ZU.xpath(doc, '//meta[@name="DC.Title.Alternative"][@*=("es") or @*=("en") or @*=("fr") or @*=("it") or @*=("pt")]/@content')) {
					if (parallelTitle.value && parallelTitle.value != i.title) {
						i.notes.push({'note': 'Paralleltitel:' + ZU.unescapeHTML(parallelTitle.textContent.trim())});
					}
				}
			}
			if (ZU.xpathText(doc, '//meta[@name="DC.Description"][@*=("es") or @*=("en") or @*=("fr") or @*=("it") or @*=("pt")]/@content')) {
				for (let alternativeAbstract of ZU.xpath(doc, '//meta[@name="DC.Description"][@*=("es") or @*=("en") or @*=("fr") or @*=("it") or @*=("pt")]/@content')) {
					if (alternativeAbstract.value && alternativeAbstract.value != i.abstractNote) {
						i.notes.push({'note': 'abs:' + ZU.unescapeHTML(alternativeAbstract.textContent.trim())});
					}
				}
			}
		}
		if (i.ISSN == "2254-6227") {
			if (i.abstractNote.match(/^book review/i)) {
				i.tags = [];
				i.tags.push('RezensionstagPica');
				i.abstractNote = "";
			}
		}
		if (["2237-6461"].includes(i.ISSN)) {
			if (ZU.xpathText(doc, '//meta[@name="DC.Title"]/@content')) {
				for (let parallelTitle of ZU.xpath(doc, '//meta[@name="DC.Title.Alternative"][@*=("es") or @*=("en") or @*=("fr") or @*=("pt") or @*=("de")]/@content')) {
					if (parallelTitle.value && parallelTitle.value != i.title) {
						i.notes.push({'note': 'Paralleltitel:' + ZU.unescapeHTML(parallelTitle.textContent.trim())});
					}
				}
			}
			if (ZU.xpathText(doc, '//meta[@name="DC.Description"][@*=("es") or @*=("en") or @*=("fr") or @*=("de") or @*=("pt")]/@content')) {
				for (let alternativeAbstract of ZU.xpath(doc, '//meta[@name="DC.Description"][@*=("es") or @*=("en") or @*=("fr") or @*=("de") or @*=("pt")]/@content')) {
					if (alternativeAbstract.value && alternativeAbstract.value != i.abstractNote) {
						i.notes.push({'note': 'abs:' + ZU.unescapeHTML(alternativeAbstract.textContent.trim())});
					}
				}
			}
		}
		if (["0717-6295"].includes(i.ISSN)) {
			if (ZU.xpathText(doc, '//meta[@name="DC.Description"][@*=("es") or @*=("en") or @*=("fr") or @*=("it") or @*=("pt")]/@content')) {
				for (let alternativeAbstract of ZU.xpath(doc, '//meta[@name="DC.Description"][@*=("es") or @*=("en") or @*=("fr") or @*=("it") or @*=("pt")]/@content')) {
					if (alternativeAbstract.value && alternativeAbstract.value != i.abstractNote) {
						i.notes.push({'note': 'abs:' + ZU.unescapeHTML(alternativeAbstract.textContent.trim())});
					}
				}
			}
			if (ZU.xpathText(doc, '//*[@class="list-group-item keywords"]/./*[@class=""]/*[@class="value"]')) {
				let tagsEntry = ZU.xpathText(doc, '//*[@class="list-group-item keywords"]/./*[@class=""]/*[@class="value"]');
				tag = tagsEntry.split(/,\s/g);
				for (let t in tag) {
					i.tags.push(ZU.trimInternal(tag[t].capitalizeFirstLetter()));
				}
			}
		}
		if (["2521-6465", "2340-4256", "2595-5977"].includes(i.ISSN)) {
			i.abstractNote = "";
			let resumenTag = ZU.xpathText(doc, '//*[(@id = "summary")] | //*[(@id = "summary")]//h2');
			if (resumenTag && resumenTag.match(/Reseña/gi)) i.tags.push("RezensionstagPica");
			for (let abstractTag of ZU.xpath(doc, '//meta[@name="DC.Description"]/@content')) {
				if (["2340-4256", "2595-5977"].includes(i.ISSN)) abstractTags = abstractTag.textContent.split(/Resumen|Abstract:?/);
				else abstractTags = [abstractTag.textContent];
				for (let abstractText of abstractTags) {
					i.abstractNote += abstractText.split(/Resumen|Abstract/)[0].replace(/\.?Orcid:.+$/, '').replace(/\.?Keywords:.+$/, '').replace(/\.?Palavas clave:.+$/, '').replace(/\.?Palavras-chave:.+/, '') + "\\n4207 ";
					if (i.abstractNote && i.abstractNote.match(/Reseña de libro/gi)) delete i.abstractNote;
					let keyWords = abstractText.split(/(?:\bKey\s*words:\s)|(?:\nКлючевые\s+слова:\s)|(?:\nТүйін\s+сөздер:\s)|(?:\bPalabras\s*clave:)|(?:\nPalavras-chave:)/)[1];
					if (keyWords != undefined) {
						for (let keyWord of keyWords.split(/[,|;]\s+/)) {
							i.tags.push(keyWord.replace(/\.?Orcid:.+$/, '').replace(/\.Doi:.+/g, '').replace(/Doi:.+/g, '').replace(/\..+/g, '').replace(/\n/g, ''));
						}
					}
				}
			}

			i.title = ZU.xpathText(doc, '//meta[@name="DC.Title"]/@content').trim();
			if (!i.title) {
				i.title = ZU.xpathText(doc, '//meta[@name="DC.Title.Alternative"][1]/@content').trim();
			}
			for (let parallelTitle of ZU.xpath(doc, '//meta[@name="DC.Title.Alternative"]/@content')) {
				if (parallelTitle.value != i.title)
				i.notes.push({'note': 'translatedTitle:' + parallelTitle.textContent.trim()});
			}
		}
		if (['0014-1437'].includes(i.ISSN)) {
			if (i.tags.includes('RezensionstagPica')) {
				i.notes.push('LF:');
			}
		}		
		if (["2709-8435", "1018-1539", "1988-4265"].includes(i.ISSN)) {
			let abstracts = ZU.xpath(doc, '//meta[@name="DC.Description"]/@content');
			if (abstracts[1] != null) {
			i.abstractNote = abstracts[0].textContent + '\\n4207 ' + abstracts[1].textContent;
			}
		}
		if (["2952-2196"].includes(i.ISSN)) {
			let abstractTags = ZU.xpath(doc, '//meta[@name="DC.Description"]/@content');
			let abstractNum = 0;
			let abstractSplitters = ["\n&nbsp;\nKeywords:", "\nKeywords:", "\n&nbsp;\nParole chiave:", "\nParole chiave:", "\n&nbsp;\nPalabras clave:", "\nPalabras clave:"];
			for (let abstractTag of abstractTags) {
				let foundAbstractSplitter = false;
				abstractTag = abstractTag.textContent;
				for (let abstractSplitter of abstractSplitters) {
					if (abstractTag.match(abstractSplitter) != null) {
						let abstract = abstractTag.split(abstractSplitter)[0];
						let keywords = abstractTag.split(abstractSplitter)[1];
						if (abstractNum == 0) i.abstractNote = abstract;
						else i.notes.push({'note': 'abs:' + abstract});
						for (let keyword of keywords.split(/\s*[,;]\s*/)) {
							i.tags.push(keyword.replace(/\.$/, '').trim());
						}
						break;
					}
				}
				abstractNum += 1;
			}
		}
		if (i.ISSN == "2748-6419") {
			i.abstractNote = "";
			let abstractNum = 0;
			for (let abstract of ZU.xpath(doc, '//meta[@name="DC.Description"]/@content')) {
				if ((abstract.textContent != "S. Abstract auf Englisch!") && abstract.textContent != "") {
					if (abstractNum == 0) i.abstractNote = abstract.textContent.replace(/&nbsp;/g, '');
					else i.notes.push({'note': 'abs:' + abstract.textContent.replace(/&nbsp;/g, '')});
					abstractNum += 1;
				}
			}
		}
		if (i.url.match(/\/article\/view/)) i.itemType = "journalArticle";
		if (i.abstractNote == ', ' || i.abstractNote == ',') i.abstractNote = "";
		if (i.abstractNote != null) {
			i.abstractNote = i.abstractNote.replace(/(?:^|\n)(?:RESUME|ABSTRACT):\s+/g, '\\n4207 ');
		}
		if (i.ISSN == "2079-5971") {
			let abstractSplitted = i.abstractNote.split(/\n/g);
			let absNr = 0;
			for (let abs of abstractSplitted) {
				if (absNr == 0) i.abstractNote = abs;
				else if (abs.match(/available\s+from/i) && abs.match(/https?:\/\/doi.org\/(.+$)/)) {
					i.DOI = abs.match(/https?:\/\/doi.org\/(.+$)/)[1];
				}
				else i.notes.push('abs:' + abs);
				absNr += 1;
			}
		}
		i.attachments = [];
		let sansidoroAbstract = ZU.xpathText(doc, '//meta[@name="DC.Source.URI"]/@content');
		if (sansidoroAbstract && sansidoroAbstract.match(/isidorianum\/article\/view/)) {
		//multi language abstract e.g. https://www.sanisidoro.net/publicaciones/index.php/isidorianum/article/view/147
			if (articleType === "Artículos") {
				let abstractEN = ZU.xpathText(doc, '//meta[@name="DC.Description"][1]/@content').trim();
				let abstractES = ZU.xpathText(doc, '//meta[@name="DC.Description"][2]/@content').trim();
				i.abstractNote = abstractEN + '\\n4207 ' + abstractES;
			}

			//english keywords e.g. https://www.sanisidoro.net/publicaciones/index.php/isidorianum/article/view/147
			let dcSourceURI = ZU.xpathText(doc, '//meta[@name="DC.Source.URI"]/@content');
			let dcArticleURI = ZU.xpathText(doc, '//meta[@name="DC.Identifier.URI"]/@content');
			let switchLanguageURL = dcSourceURI + '/user/setLocale/en_US?source=/publicaciones/index.php/' + dcArticleURI.split('index.php')[1];
			ZU.processDocuments(switchLanguageURL, function (scrapeTags) {
			var tagentry = ZU.xpathText(scrapeTags, '//meta[@name="citation_keywords"]/@content');
				if (tagentry) {
					let tags = tagentry.split(/\s*,|;\s*/);
					for (let t in tags) {
					i.tags.push(tags[t]);
					}
				}
			});
		}
		else {
			//extract item.volume and item.issue if ojs provides z3988 metadata e.g.1660-5578
			let z3988Entries = ZU.xpathText(doc, '//span[@class="Z3988"]/@title');
			extractVolumeIssueFromZ3988(doc, i, z3988Entries);
			//replace issue number with volume number and delete issue number from function extractVolumeIssueFromZ3988
			if (['2699-3406'].includes(i.ISSN)) {
				i.volume = i.issue;
				delete i.issue;
			}
		}
		if (i.ISSN =='1904-8181') {
			i.volume = i.issue;
			i.issue = "";
		}
		if (i.ISSN == "2413-3027") {
			let uriElement = doc.querySelector('meta[name="DC.Identifier.URI"]');
			if (uriElement) {
				i.url = uriElement.getAttribute('content');
			}
		}
		if (i.tags[1] == undefined && ZU.xpath(doc, '//section[@class="item keywords"]')[0]
		&& ZU.xpath(doc, '//section[@class="item keywords"]')[0]["textContent"]) {
			let tagsstring = ZU.xpath(doc, '//section[@class="item keywords"]')[0]["textContent"].replace(/Keywords?./g,'');
			tagsstring = tagsstring.replace(/Mots-clés?./g,'');
			tagsstring = tagsstring.replace(/\s/g,' ');
			let tags = tagsstring.match(/(?:[^\s,]+ ?)+,?/g);
			for (let t in tags) {
				i.tags.push(tags[t].substring(0,tags[t].length-1));
			}
		}
		
		if (['2317-4307'].includes(i.ISSN)) {
			if (!i.abstractNote) {
				let abstractElement = ZU.xpathText(doc, "//section[@class='item abstract']/p");
				if (abstractElement) {
					i.abstractNote = abstractElement;
				}
			}
			if (i.tags) {
				let tagRegex = /\.|palavras-chave:/i;
				i.tags = i.tags.filter(tag => !tagRegex.test(tag));
			}
		}

		i.tags = [...new Set(i.tags.map(x => x))]

		// only for https://jps.library.utoronto.ca/index.php/renref/article/view/41731"
		if (i.ISSN == "2293-7374") {
			let authors = ZU.xpath(doc, '//meta[@name="DC.Creator.PersonalName"]/@content');
			if (authors) i.creators = authors.map(function(x) { return ZU.cleanAuthor(x.textContent, 'author'); })
			if (i.creators) {
				i.creators = i.creators.filter(creator =>
				creator.firstName !== "Author not" && creator.lastName !== "applicable"
				);
			}
		}

		i.complete();
	});
	translator.translate();
}

String.prototype.capitalizeFirstLetter = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

function extractVolumeIssueFromZ3988(doc, i, z3988Entries) {
	if (z3988Entries) {
		if (z3988Entries.match(/rft.volume=\d+/g)) {
			let regexVolume = /volume=(\d+)/g;
			i.volume = regexVolume.exec(z3988Entries)[1];
		}
		if (z3988Entries.match(/rft.issue=\d.*rft/gi)) {
			i.issue = z3988Entries.split('rft.issue=')[1].split('&')[0].replace('%2B', '/');
			if (i.issue == "0" || i.ISSN == "2297-6469") delete i.issue;
		}
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc, url), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else
		invokeEMTranslator(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.zwingliana.ch/index.php/zwa/article/view/2516",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Geleitwort",
				"creators": [
					{
						"firstName": "Christian",
						"lastName": "Oesterheld",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"ISSN": "0254-4407",
				"journalAbbreviation": "Zwa",
				"language": "en",
				"libraryCatalog": "www.zwingliana.ch",
				"pages": "VII-IX",
				"publicationTitle": "Zwingliana",
				"rights": "Copyright (c) 2019 Christian Oesterheld",
				"url": "https://www.zwingliana.ch/index.php/zwa/article/view/2516",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://jsri.ro/ojs/index.php/jsri/article/view/1194",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Time as a Basic Factor of the Development of Family Relationships in Slovakia",
				"creators": [
					{
						"firstName": "Ladislav",
						"lastName": "Csontos",
						"creatorType": "author"
					},
					{
						"firstName": "Rastislav",
						"lastName": "Bednarik",
						"creatorType": "author"
					},
					{
						"firstName": "Jozef",
						"lastName": "Å½uffa",
						"creatorType": "author"
					}
				],
				"date": "2020/06/26",
				"ISSN": "1583-0039",
				"abstractNote": "In the search for factors affecting the stability of marriage and family, support for the family in changing conditions of adult access to children is based on findings of its empirical research that identified selected value and religious aspects of the family. These were enriched by sociological studies of religiosity and scientific studies from the field of psychology and pedagogy. This made it possible to identify family time spent in building relationships as one of the key factors of its stability. The study also includes some aspects of religious beliefs and their implications on declared values, as well as suggestions for creation of specific pastoral plans.",
				"issue": "56",
				"language": "en",
				"libraryCatalog": "jsri.ro",
				"pages": "3-16",
				"publicationTitle": "Journal for the Study of Religions and Ideologies",
				"rights": "Both JSRI and the authors holds the copyright of all published materials. In addition, authors have the right to use all or part of their texts and abstracts for their own personal use and for their teaching purposes.   Authors have the right to use all or part of the text and abstract, in the preparation of derivative works, extension of the article into book-length or in other works, and the right to include the article in full or in part in a thesis or dissertation or books. Authors are kindly asked to provide acknowledgement of the original publication in JSRI, including the title of the article, the journal name, volume, issue number, page numbers, and year of publication.   For use in non-commercial situations there is no need for authors to apply for written permission from JSRI in advance.",
				"url": "http://jsri.ro/ojs/index.php/jsri/article/view/1194",
				"volume": "19",
				"attachments": [],
				"tags": [
					{
						"tag": "Marriage"
					},
					{
						"tag": "communication"
					},
					{
						"tag": "counseling"
					},
					{
						"tag": "family"
					},
					{
						"tag": "relationship"
					},
					{
						"tag": "trust"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ojs.reformedjournals.co.za/stj/article/view/1743",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The cinematic hidden Christ â€“ His invisible divinity and his visible humanity",
				"creators": [
					{
						"firstName": "Martien E.",
						"lastName": "Brinkman",
						"creatorType": "author"
					}
				],
				"date": "2017/12/31",
				"DOI": "10.17570/stj.2017.v3n2.a13",
				"ISSN": "2413-9467",
				"abstractNote": "If we want to reflect upon the impact of the many â€˜hidden Christâ€™-images in modern films at a theologically responsible way, we need to incorporate that reflection into our doctrine of revelation. That will imply that we have to re-open the classical Gospel-Culture discussion. Especially in the United States we can recognize a lot of original approaches to this issue in Reformed circles (Wolterstorff, Dyrness, Begbie, Seidell, etc.). The main question to be put in this article will be: How can we develop criteria to assess the depiction of the divine in these films?",
				"issue": "2",
				"journalAbbreviation": "STJ",
				"language": "en",
				"libraryCatalog": "ojs.reformedjournals.co.za",
				"pages": "299-317",
				"publicationTitle": "Stellenbosch Theological Journal",
				"rights": "Copyright (c) 2017 Martien E Brinkman",
				"url": "https://ojs.reformedjournals.co.za/stj/article/view/1743",
				"volume": "3",
				"attachments": [],
				"tags": [
					{
						"tag": "Christology"
					},
					{
						"tag": "Hidden Christ"
					},
					{
						"tag": "Immanence"
					},
					{
						"tag": "Revelation"
					},
					{
						"tag": "Symbol"
					},
					{
						"tag": "Transcendence"
					},
					{
						"tag": "hidden Christ"
					},
					{
						"tag": "immanence"
					},
					{
						"tag": "revelation"
					},
					{
						"tag": "symbol"
					},
					{
						"tag": "transcendence"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sanisidoro.net/publicaciones/index.php/isidorianum/issue/view/11",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://journal.equinoxpub.com/JSRNC/article/view/19598",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sustaining Abundance: The Role of the Divine River in the Economy of Ancient Persia",
				"creators": [
					{
						"firstName": "Tobin Montgomery",
						"lastName": "Hartnell",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.1558/jsrnc.39772",
				"ISSN": "1749-4915",
				"abstractNote": "A comparison of archaeological survey and ethnography with the Zoroastrian textual corpus reveals the cultural and economic dimensions of an ancient water management system in northern Persia (southern Iran). The results highlight how humanity’s destructive impact on nature is ubiquitous, yet not all impacts are equivalent. The explanation is partly cultural, as Sasanian (r. 208–641 CE) notions of the Divine River promoted particular types of engagements with local rivers that respected their innate character. For believers, Zoroastrian water rituals promoted material abundance, just as ancient irrigation systems prioritized smaller barrages that allowed the river to mow. In contrast, modern dams severely restrict the water’s mow, which degrades the quality of the water. Even though ancient irrigation systems achieved a similar scale to modern ones, they were ultimately more sustainable because they respected the river as an important entity in its own right.",
				"issue": "4",
				"journalAbbreviation": "JSRNC",
				"language": "en",
				"libraryCatalog": "journal.equinoxpub.com",
				"pages": "450-479",
				"publicationTitle": "Journal for the Study of Religion, Nature and Culture",
				"shortTitle": "Sustaining Abundance",
				"url": "https://journal.equinoxpub.com/JSRNC/article/view/19598",
				"volume": "14",
				"attachments": [],
				"tags": [
					{
						"tag": "CB 482"
					},
					{
						"tag": "Zoroastrianism"
					},
					{
						"tag": "ancient Persia"
					},
					{
						"tag": "divine river"
					},
					{
						"tag": "political economy"
					},
					{
						"tag": "sustainability"
					},
					{
						"tag": "water rituals"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://verbumetecclesia.org.za/index.php/ve/issue/view/12",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://periodicos.uem.br/ojs/index.php/RbhrAnpuh/issue/view/1635",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://journal.equinoxpub.com/JSRNC/article/view/19606",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Dark Green Religion: A Decade Later",
				"creators": [
					{
						"firstName": "Bron",
						"lastName": "Taylor",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.1558/jsrnc.34630",
				"ISSN": "1749-4915",
				"abstractNote": "I wrote the following remections in the hope they will encourage further research and debate about the phenomena I explored in Dark Green Religion: Nature Spiritualty and the Planetary Future. These remections are adapted from the ‘Vorwort zur deutschen Neuausgabe: Dunkelgrüne Religion—Zehn Jahre danach’, with which I introduced the German edition.",
				"issue": "4",
				"journalAbbreviation": "JSRNC",
				"language": "en",
				"libraryCatalog": "journal.equinoxpub.com",
				"pages": "496-510",
				"publicationTitle": "Journal for the Study of Religion, Nature and Culture",
				"shortTitle": "Dark Green Religion",
				"url": "https://journal.equinoxpub.com/JSRNC/article/view/19606",
				"volume": "14",
				"attachments": [],
				"tags": [
					{
						"tag": "Avatar"
					},
					{
						"tag": "Dark Green Religion"
					},
					{
						"tag": "environmental history"
					},
					{
						"tag": "film"
					},
					{
						"tag": "nature spirituality"
					},
					{
						"tag": "religion and nature"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://jrfm.eu/index.php/ojs_jrfm/article/view/256",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Book Review. Christopher Ocker / Susanne Elm (eds.), Material Christianity: Western Religion and the Agency of Things",
				"creators": [
					{
						"firstName": "Daria",
						"lastName": "Pezzoli-Olgiati",
						"creatorType": "author"
					}
				],
				"date": "2021/05/10",
				"DOI": "10.25364/05.7:2021.1.11",
				"ISSN": "2617-3697",
				"issue": "1",
				"journalAbbreviation": "JRFM",
				"language": "en",
				"libraryCatalog": "jrfm.eu",
				"pages": "197–199",
				"publicationTitle": "Journal for Religion, Film and Media (JRFM)",
				"rights": "Copyright (c) 2021 Daria Pezzoli-Olgiati",
				"shortTitle": "Book Review. Christopher Ocker / Susanne Elm (eds.), Material Christianity",
				"url": "https://jrfm.eu/index.php/ojs_jrfm/article/view/256",
				"volume": "7",
				"attachments": [],
				"tags": [
					{
						"tag": "RezensionstagPica"
					},
					{
						"tag": "materiality and its impact"
					},
					{
						"tag": "religious  thinking"
					},
					{
						"tag": "religious identities"
					},
					{
						"tag": "religious practices"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://revistasfranciscanas.org/index.php/ArchivoIberoAmericano/issue/view/16",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://jeac.de/ojs/index.php/jeac/issue/view/16",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://aabner.org/ojs/index.php/beabs/article/view/781",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "AABNER Forum Peer Review System",
				"creators": [
					{
						"firstName": "Izaak Jozias de",
						"lastName": "Hulster",
						"creatorType": "author"
					},
					{
						"firstName": "Valérie",
						"lastName": "Nicolet",
						"creatorType": "author"
					},
					{
						"firstName": "Ronit",
						"lastName": "Nikolsky",
						"creatorType": "author"
					},
					{
						"firstName": "Jason M.",
						"lastName": "Silverman",
						"creatorType": "author"
					}
				],
				"date": "2021/06/18",
				"DOI": "10.35068/aabner.v1i1.781",
				"ISSN": "2748-6419",
				"abstractNote": "Die Chefredaktion von AABNER beschreibt die Schwächen und Probleme destraditionellen ‚Double-Blind-Peer-Review‘ und bietet eine innovative Lösung:den von uns weiterentwickelten ‚Forum-Peer-Review‘.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "aabner.org",
				"pages": "13-22",
				"publicationTitle": "Advances in Ancient, Biblical, and Near Eastern Research",
				"rights": "Copyright (c) 2021 Izaak J. de Hulster, Valérie Nicolet, Ronit Nikolsky, Jason M. Silverman",
				"url": "https://aabner.org/ojs/index.php/beabs/article/view/781",
				"volume": "1",
				"attachments": [],
				"tags": [
					{
						"tag": "Peer review"
					},
					{
						"tag": "academic publishing"
					},
					{
						"tag": "ethics"
					},
					{
						"tag": "forum review"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0003-0706-4480 | Izaak Jozias de Hulster | taken from website"
					},
					{
						"note": "orcid:0000-0001-9070-0585 | Valérie Nicolet | taken from website"
					},
					{
						"note": "orcid:0000-0002-3771-8062 | Ronit Nikolsky | taken from website"
					},
					{
						"note": "orcid:0000-0002-0240-9219 | Jason M. Silverman | taken from website"
					},
					{
						"note": "abs:The AABNER founding editors-in-chief describe some of the problems with traditional double-blind peer review and describe our solution for them, forum peerreview, which we have developed for use within AABNER."
					},
					{
						"note": "abs:L’équipe de rédaction en chef initiale d’AABNER décrit quelques problèmes liésau système traditionnel de la “double-blind peer review” et propose une solution, le système “forum peer review”, développé et mis en place pour la créationd’AABNER."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ote-journal.otwsa-otssa.org.za/index.php/journal/article/view/433",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Homosexuality and Liminality in Sodom: THE Quests for Home, Fun, and Justice (Gen 19:1-29)",
				"creators": [
					{
						"firstName": "Cephas",
						"lastName": "Tushima",
						"creatorType": "author"
					}
				],
				"date": "2021/05/30",
				"DOI": "10.17159/2312–3621/2021/v34n1a6",
				"ISSN": "2312-3621",
				"abstractNote": "This essay explores the first segment of the Lot sub-narrative of the Abraham cycle (Gen 11:27–25:10). The study adopts a narrative close reading approach and canonical theological hermeneutical framework in its reading strategies (with the canon’s reception history undergirding its plausibility structures), aiming ultimately at unfolding the world of possibilities of being-in-the-world in the text, particularly from an ethical standpoint. The study shows Lot, enmeshed in his sense of marginality from YHWH’s repeated covenantal promises of progeny to Abraham, ditch time-tested tradition and embark on a quest for freedom and a home of his own, consequently, assuming significance and security in Sodom (where he sat on the city council at the gate). His initial assumed marginality in Abraham’s home attains reality in Sodom, where the Sodomites desirous of ‘having fun’ with Lot’s angelic guests (who were on a search for justice) reprimands Lot, a mere immigrant—in their view—for his audacity to rebuke them. The visitation of YHWH’s justice on Sodom renders the self-serving Lot homeless, driving him to ultimate marginality, as he inhabits the liminal space of an incestuous cave dweller. A theologico-ethical appropriation of the narrative draws attention, first, to the temptation often to be so caring to outsiders and yet be so unkind to those closest to us (like Lot). Second, tradition is a stabilising force in society and jettisoning it unnecessarily creates cascading disequilibria. Third, alienation from God is the grand source of all liminality. Fourth, inordinate desires lead to choices that bring about a breakdown in the social order. Fifth, like Lot, we need to catch heaven’s heartbeat for the oppressed and become voices for their justice in our time.\nhttps://doi.org/10.17159/2312–3621/2021/v34n1a6",
				"issue": "1",
				"journalAbbreviation": "OTE",
				"language": "en",
				"libraryCatalog": "ote-journal.otwsa-otssa.org.za",
				"pages": "68-88",
				"publicationTitle": "Old Testament Essays",
				"rights": "Copyright (c) 2021 Cephas Tushima",
				"shortTitle": "Homosexuality and Liminality in Sodom",
				"url": "https://ote-journal.otwsa-otssa.org.za/index.php/journal/article/view/433",
				"volume": "34",
				"attachments": [],
				"tags": [
					{
						"tag": "Abraham"
					},
					{
						"tag": "Biblical Ethics"
					},
					{
						"tag": "Genesis"
					},
					{
						"tag": "Homosexuality"
					},
					{
						"tag": "Immigrants"
					},
					{
						"tag": "Intertextuality"
					},
					{
						"tag": "Justice"
					},
					{
						"tag": "Lot"
					},
					{
						"tag": "Narrative Criticism"
					},
					{
						"tag": "Sodom"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0003-0923-1350 | Cephas Tushima | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://jebs.eu/ojs/index.php/jebs/issue/view/75",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://limina-graz.eu/index.php/limina/article/view/103",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Antimodernismus als Autoritarismus? Zum Mehrwert sozialpsychologischer Analysekategorien im Kontext theologischer Fundamentalismusforschung: Zum Mehrwert sozialpsychologischer Analysekategorien im Kontext theologischer Fundamentalismusforschung",
				"creators": [
					{
						"firstName": "Sonja Angelika",
						"lastName": "Strube",
						"creatorType": "author"
					}
				],
				"date": "2021/05/12",
				"ISSN": "2617-1953",
				"abstractNote": "Fundamentalistische religiöse Stile, im katholischen Glaubensspektrum durch vorkonziliar-antimodernistische und traditionalismusaffine Frömmigkeitsformen geprägt, gehen auffallend oft mit expliziter Gruppenbezogener Menschenfeindlichkeit und sogar extrem rechten politischen Einstellungen einher. Diese Beobachtung legt nicht nur nahe, nach möglichen gemeinsamen psychischen Prädispositionen für politische wie religiöse autoritäre Einstellungen zu fragen, sondern ermutigt auch die Integration sozialpsychologischer Analysekategorien in die theologische Fundamentalismusforschung.\nDer vorliegende Beitrag stellt zunächst zentrale (schwerpunktmäßig sozialpsychologische) Forschungen zur Ambivalenz von Religiosität und zu Zusammenhängen zwischen religiösen Stilen und Vorurteilen sowie Autoritarismus vor. In einem zweiten Schritt wendet er deren sozialpsychologische Kategorien auf die Analyse rechtskatholischer Proteste gegen die Einbeziehung indigener Figuren in die Eröffnungszeremonie der Amazonassynode 2019 an. Dies ermöglicht die Offenlegung autoritärer und ethnozentrischer Haltungen, die durch religiösen Exklusivismus, strafende Gottesbilder sowie entsprechende eschatologische Vorstellungen gerechtfertigt werden. Aus sozialpsychologischer Perspektive lässt sich der innerkirchliche Konflikt um die Reformen des Zweiten Vatikanischen Konzils als ein ,Clash‘ unterschiedlicher – reiferer bzw. wenig komplexer – religiöser Stile beschreiben.",
				"issue": "1",
				"journalAbbreviation": "LIMINA",
				"language": "de",
				"libraryCatalog": "limina-graz.eu",
				"pages": "16-40",
				"publicationTitle": "LIMINA - Grazer theologische Perspektiven",
				"rights": "Copyright (c) 2021 Sonja Angelika Strube",
				"shortTitle": "Antimodernismus als Autoritarismus?",
				"url": "https://limina-graz.eu/index.php/limina/article/view/103",
				"volume": "4",
				"attachments": [],
				"tags": [
					{
						"tag": "(katholischer) Fundamentalismus"
					},
					{
						"tag": "Antimodernismus"
					},
					{
						"tag": "Autoritarismus / autoritäre Persönlichkeit"
					},
					{
						"tag": "Gruppenbezogene Menschenfeindlichkeit"
					},
					{
						"tag": "Religion und Vorurteil"
					},
					{
						"tag": "Traditionalismus"
					},
					{
						"tag": "Zweites Vatikanisches Konzil"
					},
					{
						"tag": "rechtsextreme Einstellungen"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ojs3.uni-tuebingen.de/ojs/index.php/beabs/article/view/781",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "AABNER Forum Peer Review System",
				"creators": [
					{
						"firstName": "Izaak Jozias de",
						"lastName": "Hulster",
						"creatorType": "author"
					},
					{
						"firstName": "Valérie",
						"lastName": "Nicolet",
						"creatorType": "author"
					},
					{
						"firstName": "Ronit",
						"lastName": "Nikolsky",
						"creatorType": "author"
					},
					{
						"firstName": "Jason M.",
						"lastName": "Silverman",
						"creatorType": "author"
					}
				],
				"date": "2021/06/18",
				"DOI": "10.35068/aabner.v1i1.781",
				"ISSN": "2748-6419",
				"abstractNote": "Die Chefredaktion von AABNER beschreibt die Schwächen und Probleme destraditionellen ‚Double-Blind-Peer-Review‘ und bietet eine innovative Lösung:den von uns weiterentwickelten ‚Forum-Peer-Review‘.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "ojs3.uni-tuebingen.de",
				"pages": "13-22",
				"publicationTitle": "Advances in Ancient, Biblical, and Near Eastern Research",
				"rights": "Copyright (c) 2021 Izaak J. de Hulster, Valérie Nicolet, Ronit Nikolsky, Jason M. Silverman",
				"url": "https://ojs3.uni-tuebingen.de/ojs/index.php/beabs/article/view/781",
				"volume": "1",
				"attachments": [],
				"tags": [
					{
						"tag": "Peer review"
					},
					{
						"tag": "academic publishing"
					},
					{
						"tag": "ethics"
					},
					{
						"tag": "forum review"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0003-0706-4480 | Izaak Jozias de Hulster | taken from website"
					},
					{
						"note": "orcid:0000-0001-9070-0585 | Valérie Nicolet | taken from website"
					},
					{
						"note": "orcid:0000-0002-3771-8062 | Ronit Nikolsky | taken from website"
					},
					{
						"note": "orcid:0000-0002-0240-9219 | Jason M. Silverman | taken from website"
					},
					{
						"note": "abs:The AABNER founding editors-in-chief describe some of the problems with traditional double-blind peer review and describe our solution for them, forum peerreview, which we have developed for use within AABNER."
					},
					{
						"note": "abs:L’équipe de rédaction en chef initiale d’AABNER décrit quelques problèmes liésau système traditionnel de la “double-blind peer review” et propose une solution, le système “forum peer review”, développé et mis en place pour la créationd’AABNER."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ojs3.uni-tuebingen.de/ojs/index.php/beabs/article/view/787",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Wings, Weapons, and the Horned Tiara: Iconographic Representation of the Deity of the Mediterranean Sea in the Bronze Age",
				"creators": [
					{
						"firstName": "Joanna",
						"lastName": "Töyräänvuori",
						"creatorType": "author"
					}
				],
				"date": "2021/06/29",
				"DOI": "10.35068/aabner.v1i1.787",
				"ISSN": "2748-6419",
				"abstractNote": "Dieser Aufsatz bespricht die Ikonographie des vergöttlichten Mittelmeersin der syrischen Glyptik der mittleren und späten Bronzezeit im Lichte dertextlichen Zeugnisse aus der Stadt Ugarit (Ras Shamra). Die Arbeit vonPaolo Matthiae zur Erkennung des visuellen Vokabulars der Darstellung derGottheit weiterführend, argumentiert der Aufsatz, dass der Grund für dieDarstellung des Meeresgottes als geflügelte Gottheit in der antiken semitischenVorstellung lag, wo er ein Rolle als Vermittler zwischen dem himmlischen und dem irdischen Ozean hat. Der Artikel liefert auch eine Heuristik fürdie Unterscheidung von Darstellungen des geflügelten Meeresgottes von denDarstellungen der geflügelten Göttin die zusammen mit Wasservögeln undFischen abgebildet wird.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "ojs3.uni-tuebingen.de",
				"pages": "89-128",
				"publicationTitle": "Advances in Ancient, Biblical, and Near Eastern Research",
				"rights": "Copyright (c) 2021 Joanna Töyräänvuori",
				"shortTitle": "Wings, Weapons, and the Horned Tiara",
				"url": "https://ojs3.uni-tuebingen.de/ojs/index.php/beabs/article/view/787",
				"volume": "1",
				"attachments": [],
				"tags": [
					{
						"tag": "Bronze Age"
					},
					{
						"tag": "Mediterranean Sea"
					},
					{
						"tag": "North West Semitic"
					},
					{
						"tag": "Syrian glyptic"
					},
					{
						"tag": "Ugarit"
					},
					{
						"tag": "cylinder seals"
					},
					{
						"tag": "iconography"
					},
					{
						"tag": "sea god"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0003-4932-8755 | Joanna Töyräänvuori | taken from website"
					},
					{
						"note": "abs:This article discusses the iconography of the deified Mediterranean Sea in Syrian glyptic from the Middle and Late Bronze Ages in light of textual evidence from the city of Ugarit (Ras Shamra). Building on the work of Paolo Matthiae in recognizing the visual vocabulary of the representation of the deity, the article argues that the reason for the depiction of the sea god as a winged deity was due to its role as a mediator between the celestial and terrestial oceans in ancient semitic conception. The article also provides a heuristic for separating depictions of the winged sea god from the representations of the winged goddess in the presence of water birds and fish in its visual vocabulary."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://open-journals.uni-tuebingen.de/ojs/index.php/eug/article/view/1-2021-rez-1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Schattenseiten der Sozialen Marktwirtschaft. Thomas Biebricher und Ralf Ptak wiegen das Erbe des deutschen Neoliberalismus",
				"creators": [
					{
						"firstName": "Dieter",
						"lastName": "Plehwe",
						"creatorType": "author"
					}
				],
				"date": "2021/08/09",
				"DOI": "10.18156/eug-1-2021-859",
				"ISSN": "2365-6565",
				"abstractNote": "Rezension von:Thomas Biebricher / Ralf Ptak (2020): Soziale Marktwirtschaft und Ordoliberalismus zur Einführung, Hamburg: Junius. 250 S., ISBN 978-3-96060-312-2, EUR 15.90.",
				"issue": "1",
				"journalAbbreviation": "EuG",
				"language": "de",
				"libraryCatalog": "open-journals.uni-tuebingen.de",
				"publicationTitle": "Ethik und Gesellschaft",
				"rights": "Copyright (c) 2021 Ethik und Gesellschaft",
				"url": "https://ethik-und-gesellschaft.de/ojs/index.php/eug/article/view/1-2021-rez-1",
				"attachments": [],
				"tags": [
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
		"url": "https://revistaseletronicas.pucrs.br/index.php/teo/article/view/36941",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A identidade da educação católica no atual contexto",
				"creators": [
					{
						"firstName": "Leomar Antônio",
						"lastName": "Brustolin",
						"creatorType": "author"
					},
					{
						"firstName": "Marcia",
						"lastName": "Koffermann",
						"creatorType": "author"
					}
				],
				"date": "2021/08/23",
				"DOI": "10.15448/0103-314X.2021.1.36941",
				"ISSN": "1980-6736",
				"abstractNote": "This article deals with the identity of Catholic education in the face of current cultural plurality. The article presents the Catholic conception of the world from the writings of several authors, especially Romano Guardini. The text draws a parallel between the Catholic conception of the world and the current reality of Catholic education, marked by the competitiveness in the educational market and the diversity of proposals that are sometimes distant from its commitment to catholicity. The text addresses the issue of Catholic education from an anthropological perspective centered on the person and presents some basic questions that can serve to deepen the essential mission of Catholic education as a differential in the context of education. The reflection points to the need for Catholic educational environments to be transforming agents of society, based on a Catholic conception of the world that dialogues with reality and that enables the active insertion of the Christian educator in the face of the different problems that today’s society presents., , Este artigo trata da identidade da educação católica diante da pluralidade cultural atual. O artigo traz presente a concepção católica de mundo a partir dos escritos de diversos autores, especialmente Romano Guardini. O texto faz um paralelo entre a concepção católica de mundo e a atual realidade da educação católica, marcada pela competitividade no mercado educacional e pela diversidade de propostas que, por vezes, se distanciam de seu compromisso de catolicidade. O texto aborda a problemática da educação católica a partir de uma visão antropológica centrada na pessoa e apresenta alguns questionamentos básicos que podem servir para um aprofundamento da missão essencial da educação católica enquanto diferencial no contexto da educação. A reflexão aponta para a necessidade de que os ambientes católicos de educação sejam agentes transformadores da sociedade, a partir de uma concepção católica de mundo que dialoga com a realidade e que possibilita a inserção ativa do educador cristão frente às diferentes problemáticas que a sociedade atual apresenta.",
				"issue": "1",
				"journalAbbreviation": "Teocomunicação (Online)",
				"language": "pt",
				"libraryCatalog": "revistaseletronicas.pucrs.br",
				"pages": "e36941",
				"publicationTitle": "Teocomunicação",
				"url": "https://revistaseletronicas.pucrs.br/index.php/teo/article/view/36941",
				"volume": "51",
				"attachments": [],
				"tags": [
					{
						"tag": "Catolicismo"
					},
					{
						"tag": "Cosmovisão"
					},
					{
						"tag": "Educação Católica"
					},
					{
						"tag": "Formação Integral"
					},
					{
						"tag": "Romano Guardini"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0002-0066-4267 | Leomar Antônio Brustolin | taken from website"
					},
					{
						"note": "orcid:0000-0003-1689-1509 | Marcia Koffermann | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://revistas.ucm.es/index.php/ILUR/issue/view/3773",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.journals.us.edu.pl/index.php/EL/article/view/13012",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“Accompanying Migrants” as a Touchstone of the Realisation of the Synodal Church Idea. A Canonist’s Remarks",
				"creators": [
					{
						"firstName": "Andrzej",
						"lastName": "Pastwa",
						"creatorType": "author"
					}
				],
				"date": "2021/12/31",
				"DOI": "10.31261/EaL.2021.09.2.01",
				"ISSN": "2391-4327",
				"abstractNote": "“Synodality is a style, it is walking together, and it is what the Lord expects of the Church in the third millennium” (Francis). The specific motto and wording of this study in the quoted “programme” thought of Pope Francis, articulated in the Address to Members of the International Theological Commission (2019). The Pope expresses appreciation for the extensive work of the Commission crowned with the “theological clarification” of the mentioned idea, and above all by demonstrating the importance in the perception of the mission of the Church today. If, in the opinion of the Holy Father, factual and competent expert argumentation, step by step, reveals the truth that “a synodal Church is a Church of participation and co-responsibility,” such a determination cannot remain without impact on the praxis of undertaking the most serious pastoral challenges of the present time — on various levels of realization: local, regional, and universal, including ecumenical commitment. This applies in its entirety to the creation of strategies and specific actions of the Church towards the growing phenomenon of human mobility, especially in its forms that manifest themselves as dramatic and devastating to families and individuals. What we mean here is the Church’s multi-track postulate — or more precisely: communion, synodal — efficiency (with its determinants: dynamics, efficiency, effectiveness), for which in 2016 Francis coined the term: “accompanying migrants”. Consequently, in recent years there have been a number of normative and operational activities of the present successor of St. Peter, which in our time — rightly called: “the era of migration” (Francis) — set a new trend of clothing/embellishing the aforementioned critical area of salus animarum with synodal accents. As it is showed in the study, a canonist, with the horizon of the principle of ius sequitur vitam before his eyes, cannot remain passive towards the pressing challenges delineated here. Indeed, within the orbit of the study of canon law a weighty question appears — what conclusions of a canonical nature stem from the “millennium” project of the realization of the Synodal Church Idea.",
				"issue": "2",
				"journalAbbreviation": "1",
				"language": "pl",
				"libraryCatalog": "www.journals.us.edu.pl",
				"pages": "7-40",
				"publicationTitle": "Ecumeny and Law",
				"rights": "Copyright (c)",
				"url": "https://www.journals.us.edu.pl/index.php/EL/article/view/13012",
				"volume": "9",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bulletin-religious.kaznu.kz/index.php/relig/issue/view/40",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://zfbeg.org/ojs/index.php/cjbk/article/view/631",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Vita: Elie Wiesel.",
				"creators": [
					{
						"firstName": "Forschungsstelle Elie Wiesel Universität",
						"lastName": "Tübingen",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"DOI": "10.25786/cjbk.v0i01-02.631",
				"ISSN": "2513-1389",
				"abstractNote": "30. September 1928Geboren in Sighet (Siebenbürgen, heute Rumänien)als Sohn von Schlomo Wiesel (Kaufmann) undSarah Wiesel, geborene Feig. Wiesel wächst ineiner chassidischen Familie auf.1934 bis 1944Elie Wiesel besucht den Cheder, die jüdische Religions-›Grundschule‹, dann die Jeschiwa, dieweiterführende Talmud-Schule. Daneben studierter bereits die jüdische Mystik und die Lehren derchassidischen Meister.Frühjahr 1944Nach der Einrichtung eines Ghettos in Sighet wirddie Familie Wiesel mit der gesamten jüdischenGemeinde nach Auschwitz deportiert. Die Mutterund die jüngere Schwester Tsiporah werden ermordet.Der Vater stirbt kurz vor Kriegsende inBuchenwald, wohin er und Elie Anfang 1945transportiert werden.11. April 1945Befreiung des Lagers Buchenwald. Elie Wieselwird vom Kinderhilfswerk OSE nach Frankreichgebracht. In Paris trifft er seine beiden älterenSchwestern wieder.1948 bis 1951Studium der Philosophie, der französischen Literaturund der Psychologie an der Sorbonne, Paris.Beginn der Tätigkeit als Journalist für israelischeZeitungen und Zeitschriften und als Berichterstatterder UNO.1956Veröffentlichung von …un di Welt hot geschwign.Er kommt in die Vereinigten Staatenund wird 1963 amerikanischer Staatsbürger.1958Die gekürzte und ins Französische übersetzte Versionvon …un di Welt hot geschwign erscheintals La Nuit in Paris.1960er JahreBeginn der umfangreichen schriftstellerischen Tätigkeitenund des Kampfes für Menschenrechte inaller Welt. Erste Ehrendoktorwürden an amerikanischenUniversitäten. Zahlreiche Aufenthalte inIsrael.1969Heirat mit Marion E. Rose, selbst Überlebendeder Shoah und Übersetzerin vieler Bücher ElieWiesels.1972Geburt des Sohnes Schlomo Elischa. Professur ander City University of New York, Department ofJewish Studies.1976 bis 2011Professur an der Boston University (Professor inthe Humanities, Department of Religion, Literatureand Philosophy).Das Gesamtwerk entsteht in vier großen Werkteilen:Autobiografien, Romane, biblisch-talmudisch-chassidische Schriften, Essaysammlungen.1986Verleihung des Friedensnobelpreises. Das Komiteebegründet die Verleihung mit den Worten:»Elie Wiesel ist einer der wichtigsten Führer undWegweiser unserer Zeit. Seine Worte verkündendie Botschaft des Friedens, der Versöhnung undder Menschenwürde.«2000Rede vor dem Deutschen Bundestag.2009Rede in der Gedenkstätte Buchenwald anlässlichdes gemeinsamen Besuchs Angela Merkels undBarack Obamas.2. Juli 2016Elie Wiesel stirbt in New York.",
				"issue": "1-2",
				"journalAbbreviation": "ZfBeg",
				"language": "de",
				"libraryCatalog": "zfbeg.org",
				"pages": "6",
				"publicationTitle": "Zeitschrift für christlich-jüdische Begegnung im Kontext",
				"rights": "Copyright (c) 2021 Zeitschrift für christlich-jüdische Begegnung im Kontext",
				"shortTitle": "Vita",
				"url": "https://zfbeg.org/ojs/index.php/cjbk/article/view/631",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ztp.jesuiten.org/index.php/ZTP/issue/view/319",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://missionalia.journals.ac.za/pub/article/view/358",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“Just City-making” in Cape Town: Liberating Theological Education",
				"creators": [
					{
						"firstName": "Selena D.",
						"lastName": "Headley",
						"creatorType": "author"
					}
				],
				"date": "2021/12/30",
				"DOI": "10.7832/49-0-358",
				"ISSN": "2312-878X",
				"abstractNote": "Aspirational terms such as world-class, resilient, climate-friendly and a just city stand in contrast to adverse terms such unequal, divided, colonial, violent and segregated to describe the present and future state of the City of Cape Town. How do institutions offering tertiary qualifications in theology engage with the competing narratives of the city in the preparation of faith-based practitioners? The aim of this article is to explore the current landscape of theological education, offered in higher education institutions in Cape Town, in terms of an urban focus. The article will reflect how curricula, pedagogies and epistemologies engage the complexities of the urban context. The connection between theological education and ministry formation of faith-based practitioners will be explored in light of Cape Town’s urban futures.",
				"language": "en",
				"libraryCatalog": "missionalia.journals.ac.za",
				"publicationTitle": "Missionalia: Southern African Journal of Missiology",
				"rights": "Copyright (c) 2021 Missionalia: Southern African Journal of Missiology",
				"shortTitle": "“Just City-making” in Cape Town",
				"url": "https://missionalia.journals.ac.za/pub/article/view/358",
				"volume": "49",
				"attachments": [],
				"tags": [
					{
						"tag": "Cape Town"
					},
					{
						"tag": "justice"
					},
					{
						"tag": "pedagogy"
					},
					{
						"tag": "theological education"
					},
					{
						"tag": "theological formation"
					},
					{
						"tag": "urban futures"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0001-8844-0278 | Selena D. Headley | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bildungsforschung.org/ojs/index.php/beabs/issue/view/v01i02",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://revistas.unav.edu/index.php/anuario-de-historia-iglesia/article/view/42868",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Congreso internacional «Historia del Opus Dei (1939-1962)» (Madrid, 16-17 junio de 2021)",
				"creators": [
					{
						"firstName": "Fernando",
						"lastName": "Crovetto",
						"creatorType": "author"
					}
				],
				"date": "2022/04/22",
				"DOI": "10.15581/007.31.42868",
				"ISSN": "2174-0887",
				"abstractNote": "&nbsp;\n&nbsp;",
				"journalAbbreviation": "1",
				"language": "es",
				"libraryCatalog": "revistas.unav.edu",
				"pages": "532",
				"publicationTitle": "Anuario de Historia de la Iglesia",
				"rights": "Derechos de autor",
				"url": "https://revistas.unav.edu/index.php/anuario-de-historia-iglesia/article/view/42868",
				"volume": "31",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "orcid:0000-0002-9751-095X | Fernando Crovetto | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ztp.jesuiten.org/index.php/ZTP/article/view/3820",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Wolfgang Beck / Ilona Nord / Joachim Valentin (Hg.), Theologie und Digitalität. Ein Kompendium",
				"creators": [
					{
						"firstName": "Franca",
						"lastName": "Spies",
						"creatorType": "author"
					}
				],
				"date": "2021/08/28",
				"DOI": "10.35070/ztp.v143i3.3820",
				"ISSN": "2709-8435",
				"issue": "3",
				"journalAbbreviation": "ZTP",
				"language": "de",
				"libraryCatalog": "ztp.jesuiten.org",
				"pages": "495-497",
				"publicationTitle": "Zeitschrift für Theologie und Philosophie",
				"rights": "Copyright (c) 2021 Zeitschrift für Theologie und Philosophie",
				"url": "https://ztp.jesuiten.org/ZTP/article/view/3820",
				"volume": "143",
				"attachments": [],
				"tags": [
					{
						"tag": "Anthropologie"
					},
					{
						"tag": "Digitalisierung"
					},
					{
						"tag": "Digitalität"
					},
					{
						"tag": "Ethik"
					},
					{
						"tag": "Gott"
					},
					{
						"tag": "Medien"
					},
					{
						"tag": "RezensionstagPica"
					},
					{
						"tag": "Theologie"
					}
				],
				"notes": [
					{
						"note": "orcid:null | Franca Spies | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cauriensia.es/index.php/cauriensia/article/view/477",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Melinda L. DENTON, Richard FLORY. Back pocket God: Religion and spirituality in the lives of emerging adults",
				"creators": [
					{
						"firstName": "José Pereira",
						"lastName": "Coutinho",
						"creatorType": "author"
					}
				],
				"date": "2021/12/08",
				"ISSN": "2340-4256",
				"journalAbbreviation": "RevCau",
				"language": "en",
				"libraryCatalog": "cauriensia.es",
				"pages": "682-685",
				"publicationTitle": "Cauriensia. Revista anual de Ciencias Eclesiásticas",
				"rights": "Derechos de autor 2021",
				"shortTitle": "Melinda L. DENTON, Richard FLORY. Back pocket God",
				"url": "https://cauriensia.es/index.php/cauriensia/article/view/477",
				"volume": "16",
				"attachments": [],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0002-2733-3476 | José Pereira Coutinho | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://limina-graz.eu/index.php/limina/article/view/141",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“It Was Ugly and Shriveled, With One End Nibbled Off”: The Knackwurst as a Metonymy in Lore Segal’s Story “Wir aßen stumm. Auf dem Kindertransport”: The Knackwurst as a Metonymy in Lore Segal’s Story “Wir aßen stumm. Auf dem Kindertransport”",
				"creators": [
					{
						"firstName": "Eva-Maria",
						"lastName": "Trinkaus",
						"creatorType": "author"
					}
				],
				"date": "2022/11/11",
				"ISSN": "2617-1953",
				"abstractNote": "„Wir aßen stumm. Auf dem Kindertransport“ ist eine Kurzgeschichte der amerikanisch-österreichischen Autorin Lore Segal, die von ihrer Flucht vor den Nazis und der Trennung von ihren jüdischen Eltern in Österreich auf einer unfreiwilligen und ungewissen Reise an einen sicheren Ort erzählt, begleitet von anderen Kindern und einer Tüte Süßigkeiten. Am Tag ihrer Abreise aus dem österreichischen Ort Fischamend, wo sie als jüdisches Kind vor den Nazis flieht, bittet die junge Lore ihre Mutter um eine Knackwurst - eine typisch österreichische Wurstsorte, die als Proviant für ihre „Reise“ dienen soll, in Segals Erzählung aber viel mehr als nur zur Mahlzeit wird. In einem bereits übereilten und gefährlichen Versuch, den letzten Wunsch ihrer Tochter vor der Abreise zu erfüllen, gibt Lores Mutter nach und kauft ihr eine Wurst als Mahlzeit, die sie im Zug satt machen würde. Die Wurst erfüllt nicht nur den Zweck der Ernährung, sondern eröffnet schließlich einen Raum innerhalb der Erzählung, der es Segal als Erzählerin erlaubt, die Trauer der jungen Lore und die Angst vor der Ungewissheit auszudrücken. Anstatt die Wurst einfach zu essen, wie es ihre Mutter vorgesehen hatte, hebt Lore das Essen für später auf. Indem sie die Wurst aufbewahrt, wird sie zu einem Ersatz für ihre Gefühle. Je weiter sich die junge Lore von zu Hause entfernt, desto mehr verfällt die Wurst, beginnt zu stinken und wird schließlich ungenießbar. Von der Unappetitlichkeit bis zur langsamen Fäulnis nimmt die Wurst als Ersatz für die Gefühle der jungen Lore einen wesentlichen Teil der Erzählung ein. Gleichzeitig wird die Wurst zum Indikator dafür, wie weit sich die junge Lore auf ihrer Reise bereits von zu Hause entfernt hat – räumlich und emotional. Abgesehen davon, dass die Knackwurst kein koscheres Essen ist, ist sie auch nicht das, was sie bei der Abreise wirklich will – sie verschafft ihr nur mehr Zeit mit ihrer Familie. Je mehr sie jedoch auf ihrer Reise zu stinken beginnt, desto weiter entfernt sich Lore von ihrem Zuhause in Fischamend, und desto schwieriger wird es, die stinkende Wurst vor allen anderen zu verstecken, bis sie schließlich gefunden wird, was das Mädchen in Verlegenheit bringt und ihr schließlich erlaubt, ihre Traurigkeit offen und vor allen anderen auszudrücken. Segals Geschichte ist ein Beispiel dafür, was passiert, wenn Essen nicht mehr nur ein einfaches Produkt oder eine grundlegende Notwendigkeit ist, sondern über Ernährung hinausgeht. In Segals Geschichte lässt das Lebensmittel zweierlei Analysen zu. Einerseits eröffnet es einen Raum innerhalb der Erzählung, der die Distanz der Erfahrungen darstellt. Andererseits erlaubt die Wurst und ihr Verfall Segal, die Knackwurst als erzählerisches Mittel zu nutzen, um die Erfahrung der Protagonistin greifbarer zu machen und narrative Elemente für eine historische Darstellung zu verwenden, ganz im Sinne des Schreibens von „Geschichte“ durch „Geschichten“ (vgl. Segal 2019a), wie sie es für sich als Schriftstellerin beansprucht.",
				"issue": "2",
				"journalAbbreviation": "LIMINA",
				"language": "en",
				"libraryCatalog": "limina-graz.eu",
				"pages": "95-111",
				"publicationTitle": "LIMINA - Grazer theologische Perspektiven",
				"rights": "Copyright (c) 2022",
				"shortTitle": "“It Was Ugly and Shriveled, With One End Nibbled Off”",
				"url": "https://limina-graz.eu/index.php/limina/article/view/141",
				"volume": "5",
				"attachments": [],
				"tags": [
					{
						"tag": "Essen"
					},
					{
						"tag": "Essen als Metonymie"
					},
					{
						"tag": "Essen und Holocaust"
					},
					{
						"tag": "Kindertransport"
					},
					{
						"tag": "Metonymie"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0002-5890-3080 | Eva-Maria Trinkaus | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cauriensia.es/index.php/cauriensia/article/view/477",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Melinda L. DENTON, Richard FLORY. Back pocket God: Religion and spirituality in the lives of emerging adults",
				"creators": [
					{
						"firstName": "José Pereira",
						"lastName": "Coutinho",
						"creatorType": "author"
					}
				],
				"date": "2021/12/08",
				"ISSN": "2340-4256",
				"journalAbbreviation": "RevCau",
				"language": "en",
				"libraryCatalog": "cauriensia.es",
				"pages": "682-685",
				"publicationTitle": "Cauriensia. Revista anual de Ciencias Eclesiásticas",
				"rights": "Derechos de autor 2021",
				"shortTitle": "Melinda L. DENTON, Richard FLORY. Back pocket God",
				"url": "https://cauriensia.es/index.php/cauriensia/article/view/477",
				"volume": "16",
				"attachments": [],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0002-2733-3476 | José Pereira Coutinho | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://archivodominicano.dominicos.org/ojs/article/view/conventualidad-dominica-archivos-merida-badajoz",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Principales líneas de investigación sobre conventualidad dominica según la documentación custodiada en los archivos eclesiásticos de Mérida-Badajoz (siglos XVI-XIX)",
				"creators": [
					{
						"firstName": "María Guadalupe PÉREZ",
						"lastName": "ORTIZ",
						"creatorType": "author"
					}
				],
				"date": "2022/12/20",
				"ISSN": "2952-2196",
				"abstractNote": "The ecclesiastical archives of Mérida-Badajoz guard a great variety of documents on Dominican conventuality from the 16th to the 19th centuries. In the work that we present below, we intend to present said documentation from a perspective that goes beyond the pure analysis of the document and its subject matter. What we want to expose are the fundamental contents that these documents cover to show possible lines of research that, based on them, can give rise to other investigations.",
				"journalAbbreviation": "AD",
				"language": "es",
				"libraryCatalog": "archivodominicano.dominicos.org",
				"pages": "17-50",
				"publicationTitle": "Archivo Dominicano",
				"rights": "Derechos de autor 2022 María Guadalupe PÉREZ ORTIZ",
				"url": "https://archivodominicano.dominicos.org/ojs/article/view/conventualidad-dominica-archivos-merida-badajoz",
				"volume": "43",
				"attachments": [],
				"tags": [
					{
						"tag": "Dominicans"
					},
					{
						"tag": "archivos eclesiásticos"
					},
					{
						"tag": "conventos"
					},
					{
						"tag": "convents"
					},
					{
						"tag": "dominicos"
					},
					{
						"tag": "ecclesiastical archives"
					},
					{
						"tag": "lines of research"
					},
					{
						"tag": "líneas de investigación"
					}
				],
				"notes": [
					{
						"note": "abs:Los archivos eclesiásticos de Mérida-Badajoz custodian gran variedad de documentos sobre conventualidad dominica de entre los siglos XVI al XIX. En el trabajo que presentamos a continuación pretendemos dar a conocer dicha documentación desde una vertiente que va más allá del puro análisis del documento de archivo y su temática. Lo que queremos exponer son los contenidos fundamentales que abarcan dichos documentos para mostrar posibles líneas de investigación que partiendo de ellos puedan dar lugar a otras investigaciones futuras."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://revistas.unav.edu/index.php/anuario-de-historia-iglesia/article/view/44463",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Historiografía sobre el Concilio de Nicea: el Concilio de Nicea a la luz de sus historiadores",
				"creators": [
					{
						"firstName": "Almudena",
						"lastName": "Alba-López",
						"creatorType": "author"
					}
				],
				"date": "2023/03/30",
				"DOI": "10.15581/007.32.003",
				"ISSN": "2174-0887",
				"abstractNote": "The importance and significance of the first ecumenical council has been a subject of reflection ever since its own time period. It was not long before Eusebius of Caesarea and the various Church historians of the 4th and 5th centuries commented on the development of the synod, inseparably linking the consubstantiality of the Father and Son formulated in Nicaea to Christian orthodoxy and, to a certain extent, conditioning subsequent thought regarding the council and its historical and theological influence. In this contribution we will approach the development of historiographic and theological thought concerning the council of Nicaea by its immediate contemporaries, as well as its influence on the last few decades, focusing on the study of its nature and significance.",
				"journalAbbreviation": "1",
				"language": "es",
				"libraryCatalog": "revistas.unav.edu",
				"pages": "19-48",
				"publicationTitle": "Anuario de Historia de la Iglesia",
				"rights": "Derechos de autor 2023 Anuario de Historia de la Iglesia",
				"shortTitle": "Historiografía sobre el Concilio de Nicea",
				"url": "https://revistas.unav.edu/index.php/anuario-de-historia-iglesia/article/view/44463",
				"volume": "32",
				"attachments": [],
				"tags": [
					{
						"tag": "Concilio Vaticano II"
					},
					{
						"tag": "Concilio de Nicea (325)"
					},
					{
						"tag": "Concilios Ecuménicos"
					},
					{
						"tag": "Escolástico"
					},
					{
						"tag": "Eusebio de Cesarea"
					},
					{
						"tag": "Hermias Sozomeno"
					},
					{
						"tag": "Historia de la Iglesia en la Antigüedad"
					},
					{
						"tag": "Historia de los Concilios"
					},
					{
						"tag": "Historiografía"
					},
					{
						"tag": "Sócrates"
					},
					{
						"tag": "Teodoreto de Ciro"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0002-6406-1262 | Almudena Alba-López | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cauriensia.es/index.php/cauriensia/article/view/mis4",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Justicia como imparcialidad o reconocer el bien del otro",
				"creators": [
					{
						"firstName": "María Teresa Cid",
						"lastName": "Vázquez",
						"creatorType": "author"
					}
				],
				"date": "2022/12/01",
				"DOI": "10.17398/2340-4256.17.63",
				"ISSN": "2340-4256",
				"abstractNote": "The current resonance that Rawls' Theory of Justice is having seems to indicate that this theory is appropriate as a practical solution to the problem of pluralism on the different conceptions of life that characterize democratic societies. The starting point from which the theory parts is subordinate to the objective of reaching an agreement, rather than responding to a common good. Thus, procedural systems are given primacy, as they strive to determine the social structure by justice alone. Justice is seen, therefore, not so much as a virtue of the subject, but as a correct social order that guarantees an equality of possibilities through a procedural channel. However, ignoring the issue of what is good and the right that one has over it, the Theory of Justice contradicts the intrinsic rationality of social relations, since such relations are based on the communication of specific goods. That is why there is a supremacy of good over justice.\\n4207 La actual resonancia de la teoría de Rawls parece indicar que es apropiada como solución práctica al problema del pluralismo sobre las distintas concepciones de la vida que caracteriza a las sociedades democráticas. El punto de inicio del que parte está subordinado al objetivo de alcanzar un acuerdo y no tanto de responder a un bien común. Se da así primacía a los sistemas procedimentales tratando de determinar la estructura social por la sola justicia. La justicia se ve, entonces, no tanto como una virtud del sujeto, cuanto como un recto ordenamiento social que garantice una igualdad de posibilidades a través de un cauce procedimental. Sin embargo, ignorar el tema del bien y del derecho que sobre él se tiene, contradice la racionalidad intrínseca de las relaciones sociales, ya que tales relaciones están fundadas en la comunicación de bienes específicos, por lo que se da una supremacía del bien sobre la justicia.\\n4207",
				"journalAbbreviation": "RevCau",
				"language": "es",
				"libraryCatalog": "cauriensia.es",
				"pages": "63-83",
				"publicationTitle": "Cauriensia. Revista anual de Ciencias Eclesiásticas",
				"rights": "Derechos de autor 2022 CAURIENSIA. Revista anual de Ciencias Eclesiásticas",
				"url": "https://cauriensia.es/index.php/cauriensia/article/view/mis4",
				"volume": "17",
				"attachments": [],
				"tags": [
					{
						"tag": "Rawls"
					},
					{
						"tag": "bien"
					},
					{
						"tag": "imparcialidad"
					},
					{
						"tag": "justicia"
					},
					{
						"tag": "procedimiento"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0001-9243-9755 | María Teresa Cid Vázquez | taken from website"
					},
					{
						"note": "translatedTitle:Justice as Fairness or as Acknowledging the Good in Others"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hispaniasacra.revistas.csic.es/index.php/hispaniasacra/article/view/946",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La ἄσκησις o «ejercicio espiritual» en el tratado De vita contemplativa de Filón de Alejandría",
				"creators": [
					{
						"firstName": "Diego Andrés Cardoso",
						"lastName": "Bueno",
						"creatorType": "author"
					}
				],
				"date": "2022/12/30",
				"DOI": "10.3989/hs.2022.23",
				"ISSN": "1988-4265",
				"abstractNote": "The concept of ἄσκησις in Philo’s works, as in other intellectual contexts of Antiquity, is linked to those of effort and advance, because, when dealing with philosophical texts of this time, one must always think about the idea of spiritual ascension, πνευματική πρόοδος, together with the idea of exercise that is inherent in it.\\n4207 El concepto de ἄσκησις en el contexto filónico al igual que en otros entornos intelectuales de la Antigüedad, está ligado a los de esfuerzo y avance, porque, cuando se afronta un texto filosófico de esta época, hay que pensar siempre en la idea de ascenso espiritual, πνευματική πρόοδος, además de en el ejercicio que lleva consigo.",
				"archiveLocation": "The ἄσκησις or “spiritual exercise” in the treatise De vita contemplativa by Philo of Alexandria",
				"issue": "150",
				"journalAbbreviation": "Hisp. sacra",
				"language": "es",
				"libraryCatalog": "hispaniasacra.revistas.csic.es",
				"pages": "347-355",
				"publicationTitle": "Hispania Sacra",
				"rights": "Derechos de autor 2023 Consejo Superior de Investigaciones Científicas (CSIC)",
				"url": "https://hispaniasacra.revistas.csic.es/index.php/hispaniasacra/article/view/946",
				"volume": "74",
				"attachments": [],
				"tags": [
					{
						"tag": "contemplación"
					},
					{
						"tag": "ejercicio espiritual"
					},
					{
						"tag": "lago Mareotis"
					},
					{
						"tag": "terapeutas"
					},
					{
						"tag": "técnicas psicagógicas"
					},
					{
						"tag": "ἄσκησις"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0001-6838-6761 | Diego Andrés Cardoso Bueno | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.zfrk-rdsr.ch/article/view/3989",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Zum Umgang mit religiösen Objekten: Drei Expertinnen im Interview Entretien avec trois expertes",
				"creators": [
					{
						"firstName": "Caroline",
						"lastName": "Widmer",
						"creatorType": "author"
					}
				],
				"date": "2023/05/15",
				"DOI": "10.26034/fr.zfrk.2023.3989",
				"ISSN": "2297-6469",
				"journalAbbreviation": "RDSR",
				"language": "de",
				"libraryCatalog": "www.zfrk-rdsr.ch",
				"pages": "15-18",
				"publicationTitle": "Revue de didactique des sciences des religions",
				"rights": "(c) Caroline Widmer, 2023",
				"shortTitle": "Zum Umgang mit religiösen Objekten",
				"url": "https://www.zfrk-rdsr.ch/article/view/3989",
				"volume": "11",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.hermeneutische-blaetter.uzh.ch/issue/view/254",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://missionalia.journals.ac.za/pub/article/view/505",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Changing Africa Reflections on family involvement in African Christian marriage",
				"creators": [
					{
						"firstName": "Marilyn",
						"lastName": "Naidoo",
						"creatorType": "author"
					},
					{
						"firstName": "Gugulethu Engelbetter",
						"lastName": "Ndlovu",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"DOI": "10.7832/51-0-505",
				"ISSN": "2312-878X",
				"abstractNote": "The paper describes the lived experiences of present-day African Christian couples in urban South Africa with the aim of understanding the effect family involvement has on their marriages. This article contributes to understanding the marital experiences of contemporary African Christians to understand their views on the involvement of the extended family, which is part of African culture. Understanding these viewpoints sheds light on cultural dynamics, especially how African culture is valued in a changing society which adds value to understanding the modern African. To nurture meaningful ministry engagement for the African context, research and awareness of African cultural nuances are invaluable. The understanding from this article can contribute to the contextualisation of pastoral care and counselling in Africa. This understanding may also contribute to reframing the colonial discourse through which mission work in Africa has long operated.",
				"language": "en",
				"libraryCatalog": "missionalia.journals.ac.za",
				"publicationTitle": "Missionalia: Southern African Journal of Missiology",
				"rights": "Copyright (c) 2023 Missionalia: Southern African Journal of Missiology",
				"url": "https://missionalia.journals.ac.za/pub/article/view/505",
				"volume": "51",
				"attachments": [],
				"tags": [
					{
						"tag": "African Christian Marriage"
					},
					{
						"tag": "African Culture"
					},
					{
						"tag": "Colonial Discourse"
					},
					{
						"tag": "Communalism"
					},
					{
						"tag": "Mission Work"
					},
					{
						"tag": "Pastoral Care"
					},
					{
						"tag": "Ubuntu"
					},
					{
						"tag": "Urbanisation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cauriensia.es/index.php/cauriensia/article/view/498",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "El perdón en el pensamiento de Dietrich von Hildebrand / The Forgiveness in Dietrich von Hildebrand’s Thought",
				"creators": [
					{
						"firstName": "Eugénio",
						"lastName": "Lopes",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.17398/2340-4256.16.455",
				"ISSN": "2340-4256",
				"abstractNote": "\\n4207 Todos nosotros necesitamos perdonar y ser perdonados, a fin de autorrealizarnos. En este sentido, en este articulo, pretendo analizar la propuesta de Dietrich von Hildebrand con relación al tema del perdón y ver así de que forma esta propuesta nos permite entender mejor en que consiste esencialmente el perdón.Palabras clave: Arrepentimiento, Conversión, Perdón, Pedir Disculpa, Bien y Malo Objetivo para la Persona, Culpa, Valor y Disvalor, Dios. \\n4207 Everybody needs to forgive and to be forgiven in order to self-realize. In this sense, in this article, I intend to analyze Dietrich von Hildebrand's proposal concerning the topic of forgiveness and, in this way, why his proposal allows us to better understand what forgiveness essentially is\\n4207",
				"journalAbbreviation": "RevCau",
				"language": "es",
				"libraryCatalog": "cauriensia.es",
				"pages": "455-473",
				"publicationTitle": "Cauriensia. Revista anual de Ciencias Eclesiásticas",
				"rights": "Derechos de autor 2021 CAURIENSIA. Revista anual de Ciencias Eclesiásticas",
				"url": "https://cauriensia.es/index.php/cauriensia/article/view/498",
				"volume": "16",
				"attachments": [],
				"tags": [
					{
						"tag": " Arrepentimiento"
					},
					{
						"tag": "Apologize"
					},
					{
						"tag": "Bien y Malo Objetivo para la Persona"
					},
					{
						"tag": "Conversion"
					},
					{
						"tag": "Conversión"
					},
					{
						"tag": "Culpa"
					},
					{
						"tag": "Dios"
					},
					{
						"tag": "Forgiveness"
					},
					{
						"tag": "God"
					},
					{
						"tag": "Guilt"
					},
					{
						"tag": "Objective Good and Bad for the Person"
					},
					{
						"tag": "Pedir Disculpa"
					},
					{
						"tag": "Perdón"
					},
					{
						"tag": "Repentance"
					},
					{
						"tag": "Valor y Disvalor"
					},
					{
						"tag": "Value and Disvalue"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0001-8474-3538 | Eugénio Lopes | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cauriensia.es/index.php/cauriensia/article/view/497",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La reducción secular de la laicidad religiosa / Secular Reduction of Religious Secularity",
				"creators": [
					{
						"firstName": "Manuel Lázaro",
						"lastName": "Pulido",
						"creatorType": "author"
					},
					{
						"firstName": "Esteban Anchústegui",
						"lastName": "Igartua",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.17398/2340-4256.16.421",
				"ISSN": "2340-4256",
				"abstractNote": "\\n4207 Este artículo analiza cómo las democracias europeas están tolerando –cuando no promoviendo– la proliferación de mensajes denigrantes hacia aquellos ciudadanos que viven su religión, especialmente la católica, y reclaman la presencia de esta experiencia en el ámbito público; sufriendo por todo ello una discriminación que es amparada sistemáticamente por las instituciones políticas, alcanzando niveles de delitos de odio que en ningún caso serían admisibles en relación al género, la raza, la discapacidad o la orientación sexual.Los delitos de odio por motivos religiosos hacia el catolicismo se han convertido en norma, legitimando las afrentas hacia una religión que se caricaturiza como colonialista y a unos seguidores a los que se etiqueta como privilegiados explotadores, siendo todo ello producto de una confusión interesada entre el fenómeno de la secularización y el del laicismo. Así, desde la premisa jurídico-político de la laicidad del Estado, se demoniza como fundamentalista cualquier manifestación de un creyente católico que, desde el respeto absoluto a los valores democráticos, proponga sus principios como valores propositivos para la sociedad y la vida pública; aptitud que, en aras de la paz social y como manifesta-ción de un laicismo que se ha convertido en una ideología que busca erradicar del ámbito púbico cualquier vinculación de Dios en las vidas humanas y en sus estructuras, es tole-rada paradójicamente en relación a religiones objetivamente fundamentalistas o respecto a posiciones visceralmente hostiles hacia la religión.Consideramos que este trato es aplicado al catolicismo con el fin de acallar su influencia moral, ya que, además de agente fundamental en el proceso histórico de institucionalización del poder temporal, constituye un baluarte frente a cualquier abuso de intromisión política en la vida de las personas. En definitiva, en aras de instaurar el pensamiento único del Estado, se trataría de deslegitimar el mensaje evangélico de la Iglesia en su denuncia a todo tipo intervencionismo, dependencia y control estatal que vulnere el pleno desarrollo de la libertad y la dignidad humana.Palabras clave: Catolicismo, delitos de odio, pluralismo, bien común, comunidad, persona, ciudadano, secularización, laicismo, laicidad, religión, democracia, Estado. \\n4207 This article analyses how European democracies are tolerating - if not promoting - the proliferation of denigrating messages towards those citizens who live their religion, especially Catholicism, and demand the presence of this experience in the public sphere; suffering discrimination that is systematically protected by political institutions, reaching levels of hate crimes that would never be admissible in relation to gender, race, disability or sexual orientation.Religiously motivated hate crimes against Catholicism have become the norm, legitimising affronts towards a religion that is caricatured as colonialist and followers who are labelled as privileged exploiters, all of this being the product of a self-interested confusion between the phenomenon of secularisation and that of secularism. Thus, from the legal-political premise of the secularity of the State, any manifestation of a Catholic believer who, with absolute respect for democratic values, proposes his or her principles as propositional values for society and public life, is demonised as fundamentalist; An attitude that, for the sake of social peace and as a manifestation of a secularism that has become an ideology that seeks to eradicate from the public sphere any link to God in human lives and their structures, is paradoxically tolerated in relation to objectively fundamentalist religions or in relation to positions that are viscerally hostile to religion.We consider that this treatment is applied to Catholicism in order to silence its moral influence, since, in addition to being a fundamental agent in the historical process of institutionalisation of temporal power, it constitutes a bulwark against any abuse of political meddling in people's lives. In short, in order to establish the State's single way of thinking, the aim would be to delegitimise the Church's evangelical message in its denunciation of any kind of state interventionism, dependence and control that violates the full development of freedom and human dignity\\n4207",
				"journalAbbreviation": "RevCau",
				"language": "es",
				"libraryCatalog": "cauriensia.es",
				"pages": "421-454",
				"publicationTitle": "Cauriensia. Revista anual de Ciencias Eclesiásticas",
				"rights": "Derechos de autor 2021 CAURIENSIA. Revista anual de Ciencias Eclesiásticas",
				"url": "https://cauriensia.es/index.php/cauriensia/article/view/497",
				"volume": "16",
				"attachments": [],
				"tags": [
					{
						"tag": " Catolicismo"
					},
					{
						"tag": "Catholicism"
					},
					{
						"tag": "Estado"
					},
					{
						"tag": "State"
					},
					{
						"tag": "bien común"
					},
					{
						"tag": "citizen"
					},
					{
						"tag": "ciudadano"
					},
					{
						"tag": "common good"
					},
					{
						"tag": "community"
					},
					{
						"tag": "comunidad"
					},
					{
						"tag": "delitos de odio"
					},
					{
						"tag": "democracia"
					},
					{
						"tag": "democracy"
					},
					{
						"tag": "hate crimes"
					},
					{
						"tag": "laicidad"
					},
					{
						"tag": "laicismo"
					},
					{
						"tag": "person"
					},
					{
						"tag": "persona"
					},
					{
						"tag": "pluralism"
					},
					{
						"tag": "pluralismo"
					},
					{
						"tag": "religion"
					},
					{
						"tag": "religión"
					},
					{
						"tag": "secularisation"
					},
					{
						"tag": "secularism"
					},
					{
						"tag": "secularity"
					},
					{
						"tag": "secularización"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0001-8471-7305 | Manuel Lázaro Pulido | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cauriensia.es/index.php/cauriensia/article/view/456",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Perspectiva mística desde la mirada sanjuanista / Mystical Prospective from Saint John of the Regard",
				"creators": [
					{
						"firstName": "Simona",
						"lastName": "Langella",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.17398/2340-4256.16.19",
				"ISSN": "2340-4256",
				"abstractNote": "\\n4207 Atravesar la \"noche oscura\" quiere decir para san Juan de la Cruz elevar al hombre desde la meditación a la contemplación. Este trabajo quiere mostrar como este tránsito puede comprenderse por medio de tres palabras clave (purificación, presencias y unión) propias de la obra sanjuanista y como a cada una de estas palabras el místico castellano hace corresponder diferentes grados de la realidad ontológica enfrentadas por el sujeto teopático en su itinerario hacia a Dios.Palabras clave: Juan de la Cruz, mística, purificación, presencias, unión.\\n4207 Going through the \"dark night\" means for Saint John of the Cross to lift man from meditation to contemplation. This article wants to show how this transit can be understood by means of three key words (purification, presences and union) typical of Saint John of the Cross’ work and how to each of these words correspond different degrees of the ontological reality faced by the subject theopathic on his itinerary to God\\n4207",
				"journalAbbreviation": "RevCau",
				"language": "es",
				"libraryCatalog": "cauriensia.es",
				"pages": "19-37",
				"publicationTitle": "Cauriensia. Revista anual de Ciencias Eclesiásticas",
				"rights": "Derechos de autor 2021 CAURIENSIA. Revista anual de Ciencias Eclesiásticas",
				"url": "https://cauriensia.es/index.php/cauriensia/article/view/456",
				"volume": "16",
				"attachments": [],
				"tags": [
					{
						"tag": " Juan de la Cruz"
					},
					{
						"tag": "John of the Cross"
					},
					{
						"tag": "mysticism"
					},
					{
						"tag": "mística"
					},
					{
						"tag": "presences"
					},
					{
						"tag": "presencias"
					},
					{
						"tag": "purificación"
					},
					{
						"tag": "purification"
					},
					{
						"tag": "union"
					},
					{
						"tag": "unión."
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0002-8231-6855 | Simona Langella | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://jps.library.utoronto.ca/index.php/renref/article/view/40431",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Le poète et le roi : les Poemata de Benedetto Tagliacarne (ca. 1480–1536), dit Théocrène | Renaissance and Reformation",
				"creators": [
					{
						"firstName": "Virginie",
						"lastName": "Leroux",
						"creatorType": "author"
					}
				],
				"date": "2024",
				"DOI": "10.33137/rr.v45i3.40431",
				"ISSN": "2293-7374",
				"abstractNote": "The Italian Benedetto Tagliacarne, known as Theocrenus, was tutor to the sons of Francis I from 1527 to 1533. In this capacity, he was closely involved with the royal family, as witnessed by his poetic works, published in Poitiers by Marnef in 1536, and in particular his epigrams, which shaped court events and portray an artistically refined and poetic king. Theocrenus thus celebrates the wedding of the king and Eleanor of Austria and pays tribute to Louise of Savoy; he praises the poetic compositions of Francis I, choosing the epitaph of Petrarch’s muse, Laura de Noves, but also the translation of an epigram attributed to Germanicus; finally, he composes numerous ekphraseis of the king’s works of art. The study of these epigrams allows us to evaluate the contribution of the Italian poet to the cultural policy of Francis I and to the mythology of the reign., L’Italien Benedetto Tagliacarne, dit Théocrène, occupa la charge de précepteur des fils de François Ier, de 1527 à 1533. À ce titre, il évolua dans l’intimité de la famille royale, ce dont témoignent ses oeuvres poétiques, publiées à Poitiers, chez Marnef, en 1536, et notamment ses épigrammes qui orchestrent des événements de cour et mettent en scène un roi esthète et poète. Théocrène célèbre ainsi les noces du roi et d’Éléonore d’Autriche et rend hommage à Louise de Savoie ; il fait l’éloge des productions poétiques de François Ier, choisissant l’épitaphe de la muse de Pétrarque, Laure de Noves, mais aussi la traduction d’une épigramme attribuée à Germanicus ; enfin, il compose de nombreuses ekphraseis des oeuvres d’art du roi. L’étude de ces épigrammes permettra d’évaluer la contribution du poète italien à la politique culturelle de François Ier et à la mythologie du règne.",
				"issue": "3",
				"language": "en-US",
				"libraryCatalog": "jps.library.utoronto.ca",
				"pages": "189-214",
				"shortTitle": "Le poète et le roi",
				"url": "https://jps.library.utoronto.ca/index.php/renref/article/view/40431",
				"volume": "45",
				"attachments": [],
				"tags": [
					{
						"tag": "François Ier"
					},
					{
						"tag": "Louise de Savoie"
					},
					{
						"tag": "Pétrarque"
					},
					{
						"tag": "Théocrène"
					},
					{
						"tag": "Vénus d’Amboise"
					},
					{
						"tag": "Éléonore d’Autriche"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://archivodominicano.dominicos.org/ojs/article/view/conventualidad-dominica-archivos-merida-badajoz",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Principales líneas de investigación sobre conventualidad dominica según la documentación custodiada en los archivos eclesiásticos de Mérida-Badajoz (siglos XVI-XIX)",
				"creators": [
					{
						"firstName": "María Guadalupe PÉREZ",
						"lastName": "ORTIZ",
						"creatorType": "author"
					}
				],
				"date": "2022/12/20",
				"ISSN": "2952-2196",
				"abstractNote": "The ecclesiastical archives of Mérida-Badajoz guard a great variety of documents on Dominican conventuality from the 16th to the 19th centuries. In the work that we present below, we intend to present said documentation from a perspective that goes beyond the pure analysis of the document and its subject matter. What we want to expose are the fundamental contents that these documents cover to show possible lines of research that, based on them, can give rise to other investigations.",
				"journalAbbreviation": "AD",
				"language": "es",
				"libraryCatalog": "archivodominicano.dominicos.org",
				"pages": "17-50",
				"publicationTitle": "Archivo Dominicano",
				"rights": "Derechos de autor 2022 María Guadalupe PÉREZ ORTIZ",
				"url": "https://archivodominicano.dominicos.org/ojs/article/view/conventualidad-dominica-archivos-merida-badajoz",
				"volume": "43",
				"attachments": [],
				"tags": [
					{
						"tag": "Dominicans"
					},
					{
						"tag": "archivos eclesiásticos"
					},
					{
						"tag": "conventos"
					},
					{
						"tag": "convents"
					},
					{
						"tag": "dominicos"
					},
					{
						"tag": "ecclesiastical archives"
					},
					{
						"tag": "lines of research"
					},
					{
						"tag": "líneas de investigación"
					}
				],
				"notes": [
					{
						"note": "abs:Los archivos eclesiásticos de Mérida-Badajoz custodian gran variedad de documentos sobre conventualidad dominica de entre los siglos XVI al XIX. En el trabajo que presentamos a continuación pretendemos dar a conocer dicha documentación desde una vertiente que va más allá del puro análisis del documento de archivo y su temática. Lo que queremos exponer son los contenidos fundamentales que abarcan dichos documentos para mostrar posibles líneas de investigación que partiendo de ellos puedan dar lugar a otras investigaciones futuras."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hispaniasacra.revistas.csic.es/index.php/hispaniasacra/article/view/946",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La ἄσκησις o «ejercicio espiritual» en el tratado De vita contemplativa de Filón de Alejandría",
				"creators": [
					{
						"firstName": "Diego Andrés Cardoso",
						"lastName": "Bueno",
						"creatorType": "author"
					}
				],
				"date": "2022/12/30",
				"DOI": "10.3989/hs.2022.23",
				"ISSN": "1988-4265",
				"abstractNote": "The concept of ἄσκησις in Philo’s works, as in other intellectual contexts of Antiquity, is linked to those of effort and advance, because, when dealing with philosophical texts of this time, one must always think about the idea of spiritual ascension, πνευματική πρόοδος, together with the idea of exercise that is inherent in it.\\n4207 El concepto de ἄσκησις en el contexto filónico al igual que en otros entornos intelectuales de la Antigüedad, está ligado a los de esfuerzo y avance, porque, cuando se afronta un texto filosófico de esta época, hay que pensar siempre en la idea de ascenso espiritual, πνευματική πρόοδος, además de en el ejercicio que lleva consigo.",
				"archiveLocation": "The ἄσκησις or “spiritual exercise” in the treatise De vita contemplativa by Philo of Alexandria",
				"issue": "150",
				"journalAbbreviation": "Hisp. sacra",
				"language": "es",
				"libraryCatalog": "hispaniasacra.revistas.csic.es",
				"pages": "347-355",
				"publicationTitle": "Hispania Sacra",
				"rights": "Derechos de autor 2023 Consejo Superior de Investigaciones Científicas (CSIC)",
				"url": "https://hispaniasacra.revistas.csic.es/index.php/hispaniasacra/article/view/946",
				"volume": "74",
				"attachments": [],
				"tags": [
					{
						"tag": "contemplación"
					},
					{
						"tag": "ejercicio espiritual"
					},
					{
						"tag": "lago Mareotis"
					},
					{
						"tag": "terapeutas"
					},
					{
						"tag": "técnicas psicagógicas"
					},
					{
						"tag": "ἄσκησις"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0001-6838-6761 | Diego Andrés Cardoso Bueno | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://periodicos.sbu.unicamp.br/ojs/index.php/csr/article/view/8673029",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Presentación - Actores religiosos y procesos políticos en América Latina",
				"creators": [
					{
						"firstName": "Mariela",
						"lastName": "Mosqueira",
						"creatorType": "author"
					}
				],
				"date": "2023/04/06",
				"DOI": "10.20396/csr.v25i00.8673029",
				"ISSN": "1982-2650",
				"abstractNote": "El panel que tuve el honor de moderar se tituló “Actores religiosos y procesos políticos en América Latina” y estuvo integrado por Virginia Garrard de la Universidad de Texas en Austin (EEUU) y por Joanildo Burity de la Fundação Joaquim Nabuco y la Universidad Federal de Pernambuco (Brasil), que cumplieron el rol de oradores centrales mientras que María das Dores Campos Machado de la Universidad Federal de Río de Janeiro (Brasil) fungió como discutidora. En este número de Ciencias Sociales y Religión / Ciências Sociais e Religião se publica el diálogo entre Garrard y Burity al que se suma una reacción final de Nicolás Panotto de la Universidad Arturo Prat y actual consejero por Chile de la ACSRAL.",
				"archiveLocation": "Latin America; Contemporary",
				"journalAbbreviation": "Cienc. Soc. y Relig.",
				"language": "es",
				"libraryCatalog": "periodicos.sbu.unicamp.br",
				"pages": "e023001",
				"publicationTitle": "Ciencias Sociales y Religión",
				"rights": "Derechos de autor 2023 Mariela Mosqueira",
				"url": "https://periodicos.sbu.unicamp.br/ojs/index.php/csr/article/view/8673029",
				"volume": "25",
				"attachments": [],
				"tags": [
					{
						"tag": "América Latina"
					},
					{
						"tag": "Política"
					},
					{
						"tag": "Religión"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0003-4522-2216 | Mariela Mosqueira | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.zfrk-rdsr.ch/article/view/3987",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Religiöse Objekte in Schule und Museum: Ein Tagungsbericht Compte rendu de la journée d’études",
				"creators": [
					{
						"firstName": "Beatrice",
						"lastName": "Kümin",
						"creatorType": "author"
					},
					{
						"firstName": "Caroline",
						"lastName": "Widmer",
						"creatorType": "author"
					}
				],
				"date": "2023/05/15",
				"DOI": "10.26034/fr.zfrk.2023.3987",
				"ISSN": "2297-6469",
				"journalAbbreviation": "RDSR",
				"language": "de",
				"libraryCatalog": "www.zfrk-rdsr.ch",
				"pages": "12-14",
				"publicationTitle": "Revue de didactique des sciences des religions",
				"rights": "(c) Beatrice Kümin, Caroline Widmer, 2023",
				"shortTitle": "Religiöse Objekte in Schule und Museum",
				"url": "https://www.zfrk-rdsr.ch/article/view/3987",
				"volume": "11",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://periodicos.pucminas.br/index.php/horizonte/article/view/27839",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Hildegarde Von Bingen, a exemplaridade do feminino no filme de Margarethe Von Trotta",
				"creators": [
					{
						"firstName": "Luiz",
						"lastName": "Vadico",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.5752/P.2175-5841.2022v20n61e206103",
				"ISSN": "2175-5841",
				"abstractNote": "In this article we will analyze the film Vision: The Life of Hildegarde Von Bingen, 2009, by Margarethe Von Trotta, verifying the effort of the German filmmaker to establish an exemplary model of feminine, using the life of the visionary Hildegarde Von Bingen. As background, the filmmaker's own career linked to the issue of Feminism. The exemplarity appears as one of the important points of the films of saint life, or film hagiography. For this reason we will check its aesthetics, structure and purpose. As well as we will draw the necessary relations between the historical personage, its music, its thought, with the image that it excels in the cinematographic work. By method, we start from the media work only, decapping it, studying its narrative, aesthetic form and structure, only then to raise the most important questions placed there relating them to social facts.",
				"issue": "61",
				"journalAbbreviation": "1",
				"language": "pt",
				"libraryCatalog": "periodicos.pucminas.br",
				"publicationTitle": "HORIZONTE - Revista de Estudos de Teologia e Ciências da Religião",
				"rights": "Copyright (c) 2023 HORIZONTE - Revista de Estudos de Teologia e Ciências da Religião",
				"url": "https://periodicos.pucminas.br/index.php/horizonte/article/view/27839",
				"volume": "20",
				"attachments": [],
				"tags": [
					{
						"tag": "Análise fílmica"
					},
					{
						"tag": "Cinema"
					},
					{
						"tag": "Feminismo"
					},
					{
						"tag": "Hagiografia"
					},
					{
						"tag": "Hildegarde Von Bingen"
					}
				],
				"notes": [
					"artikelID:e206103",
					{
						"note": "abs:No presente artigo analisaremos o filme Visão: A vida de Hildegarde Von Bingen, 2009, verificando o esforço da cineasta alemã Margarethe Von Trotta para estabelecer um modelo exemplar de feminino a partir da vida da visionária Hildegarde Von Bingen, tendo como pano de fundo a sua carreira ligada à questão do Feminismo. A exemplaridade surge como um dos pontos altos dos filmes de Vida de Santo, ou hagiografia fílmica, por essa razão verificaremos sua estética, estrutura e finalidade. Bem como traçaremos as relações necessárias entre a personagem histórica, sua música, seu pensamento, com o que dela sobressai na obra cinematográfica. Por método, partimos incialmente apenas da obra midiática, decupando-a, estudando sua narrativa, forma estética e estrutura, para só então levantar as questões mais importantes ali colocadas relacionando-as com os fatos sociais."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://revistaeclesiasticabrasileira.itf.edu.br/reb/article/view/4738",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "O olhar contemplativo de Maria Madalena em Jo 20,11-18: Contribuições ao discipulado feminino",
				"creators": [
					{
						"firstName": "Nelson Maria Brechó da",
						"lastName": "Silva",
						"creatorType": "author"
					},
					{
						"firstName": "Tiago Cosmo da Silva",
						"lastName": "Dias",
						"creatorType": "author"
					}
				],
				"date": "2023/04/25",
				"DOI": "10.29386/reb.v83i324.4738",
				"ISSN": "2595-5977",
				"abstractNote": "O presente artigo aborda o encontro entre o Ressuscitado e Maria Madalena. O método utilizado consiste na análise exegética, que se desdobra em três partes: texto e Sitz-im-Leben (contexto vital) da perícope Jo 20,11-18; comentário exegético-teológico; pragmática e hermenêutica. Procura-se evidenciar muitas coincidências com a segunda narração da criação, do livro de Gênesis (2-3): ambos os episódios se dão num jardim (cf. Gn 2,8; Jo 19,41); Maria Madalena confunde Jesus com o jardineiro (cf. Jo 20,15b), função que, na primeira criação, é do próprio Deus, o Criador (Gn 2,8). De fato, no auge de sua tristeza, Maria não contempla outra postura para Jesus a não ser deitado e imóvel, sem vida. Por isso, Jesus precisa dizer: “Não me toques, pois ainda não subi ao meu pai” (Jo 20,17). O relato se encerra com o anúncio da proximidade: “Vi o Senhor” (Jo 20,18). Desse modo, constata-se que o olhar contemplativo alarga a visão do discipulado feminino na sociedade e na pastoral católica.\n\n\\n4207  This article addresses the encounter between the Risen One and Mary Magdalene. The method used consists of exegetical analysis, which unfolds in three parts: text and Sitz-im-Leben (vital context) of the pericope Jn 20,11-18; exegetical-theological commentary; pragmatics and hermeneutics. We try to highlight many coincidences with the second account of creation, in the book of Genesis (2-3): both episodes take place in a garden (cf. Gn 2,8; Jn 19,41); Mary Magdalene confuses Jesus with the gardener (cf. Jn 20,15b), a role which, in the first creation, belongs to God himself, the Creator (Gn 2,8). In fact, at the height of her sadness, Mary contemplates no other posture for Jesus than lying down and motionless, lifeless. Therefore, Jesus needs to say: “Touch me not, for I have not yet ascended to my Father” (Jn 20,17). The account ends with the announcement of proximity: “I have seen the Lord” (Jn 20,18). Thus, it appears that the contemplative gaze broadens the vision of female discipleship in society and in Catholic pastoral care.\n\\n4207",
				"issue": "324",
				"journalAbbreviation": "REB",
				"language": "pt",
				"libraryCatalog": "revistaeclesiasticabrasileira.itf.edu.br",
				"pages": "8-21",
				"publicationTitle": "Revista Eclesiástica Brasileira",
				"rights": "Copyright (c) 2023 Revista Eclesiástica Brasileira",
				"shortTitle": "O olhar contemplativo de Maria Madalena em Jo 20,11-18",
				"url": "https://revistaeclesiasticabrasileira.itf.edu.br/reb/article/view/4738",
				"volume": "83",
				"attachments": [],
				"tags": [
					{
						"tag": " Nova Criação"
					},
					{
						"tag": "Discipulado feminino."
					},
					{
						"tag": "Female discipleship."
					},
					{
						"tag": "Maria Madalena"
					},
					{
						"tag": "Mary Magdalene"
					},
					{
						"tag": "New creation"
					},
					{
						"tag": "Ressuscitado"
					},
					{
						"tag": "Risen"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://periodicos.pucminas.br/index.php/horizonte/article/view/30378",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Religião e Cinema",
				"creators": [
					{
						"firstName": "Frederico",
						"lastName": "Pieper",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.5752/P.2175-5841.2022v20n61e206102",
				"ISSN": "2175-5841",
				"abstractNote": "Não se aplica",
				"issue": "61",
				"journalAbbreviation": "1",
				"language": "pt",
				"libraryCatalog": "periodicos.pucminas.br",
				"publicationTitle": "HORIZONTE - Revista de Estudos de Teologia e Ciências da Religião",
				"rights": "Copyright (c) 2023 HORIZONTE - Revista de Estudos de Teologia e Ciências da Religião",
				"url": "https://periodicos.pucminas.br/index.php/horizonte/article/view/30378",
				"volume": "20",
				"attachments": [],
				"tags": [
					{
						"tag": "Cinema"
					},
					{
						"tag": "Editorial"
					},
					{
						"tag": "Religião"
					}
				],
				"notes": [
					"artikelID:e206102"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://periodicos.pucminas.br/index.php/horizonte/article/view/27922",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Opening a hermeneutic space for spiritual care practices : introducing the Diamond Model to the Brazilian context",
				"creators": [
					{
						"firstName": "Mary Rute Gomes",
						"lastName": "Esperandio",
						"creatorType": "author"
					},
					{
						"firstName": "Carlo",
						"lastName": "Leget",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.5752/P.2175-5841.2022v20n62e206204",
				"ISSN": "2175-5841",
				"abstractNote": "Spiritual care is considered an intrinsic aspect of good palliative care practices. However, this is a challenge for health professionals. There is a lack of scientifically based non-religious approaches to identify and meet patients’ and families’ existential/spiritual needs. This article aims to present a tool for spiritual care named Diamond Model, or Ars Moriendi, developed by a Dutch researcher who designed it from elements drawn from his empirical research. The model is theoretically based on non-moral and non-religious anthropological frameworks, and it is open to people from a variety of cultural and religious backgrounds. Both chaplains and the multidisciplinary teams can use this hermeneutic tool. It helps to better understand and meet the spiritual needs of patients and families in the dimensions that involve autonomy, suffering, relations, unfinished business, and hope. The presentation of the Diamond Model to the Brazilian audience is also an invitation to test and evaluate it in future studies investigating spirituality in palliative care in Brazil.",
				"issue": "62",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "periodicos.pucminas.br",
				"publicationTitle": "HORIZONTE - Revista de Estudos de Teologia e Ciências da Religião",
				"rights": "Copyright (c) 2023 HORIZONTE - Journal of Studies in Theology and Religious Sciences",
				"shortTitle": "Opening a hermeneutic space for spiritual care practices",
				"url": "https://periodicos.pucminas.br/index.php/horizonte/article/view/27922",
				"volume": "20",
				"attachments": [],
				"tags": [
					{
						"tag": "Cuidado espiritual"
					},
					{
						"tag": "Cuidados paliativos"
					},
					{
						"tag": "Equipe multidisciplinar"
					},
					{
						"tag": "Espaço interior"
					},
					{
						"tag": "Espiritualidade e saúde"
					}
				],
				"notes": [
					"artikelID:e206204",
					{
						"note": "abs:O cuidado espiritual é considerado um aspecto intrínseco às boas práticas de cuidados paliativos. Contudo, este é um desafio a profissionais de saúde. Há carência de propostas cientificamente embasadas e não religiosas para identificar e atender as necessidades existenciais/espirituais de pacientes e familiares. Este artigo tem como objetivo apresentar uma ferramenta de cuidado espiritual denominada Modelo Diamante ou Ars Moriendi, desenvolvida por um pesquisador holandês que a concebeu a partir de elementos extraídos de sua pesquisa empírica. O modelo é teoricamente baseado em estruturas antropológicas não morais e não religiosas e está aberto a pessoas de uma variedade de origens culturais e religiosas. Tanto capelães quanto equipes multidisciplinares podem usar essa ferramenta hermenêutica. Ela ajuda a melhor compreender e atender as necessidades espirituais de pacientes e familiares nas dimensões que envolvem autonomia, sofrimento, relacionamentos, questões pendentes e esperança. A apresentação do Modelo Diamante ao público brasileiro também é um convite para testá-lo e avaliá-lo em estudos futuros que investiguem a espiritualidade em cuidados paliativos no Brasil."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ojs.uc.cl/index.php/tyv/article/view/60443",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Ser estoico y hacerse indiferente. El Principio y Fundamento de los Ejercicios Espirituales de san Ignacio de Loyola Observaciones vinculantes y disgregantes",
				"creators": [
					{
						"firstName": "Eduard",
						"lastName": "López",
						"creatorType": "author"
					}
				],
				"date": "2023/07/28",
				"DOI": "10.7764/TyV642.E2",
				"ISSN": "0717-6295",
				"abstractNote": "Is it possible that the indifference in the Spiritual Exercises of Saint Ignatius presents some trace of the Stoics like Epictetus or Marcus Aurelius? This article analyzes some observations that relate the Stoic being and the indifferent making in two totally different spiritual schools and that the Jesuit historiography until today has understood them. After a state of the matter, we analyze the Principle and Foundation of the Exercises in relation to the indifference. Through some texts of the Stoics, we compare the way of understanding life, the end of the human being and his divine-human relationship. By way of conclusion, we end with a series of lines about the indifference to Stoicism and the Ignatian Theology.",
				"issue": "2",
				"journalAbbreviation": "TyV",
				"language": "es",
				"libraryCatalog": "ojs.uc.cl",
				"pages": "171-193",
				"publicationTitle": "Teología y Vida",
				"rights": "Derechos de autor 2023 Eduard López",
				"url": "https://ojs.uc.cl/index.php/tyv/article/view/60443",
				"volume": "64",
				"attachments": [],
				"tags": [
					{
						"tag": "Ejercicios Espirituales"
					},
					{
						"tag": "Principio y Fundamento "
					},
					{
						"tag": "Principio y Fundamento means"
					},
					{
						"tag": "Principle and Foundation"
					},
					{
						"tag": "Spiritual Exercises"
					},
					{
						"tag": "fin"
					},
					{
						"tag": "indiferencia"
					},
					{
						"tag": "indifference"
					},
					{
						"tag": "medios"
					},
					{
						"tag": "purpose"
					}
				],
				"notes": [
					{
						"note": "abs:¿Es posible que la indiferencia en los Ejercicios Espirituales de san Ignacio presente alguna huella de los estoicos como Epicteto o Marco Aurelio? Este artículo analiza algunas observaciones que relacionan el ser estoico y el hacerse indiferente en dos escuelas espirituales totalmente diversas. Tras un estado de la cuestión, analizamos el Principio y Fundamento de los Ejercicios en relación a la indiferencia. Mediante algunos textos de los estoicos, comparamos el modo de comprender la vida, el fin del ser humano y su relación divino-humana. A modo de conclusión, finalizamos con una serie de líneas sobre la indiferencia para el estoicismo y la teología ignaciana."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://periodicos.pucminas.br/index.php/horizonte/article/view/27922",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Opening a hermeneutic space for spiritual care practices : introducing the Diamond Model to the Brazilian context",
				"creators": [
					{
						"firstName": "Mary Rute Gomes",
						"lastName": "Esperandio",
						"creatorType": "author"
					},
					{
						"firstName": "Carlo",
						"lastName": "Leget",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.5752/P.2175-5841.2022v20n62e206204",
				"ISSN": "2175-5841",
				"abstractNote": "Spiritual care is considered an intrinsic aspect of good palliative care practices. However, this is a challenge for health professionals. There is a lack of scientifically based non-religious approaches to identify and meet patients’ and families’ existential/spiritual needs. This article aims to present a tool for spiritual care named Diamond Model, or Ars Moriendi, developed by a Dutch researcher who designed it from elements drawn from his empirical research. The model is theoretically based on non-moral and non-religious anthropological frameworks, and it is open to people from a variety of cultural and religious backgrounds. Both chaplains and the multidisciplinary teams can use this hermeneutic tool. It helps to better understand and meet the spiritual needs of patients and families in the dimensions that involve autonomy, suffering, relations, unfinished business, and hope. The presentation of the Diamond Model to the Brazilian audience is also an invitation to test and evaluate it in future studies investigating spirituality in palliative care in Brazil.",
				"issue": "62",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "periodicos.pucminas.br",
				"publicationTitle": "HORIZONTE - Revista de Estudos de Teologia e Ciências da Religião",
				"rights": "Copyright (c) 2023 HORIZONTE - Journal of Studies in Theology and Religious Sciences",
				"shortTitle": "Opening a hermeneutic space for spiritual care practices",
				"url": "https://periodicos.pucminas.br/index.php/horizonte/article/view/27922",
				"volume": "20",
				"attachments": [],
				"tags": [
					{
						"tag": "Cuidado espiritual"
					},
					{
						"tag": "Cuidados paliativos"
					},
					{
						"tag": "Equipe multidisciplinar"
					},
					{
						"tag": "Espaço interior"
					},
					{
						"tag": "Espiritualidade e saúde"
					}
				],
				"notes": [
					"artikelID:e206204",
					{
						"note": "abs:O cuidado espiritual é considerado um aspecto intrínseco às boas práticas de cuidados paliativos. Contudo, este é um desafio a profissionais de saúde. Há carência de propostas cientificamente embasadas e não religiosas para identificar e atender as necessidades existenciais/espirituais de pacientes e familiares. Este artigo tem como objetivo apresentar uma ferramenta de cuidado espiritual denominada Modelo Diamante ou Ars Moriendi, desenvolvida por um pesquisador holandês que a concebeu a partir de elementos extraídos de sua pesquisa empírica. O modelo é teoricamente baseado em estruturas antropológicas não morais e não religiosas e está aberto a pessoas de uma variedade de origens culturais e religiosas. Tanto capelães quanto equipes multidisciplinares podem usar essa ferramenta hermenêutica. Ela ajuda a melhor compreender e atender as necessidades espirituais de pacientes e familiares nas dimensões que envolvem autonomia, sofrimento, relacionamentos, questões pendentes e esperança. A apresentação do Modelo Diamante ao público brasileiro também é um convite para testá-lo e avaliá-lo em estudos futuros que investiguem a espiritualidade em cuidados paliativos no Brasil."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://revistas.agustinosvalladolid.es/index.php/estudio/article/view/1059",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "El asentimiento como vínculo entre la razón y la fe",
				"creators": [
					{
						"firstName": "José M. Romero",
						"lastName": "Baró",
						"creatorType": "author"
					}
				],
				"date": "2022/09/22",
				"DOI": "10.53111/estagus.v57i2.1059",
				"ISSN": "2792-260X",
				"abstractNote": "This communication tries to describe some activities of human thought that shows a link keeping joined reason and faith, concluding that faith is something necessary for reason. Indeed, some teachings of Aristotle, Agustin and Thomas Aquinas shows how reason leads us to understand, how understanding always occurs accompanied by will and, finally, how will assents freely in the act of faith.",
				"issue": "2",
				"journalAbbreviation": "EstAgus",
				"language": "es",
				"libraryCatalog": "revistas.agustinosvalladolid.es",
				"pages": "431-439",
				"publicationTitle": "Estudio Agustiniano",
				"rights": "Derechos de autor 2022 José M.  Romero Baró",
				"url": "https://revistas.agustinosvalladolid.es/index.php/estudio/article/view/1059",
				"volume": "57",
				"attachments": [],
				"tags": [
					{
						"tag": "Asentimiento"
					},
					{
						"tag": "Assent"
					},
					{
						"tag": "Demonstration"
					},
					{
						"tag": "Demostración"
					},
					{
						"tag": "Faith"
					},
					{
						"tag": "Fe"
					},
					{
						"tag": "Intelección"
					},
					{
						"tag": "Intellection"
					},
					{
						"tag": "Razón"
					},
					{
						"tag": "Reason"
					},
					{
						"tag": "Voluntad"
					},
					{
						"tag": "Will"
					}
				],
				"notes": [
					{
						"note": "abs:Esta comunicación intenta exponer algunas de las actividades del pensamiento humano que muestran el vínculo que mantiene unida la razón con la fe, concluyendo que la fe es algo necesario para la razón. En efecto, siguiendo algunas de las enseñanzas de Aristóteles, san Agustín y santo Tomás de Aquino, se muestra cómo la razón lleva necesariamente hasta el entendimiento, cómo el entendimiento se da necesariamente con la voluntad y, finalmente, cómo la voluntad asiente libremente en el acto de fe."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ztp.jesuiten.org/index.php/ZTP/article/view/4074",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Von der Moral zur Ethik. Eine Neuperspektivierung der Debatte um Jürgen Habermas’ Kritik der kantischen Religionsphilosophie",
				"creators": [
					{
						"firstName": "Benedikt",
						"lastName": "Rediker",
						"creatorType": "author"
					}
				],
				"date": "2023/09/01",
				"DOI": "10.35070/ztp.v145i3.4074",
				"ISSN": "2709-8435",
				"abstractNote": "Jürgen Habermas’ critique of Kant’s philosophy of religion has been controversially discussed, especially from a theological perspective. Above all, Habermas’ critique poses a great challenge for approaches to practical metaphysics after Kant. By re-examining the debate around Habermas’ critique of Kant, this article attempts to develop a moderate defense of such projects, which at the same time remains committed to the methodological approach of discourse theory. The aim is to show that Habermasʼ direct criticism of Kant’s doctrine of postulates can be refuted, but that his fundamental skepticism about locating practical faith within the moral sphere is justified from a discourse-theoretical perspective. This is so, because considering a discourse-theoretical moral theory, it can no longer be located within morality, but only within the sphere of ethics. This relocation of Kant’s doctrine of postulates within the sphere of ethics comes along with a relativisation of its rather strong rational justification claim, a fact that has important consequences for the theological project of a practical metaphysics after Kant.\\n4207 Jürgen Habermas’ Kritik der kantischen Religionsphilosophie ist besonders von theologischer Seite kontrovers diskutiert worden. Vor allem für Ansätze einer praktischen Metaphysik nach Kant stellt sie eine große Herausforderung dar. Die Abhandlung versucht, durch eine Neuperspektivierung der Debatte um Habermas’ Kant-Kritik eine moderate Verteidigung derartiger Vorhaben zu entwickeln, die zugleich diskurstheoretischen Denkbedingungen verpflichtet bleibt. Dabei soll gezeigt werden, dass Habermas’ direkte Kritik an Kants Postulatenlehre entkräftet werden kann, seine grundsätzliche Skepsis gegenüber einer Verortung derselben innerhalb der Moral aus einer diskurstheoretischen Perspektive jedoch gerechtfertigt ist. Denn vor dem Hintergrund einer diskurstheoretischen Moraltheorie kann diese nicht mehr länger in der Moral, sondern nur noch innerhalb der Sphäre der Ethik verortet werden. Diese Neuverortung geht jedoch einher mit einer Relativierung des von Kant vertretenen starken Begründungsanspruchs des praktischen Vernunftglaubens, was auch für das theologische Projekt einer praktischen Metaphysik nach Kant wichtige Konsequenzen hat.",
				"issue": "3",
				"journalAbbreviation": "ZTP",
				"language": "de",
				"libraryCatalog": "ztp.jesuiten.org",
				"publicationTitle": "Zeitschrift für Theologie und Philosophie",
				"rights": "Copyright (c) 2023 Zeitschrift für Theologie und Philosophie",
				"url": "https://ztp.jesuiten.org/ZTP/article/view/4074",
				"volume": "145",
				"attachments": [],
				"tags": [
					{
						"tag": "Immanuel Kant"
					},
					{
						"tag": "Jürgen Habermas"
					},
					{
						"tag": "Moral/Ethik-Unterscheidung"
					},
					{
						"tag": "Religionsphilosophie"
					},
					{
						"tag": "moral-ethics distinction"
					},
					{
						"tag": "philosophy of religion"
					},
					{
						"tag": "practical metaphysics"
					},
					{
						"tag": "praktische Metaphysik"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0001-7664-4337 | Benedikt Rediker | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://revistas.ucp.pt/index.php/lusitaniasacra/article/view/12990",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "CHAVES, Duarte Nuno, coord. – Conventos franciscanos nos Açores do século XXI. Memórias da Província de S. João Evangelista",
				"creators": [
					{
						"firstName": "António Montes",
						"lastName": "Moreira",
						"creatorType": "author"
					}
				],
				"date": "2023/06/02",
				"DOI": "10.34632/lusitaniasacra.2023.12990",
				"ISSN": "2182-8822",
				"abstractNote": "Este portal disponibiliza revistas científicas publicadas pelos Centros de Investigação e Unidades de Ensino da Universidade Católica Portuguesa. Tem como objetivo aumentar a visibilidade e alcance das publicações e promover a qualidade editorial.",
				"journalAbbreviation": "1",
				"language": "pt",
				"libraryCatalog": "revistas.ucp.pt",
				"pages": "271-272",
				"publicationTitle": "Lusitania Sacra",
				"rights": "Direitos de Autor (c) 2023 António Montes Moreira",
				"url": "https://revistas.ucp.pt/index.php/lusitaniasacra/article/view/12990",
				"volume": "47",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "orcid:0000-0003-1197-7354 | António Montes Moreira | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://jps.library.utoronto.ca/index.php/renref/article/view/41731",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Les communautés protestantes en France : représentations, symboles et mimésis | Renaissance and Reformation",
				"creators": [
					{
						"firstName": "Lorenzo Comensoli",
						"lastName": "Antonini",
						"creatorType": "author"
					},
					{
						"firstName": "Paul-Alexis",
						"lastName": "Mellet",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"DOI": "10.33137/rr.v46i1.41731",
				"ISSN": "2293-7374",
				"abstractNote": "The identity of French Protestant communities during the sixteenth and seventeenth centuries may be defined above all as a communion of faith. On its own, however, this is not a sufficient criterion : an anthropological point of view interrogating the reflexive aspect of these communities, that is, the way they represented themselves, can further help us to trace the symbolic relations that allowed them to maintain their cohesion (unity in diversity). Moreover, during the Wars of Religion and later the “intolerant tolerance” inaugurated by the Edict of Nantes, representations of French Protestants evolved in response to the monarchy and changes in its attitude towards them, up until the revocation of the Edict in 1685.\n \n , L’identité des communautés protestantes françaises, entre XVIe et XVIIe siècles, se définit d’abord par une communion de foi. Ce critère, cependant, ne suffit pas : une approche anthropologique interrogeant la dimension réfléchie des communautés, c’est-à-dire les représentations qu’elles ont d’elles-mêmes, permet de retracer les liens symboliques qui produisent leur cohésion (unité du multiple). Or, pendant les guerres de Religion puis face à la « tolérance dans l’intolérance » inaugurée par l’édit de Nantes, les représentations des protestants français évoluent par rapport au pouvoir monarchique et à ses changements d’attitude à leur égard, arrivant jusqu’à la Révocation de 1685.",
				"issue": "1",
				"language": "en-US",
				"libraryCatalog": "jps.library.utoronto.ca",
				"pages": "9-26",
				"shortTitle": "Les communautés protestantes en France",
				"url": "https://jps.library.utoronto.ca/index.php/renref/article/view/41731",
				"volume": "46",
				"attachments": [],
				"tags": [
					{
						"tag": "Communauté"
					},
					{
						"tag": "Huguenots"
					},
					{
						"tag": "Identité"
					},
					{
						"tag": "Mimésis"
					},
					{
						"tag": "Représentation politique"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bildungsforschung.org/ojs/index.php/bildungsforschung/article/view/927",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Ethnographische und gesprächsanalytische Zugänge zu schulischen Differenzierungen: Exploration methodischer Unterschiede und Gemeinsamkeiten",
				"creators": [
					{
						"firstName": "Ina",
						"lastName": "Kordts",
						"creatorType": "author"
					},
					{
						"firstName": "Falko",
						"lastName": "Röhrs",
						"creatorType": "author"
					},
					{
						"firstName": "Hanna",
						"lastName": "Siegismund",
						"creatorType": "author"
					},
					{
						"firstName": "Florian",
						"lastName": "Weitkämper",
						"creatorType": "author"
					}
				],
				"date": "2023/08/24",
				"DOI": "10.25539/bildungsforschung.v29i1.927",
				"ISSN": "1860-8213",
				"abstractNote": "Der vorliegende Artikel plädiert für eine Verbindung von ethnographischen und gesprächsanalytischen Ansätzen in kooperativ und interdisziplinär arbeitenden Forschendenteams zur Untersuchung von Differenzierungen im schulischen Feld. Am Beispiel der Analyse eines ethnographischen Interviews werden dafür Gemeinsamkeiten und Unterschiede ebenso wie damit einhergehenden Möglichkeiten und Begrenzungen der Methoden im Erkenntnisprozess in den Blick genommen.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "de",
				"libraryCatalog": "bildungsforschung.org",
				"publicationTitle": "bildungsforschung",
				"rights": "Copyright (c) 2023 bildungsforschung",
				"shortTitle": "Ethnographische und gesprächsanalytische Zugänge zu schulischen Differenzierungen",
				"url": "https://bildungsforschung.org/ojs/index.php/bildungsforschung/article/view/927",
				"volume": "29",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "Paralleltitel:Approche ethnographique et analyse conversationnelle de la  différenciation scolaire : Exploration des différences et des  similitudes méthodologiques"
					},
					{
						"note": "abs:Le présent article plaide en faveur d'une combinaison d'approches ethnographiques et d'ana-lyse conversationnelle dans des équipes de chercheurs travaillant de manière coopérative et interdisciplinaire pour étudier les différenciations dans le domaine scolaire. A l'aide de l'exemple de l'analyse d'un entretien ethnographique, les points communs et les différences ainsi que les possibilités et les limites des méthodes dans le processus de compréhension sont examinés."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bildungsforschung.org/ojs/index.php/bildungsforschung/article/view/927",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Ethnographische und gesprächsanalytische Zugänge zu schulischen Differenzierungen: Exploration methodischer Unterschiede und Gemeinsamkeiten",
				"creators": [
					{
						"firstName": "Ina",
						"lastName": "Kordts",
						"creatorType": "author"
					},
					{
						"firstName": "Falko",
						"lastName": "Röhrs",
						"creatorType": "author"
					},
					{
						"firstName": "Hanna",
						"lastName": "Siegismund",
						"creatorType": "author"
					},
					{
						"firstName": "Florian",
						"lastName": "Weitkämper",
						"creatorType": "author"
					}
				],
				"date": "2023/08/24",
				"DOI": "10.25539/bildungsforschung.v29i1.927",
				"ISSN": "1860-8213",
				"abstractNote": "Der vorliegende Artikel plädiert für eine Verbindung von ethnographischen und gesprächsanalytischen Ansätzen in kooperativ und interdisziplinär arbeitenden Forschendenteams zur Untersuchung von Differenzierungen im schulischen Feld. Am Beispiel der Analyse eines ethnographischen Interviews werden dafür Gemeinsamkeiten und Unterschiede ebenso wie damit einhergehenden Möglichkeiten und Begrenzungen der Methoden im Erkenntnisprozess in den Blick genommen.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "de",
				"libraryCatalog": "bildungsforschung.org",
				"publicationTitle": "bildungsforschung",
				"rights": "Copyright (c) 2023 bildungsforschung",
				"shortTitle": "Ethnographische und gesprächsanalytische Zugänge zu schulischen Differenzierungen",
				"url": "https://bildungsforschung.org/ojs/index.php/bildungsforschung/article/view/927",
				"volume": "29",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "Paralleltitel:Approche ethnographique et analyse conversationnelle de la  différenciation scolaire : Exploration des différences et des  similitudes méthodologiques"
					},
					{
						"note": "abs:Le présent article plaide en faveur d'une combinaison d'approches ethnographiques et d'ana-lyse conversationnelle dans des équipes de chercheurs travaillant de manière coopérative et interdisciplinaire pour étudier les différenciations dans le domaine scolaire. A l'aide de l'exemple de l'analyse d'un entretien ethnographique, les points communs et les différences ainsi que les possibilités et les limites des méthodes dans le processus de compréhension sont examinés."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bildungsforschung.org/ojs/index.php/bildungsforschung/article/view/927",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Ethnographische und gesprächsanalytische Zugänge zu schulischen Differenzierungen: Exploration methodischer Unterschiede und Gemeinsamkeiten",
				"creators": [
					{
						"firstName": "Ina",
						"lastName": "Kordts",
						"creatorType": "author"
					},
					{
						"firstName": "Falko",
						"lastName": "Röhrs",
						"creatorType": "author"
					},
					{
						"firstName": "Hanna",
						"lastName": "Siegismund",
						"creatorType": "author"
					},
					{
						"firstName": "Florian",
						"lastName": "Weitkämper",
						"creatorType": "author"
					}
				],
				"date": "2023/08/24",
				"DOI": "10.25539/bildungsforschung.v29i1.927",
				"ISSN": "1860-8213",
				"abstractNote": "Der vorliegende Artikel plädiert für eine Verbindung von ethnographischen und gesprächsanalytischen Ansätzen in kooperativ und interdisziplinär arbeitenden Forschendenteams zur Untersuchung von Differenzierungen im schulischen Feld. Am Beispiel der Analyse eines ethnographischen Interviews werden dafür Gemeinsamkeiten und Unterschiede ebenso wie damit einhergehenden Möglichkeiten und Begrenzungen der Methoden im Erkenntnisprozess in den Blick genommen.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "de",
				"libraryCatalog": "bildungsforschung.org",
				"publicationTitle": "bildungsforschung",
				"rights": "Copyright (c) 2023 bildungsforschung",
				"shortTitle": "Ethnographische und gesprächsanalytische Zugänge zu schulischen Differenzierungen",
				"url": "https://bildungsforschung.org/ojs/index.php/bildungsforschung/article/view/927",
				"volume": "29",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "Paralleltitel:Approche ethnographique et analyse conversationnelle de la  différenciation scolaire : Exploration des différences et des  similitudes méthodologiques"
					},
					{
						"note": "abs:Le présent article plaide en faveur d'une combinaison d'approches ethnographiques et d'ana-lyse conversationnelle dans des équipes de chercheurs travaillant de manière coopérative et interdisciplinaire pour étudier les différenciations dans le domaine scolaire. A l'aide de l'exemple de l'analyse d'un entretien ethnographique, les points communs et les différences ainsi que les possibilités et les limites des méthodes dans le processus de compréhension sont examinés."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bildungsforschung.org/ojs/index.php/bildungsforschung/article/view/927",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Ethnographische und gesprächsanalytische Zugänge zu schulischen Differenzierungen: Exploration methodischer Unterschiede und Gemeinsamkeiten",
				"creators": [
					{
						"firstName": "Ina",
						"lastName": "Kordts",
						"creatorType": "author"
					},
					{
						"firstName": "Falko",
						"lastName": "Röhrs",
						"creatorType": "author"
					},
					{
						"firstName": "Hanna",
						"lastName": "Siegismund",
						"creatorType": "author"
					},
					{
						"firstName": "Florian",
						"lastName": "Weitkämper",
						"creatorType": "author"
					}
				],
				"date": "2023/08/24",
				"DOI": "10.25539/bildungsforschung.v29i1.927",
				"ISSN": "1860-8213",
				"abstractNote": "Der vorliegende Artikel plädiert für eine Verbindung von ethnographischen und gesprächsanalytischen Ansätzen in kooperativ und interdisziplinär arbeitenden Forschendenteams zur Untersuchung von Differenzierungen im schulischen Feld. Am Beispiel der Analyse eines ethnographischen Interviews werden dafür Gemeinsamkeiten und Unterschiede ebenso wie damit einhergehenden Möglichkeiten und Begrenzungen der Methoden im Erkenntnisprozess in den Blick genommen.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "de",
				"libraryCatalog": "bildungsforschung.org",
				"publicationTitle": "bildungsforschung",
				"rights": "Copyright (c) 2023 bildungsforschung",
				"shortTitle": "Ethnographische und gesprächsanalytische Zugänge zu schulischen Differenzierungen",
				"url": "https://bildungsforschung.org/ojs/index.php/bildungsforschung/article/view/927",
				"volume": "29",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "Paralleltitel:Approche ethnographique et analyse conversationnelle de la  différenciation scolaire : Exploration des différences et des  similitudes méthodologiques"
					},
					{
						"note": "abs:Le présent article plaide en faveur d'une combinaison d'approches ethnographiques et d'ana-lyse conversationnelle dans des équipes de chercheurs travaillant de manière coopérative et interdisciplinaire pour étudier les différenciations dans le domaine scolaire. A l'aide de l'exemple de l'analyse d'un entretien ethnographique, les points communs et les différences ainsi que les possibilités et les limites des méthodes dans le processus de compréhension sont examinés."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ojs.reformedjournals.co.za/stj/article/view/2315",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Clown of the City",
				"creators": [
					{
						"firstName": "Wessel",
						"lastName": "Wessels",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.17570/stj.2021.v7n1.br4",
				"ISSN": "2413-9467",
				"abstractNote": "The review copy of Clown of the City in my possession was initially incorrectly sent to a journal on the sciences of city construction. I quite like to imagine how the book was received: with uncertainty, caution, and disorientation. I can imagine when the title, Clown of the City, was read, the uncertainty gave way to confusion. What has a clown to do with the city? And, even more, what has a clown to do with the serious work of constructing cities? Moreover, who is this clown and what is this city?",
				"issue": "1",
				"journalAbbreviation": "STJ",
				"language": "en",
				"libraryCatalog": "ojs.reformedjournals.co.za",
				"publicationTitle": "Stellenbosch Theological Journal",
				"rights": "Copyright (c) 2022 Wessel Wessels",
				"url": "https://ojs.reformedjournals.co.za/stj/article/view/2315",
				"volume": "7",
				"attachments": [],
				"tags": [
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
		"url": "https://revistas.unav.edu/index.php/scripta-theologica/article/view/42692",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La antropología del trabajo desde la teología bíblica. Una nueva consideración de Gn 2,4b-25",
				"creators": [
					{
						"firstName": "Diego",
						"lastName": "Pérez-Gondar",
						"creatorType": "author"
					}
				],
				"date": "2023/02/28",
				"DOI": "10.15581/006.55.1.9-37",
				"ISSN": "2254-6227",
				"abstractNote": "In any humanist vision of reality, rereading the founding texts of “cultural memory” is helpful. Thus, we can lead to an identity update that opens up new perspectives. Advances in the sciences that accompany biblical theology facilitate this task. In the present work, we approach the task of revisiting Gen 2:4b-25 with a philological approach that respects the text in its originality and sheds light on the present. The original design for the human being is an action that develops the world with care. At the same time, the human being himself progresses in and through the “spousal covenant”. This covenant is a significant category for understanding human existence, both for structuring society and for understanding its relationship to the Creator.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "es",
				"libraryCatalog": "revistas.unav.edu",
				"pages": "9-37",
				"publicationTitle": "Scripta Theologica",
				"rights": "Derechos de autor 2023 Scripta Theologica",
				"url": "https://revistas.unav.edu/index.php/scripta-theologica/article/view/42692",
				"volume": "55",
				"attachments": [],
				"tags": [
					{
						"tag": "4b-25"
					},
					{
						"tag": "Acción humana"
					},
					{
						"tag": "Alianza"
					},
					{
						"tag": "Gn 2"
					},
					{
						"tag": "Génesis"
					},
					{
						"tag": "Trabajo"
					},
					{
						"tag": "Trabajo, Génesis, Gn 2,4b-25, Acción humana, Vocación, Alianza"
					},
					{
						"tag": "Vocación"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0002-7761-1411 | Diego Pérez-Gondar | taken from website"
					},
					{
						"note": "Paralleltitel:The Anthropology of Work from Biblical Theology. A New Consideration of Gn 2:4b-25"
					},
					{
						"note": "abs:En toda visión humanista de la realidad, conviene releer los textos fundantes de la “memoria cultural”. Así se puede realizar una actualización de la identidad que abra nuevas perspectivas. El avance en las ciencias que acompañan a la teología bíblica facilita esa tarea. En el presente trabajo se aborda la tarea de reconsiderar Gn 2,4b-25 con una aproximación filológica que respeta el texto en su originalidad y da luces para el presente. El designio original para el ser humano es una acción que desarrolle el mundo con una actitud de cuidado. Al mismo tiempo, el propio ser humano se desarrolla y personifica en y a través de la “alianza esponsal”. Esa alianza es una categoría principal para entender la existencia humana, tanto para vertebrar la sociedad, como para comprender su relación con el Creador."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lockwoodonlinejournals.com/index.php/jaos/article/view/2406",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Martyrs on the Mountain: The Early Traditionist Compromise over the First fitna",
				"creators": [
					{
						"firstName": "I.-Wen",
						"lastName": "Su",
						"creatorType": "author"
					}
				],
				"date": "2023/12/12",
				"DOI": "10.7817/jaos.143.4.2023.ar030",
				"ISSN": "2169-2289",
				"abstractNote": "This study investigates the origin, transmission, and reception of two hadith with doctrinal significance on the formation of early Sunni identity and memory of the past—the Mountain hadith, in which the Prophet designates each of the first three caliphs as either a saint or a martyr; and the Ten Promised Paradise hadith, which names the first four caliphs and another five or six Companions as the future residents of paradise. The study identifies Qatāda b. Diʿāma and Hilāl b. Yasāf as the earliest transmitters of both hadith. Analysis of their transmission of the Ten Promised Paradise hadith reveals the emergence of a seminal trend among Kufan traditionists, who, by advocating for an all-embracing approach to ʿUthmān, ʿAlī, and the latter’s opponents, allowed various Kufan groups to find common ground, which was also accompanied by the formation of a comprehensive historical narrative on the first fitna.",
				"issue": "4",
				"journalAbbreviation": "JAOS",
				"language": "en",
				"libraryCatalog": "lockwoodonlinejournals.com",
				"pages": "815–837",
				"publicationTitle": "JAOS",
				"rights": "Copyright (c) 2023 Journal of the American Oriental Society",
				"shortTitle": "The Martyrs on the Mountain",
				"url": "https://lockwoodonlinejournals.com/index.php/jaos/article/view/2406",
				"volume": "143",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.koersjournal.org.za/index.php/koers/article/view/2590",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Spirituality in the workplace in South Africa: : A systematic literature review",
				"creators": [
					{
						"firstName": "Marita",
						"lastName": "Heyns",
						"creatorType": "author"
					},
					{
						"firstName": "Tessa De",
						"lastName": "Wet",
						"creatorType": "author"
					},
					{
						"firstName": "Vasti",
						"lastName": "Marais-Opperman",
						"creatorType": "author"
					}
				],
				"date": "2024/06/21",
				"DOI": "10.19108/KOERS.89.1.2590",
				"ISSN": "2304-8557",
				"abstractNote": "Background: Spirituality is a multi-dimensional concept that involves a person’s pursuit of well-being through connections with oneself, others, nature, and the transcendent. Spirituality in the workplace encompasses the integration of spirituality into organisational and work dynamics Purpose: This systematic literature review sourced and synthesised empirical research evidence to explore the influence and experience of perceived spirituality in the workplace on workers in the South African workplace Methodology: The systematic literature review plan was registered on the Open Science Framework. Keyword searches were conducted, and studies were screened following the Preferred Reporting Items for Systematic Reviews and Meta-Analyses (PRISMA) process and checklist. Specific inclusion and exclusion criteria informed the second screening and review of articles. Thirty-one articles fit the specific criteria for inclusion in the review. Relevant data was extracted using thematic analysis Findings/results: The respondents in the various studies spanned public and private sectors, encompassing various professions and ethnicities. The articles reviewed indicated that the perception of spirituality in the workplace manifested in a variety of constructs and concepts, positively influencing and impacting individual, group, and organisational levels. The review indicated that nuanced contextual differences may play a role in the experience of spirituality in the South African workplace Practical implications: The literature review suggests potential constructs for understanding workplace spirituality in South Africa, with future research potential for constructing a framework fostering a pluralistic model of spirituality at work Originality/value: Understanding spirituality in the South African work context could assist in bringing about more productive and healthy organisations. Provided data also forms a basis for developing a potential framework for implementing spirituality in South African organisations  OPSOMMINGAgtergrond: Spiritualiteit is ‘n multidimensionele konsep wat die nastrewing van ‘n persoon se algemene welsyn en gesondheid omvat, wat geïntegreerdheid met die self, ander, natuur en die bomenslike insluit. Spiritualiteit in die werkplek sluit die integrasie van spiritualiteit in organisatoriese en werksdinamika in. Doel: Hierdie sistematiese literatuuroorsig het empiriese navorsingsbewyse verkry en gesintetiseer om die invloed en ervaring van waargenome spiritualiteit by die werk op werkers in die Suid-Afrikaanse werkplek te verken Metodologie: Die sistematiese literatuurstudieplan is op die Open Science Framework geregistreer. Sleutelwoordsoektogte is gedoen, en studies is gesif met behulp van die Preferred Reporting Items for Systematic Reviews and Meta-Analyses- (PRISMA) proses en -kontrolelys. Spesifieke in- en uitsluitingskriteria het die tweede sifting en keuring van artikels gelei. Een-en-dertig (31) artikels pas by die spesifieke kriteria vir insluiting in die oorsig. Relevante data is onttrek deur tematiese analise te gebruik Bevindinge/resultate: Die respondente in die verskillende studies het oor openbare en private sektore gestrek en verskeie beroepe en etnisiteite ingesluit. Die artikels wat nagegaan is, het aangedui dat die persepsie van spiritualiteit in die werkplek gemanifesteer het in ‘n verskeidenheid konstrukte en konsepte, wat individuele, groeps- en organisatoriese vlakke positief beïnvloed. Die oorsig het aangedui dat genuanseerde kontekstuele verskille ’n rol in die ervaring van spiritualiteit in die Suid-Afrikaanse werkplek kan speel Praktiese implikasies: Die literatuuroorsig stel potensiële konstrukte voor om werkplekspiritualiteit in Suid-Afrika te verstaan, met toekomstige navorsingspotensiaal vir die bou van ‘n raamwerk wat ‘n pluralistiese model van spiritualiteit by die werk bevorder Oorspronklikheid/waarde: Begrip van spiritualiteit in die Suid-Afrikaanse werkskonteks kan daartoe bydra om produktiewer en gesonder organisasies tot stand te bring. Data wat voorsien is, skep ook ‘n basis vir die ontwikkeling van ‘n potensiële raamwerk vir die implementering van spiritualiteit in Suid-Afrikaanse organisasies https://doi.org/10.19108/KOERS.89.1.259",
				"issue": "1",
				"journalAbbreviation": "Koers",
				"language": "en",
				"libraryCatalog": "www.koersjournal.org.za",
				"publicationTitle": "Koers - Bulletin for Christian Scholarship",
				"shortTitle": "Spirituality in the workplace in South Africa",
				"url": "https://www.koersjournal.org.za/index.php/koers/article/view/2590",
				"volume": "89",
				"attachments": [],
				"tags": [
					{
						"tag": "South Africa"
					},
					{
						"tag": "organisational psychology"
					},
					{
						"tag": "spirituality"
					},
					{
						"tag": "systematic literature review"
					},
					{
						"tag": "workplace"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0002-8829-9857 | Marita Heyns | taken from website"
					},
					{
						"note": "orcid:0000-0002-8513-7609 | Tessa De Wet | taken from website"
					},
					{
						"note": "orcid:0000-0003-3465-0899 | Vasti Marais-Opperman | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
