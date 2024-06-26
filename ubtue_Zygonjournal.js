{
	"translatorID": "f70a21c9-f867-474a-97a6-bbb9ad723ddb",
	"label": "ubtue_Zygonjournal",
	"creator": "Timotheus Kim",
	"target": "zygonjournal.org",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-06-26 14:05:08"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2024 Universitätsbibliothek Tübingen

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but without any WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero. If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
    if (url.includes('/article/')) {
        return 'journalArticle';
    } else if (getSearchResults(doc, true)) {
        return 'multiple';
    }
    return false;
}

function getSearchResults(doc, checkOnly) {
    var items = {};
    var found = false;
    var rows = doc.querySelectorAll('a[href*="/article/"]');
    for (let row of rows) {
        let href = row.href;
        let title = ZU.trimInternal(row.textContent);
        if (!href || !title) continue;
        if (checkOnly) return true;
        found = true;
        items[href] = title;
    }
    return found ? items : false;
}

async function doWeb(doc, url) {
    if (detectWeb(doc, url) == 'multiple') {
        let items = await Zotero.selectItems(getSearchResults(doc, false));
        if (!items) return;
        for (let url of Object.keys(items)) {
            await scrape(await requestDocument(url));
        }
    } else {
        await scrape(doc, url);
    }
}

async function scrape(doc, url = doc.location.href) {
    let translator = Zotero.loadTranslator('web');
    translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
    translator.setDocument(doc);
    
    translator.setHandler('itemDone', (_obj, item) => {
        item.title = titleCase(item.title); // Apply title case
		let reviewTag = ZU.xpathText(doc, "//div[@id='article_opener']//small[contains(text(), 'Reviews')]");//Z.debug(reviewTag)
        if (reviewTag && reviewTag.includes("Reviews")) item.tags.push('RezensionstagPica');
		for (let i in item.tags) { // Capitalize tags
			item.tags[i] = item.tags[i].charAt(0).toUpperCase() + item.tags[i].substring(1);
		}
		item.complete();
    });

    let em = await translator.getTranslatorObject();
    em.itemType = 'journalArticle';

    await em.doWeb(doc, url);
}

function titleCase(title) {
    const smallWords = /^(a|an|and|as|at|but|by|for|if|in|nor|of|on|or|so|the|to|up|yet)$/i;
    return title.split(' ').map((word, index, array) => {
        if (
            word.match(smallWords) &&
            index !== 0 &&
            index !== array.length - 1
        ) {
            return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.zygonjournal.org/issue/1177/info/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.zygonjournal.org/article/id/14963/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Religion, Spirituality, and Mental Health Among Scientists During the Pandemic: a Four‐country Study",
				"creators": [
					{
						"firstName": "Di",
						"lastName": "Di",
						"creatorType": "author"
					},
					{
						"firstName": "Stephen",
						"lastName": "Cranney",
						"creatorType": "author"
					},
					{
						"firstName": "Brandon",
						"lastName": "Vaidyanathan",
						"creatorType": "author"
					},
					{
						"firstName": "Caitlin Anne",
						"lastName": "Fitzgerald",
						"creatorType": "author"
					}
				],
				"date": "2023-12-02",
				"DOI": "10.1111/zygo.12912",
				"ISSN": "1467-9744",
				"abstractNote": "A vast body of research shows largely positive associations between religiosity/spirituality (R/S) and positive well‐being outcomes. Such research has examined religious communities and general populations, but little is known about the relationship between R/S and well‐being among scientists, who typically tend to be less religious than the general public. Drawing on nationally representative survey data on physicists and biologists in India, Italy, the United Kingdom, and the United States (N = 3442), this study examines whether the relationship between R/S and mental health holds for scientists, particularly during the COVID‐19 pandemic. We find that net of statistical controls, higher levels of religious and spiritual commitment are associated with significantly higher levels of well‐being and lower levels of psychological distress. Overall, the results indicate that a positive relationship between R/S and mental health holds even for scientists. The study's findings have implications for future analysis of the relationship between R/S and the well‐being of people working in other professions.",
				"issue": "4",
				"language": "None",
				"libraryCatalog": "www.zygonjournal.org",
				"publicationTitle": "Zygon: Journal of Religion and Science",
				"shortTitle": "Religion, Spirituality, and Mental Health Among Scientists During the Pandemic",
				"url": "https://www.zygonjournal.org/article/id/14963/",
				"volume": "58",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Academic science"
					},
					{
						"tag": "Cross‐national study"
					},
					{
						"tag": "Health"
					},
					{
						"tag": "Religion"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.zygonjournal.org/article/id/14947/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Gut: a Black Atlantic Alimentary Tract. by Elizabethpérez. Cambridge: Cambridge University Press, 2022. 75 Pages. $22.00 (paper).",
				"creators": [
					{
						"firstName": "Mladen",
						"lastName": "Turk",
						"creatorType": "author"
					}
				],
				"date": "2023-12-02",
				"DOI": "10.1111/zygo.12929",
				"ISSN": "1467-9744",
				"abstractNote": "&nbsp;",
				"issue": "4",
				"language": "None",
				"libraryCatalog": "www.zygonjournal.org",
				"publicationTitle": "Zygon: Journal of Religion and Science",
				"shortTitle": "The Gut",
				"url": "https://www.zygonjournal.org/article/id/14947/",
				"volume": "58",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
