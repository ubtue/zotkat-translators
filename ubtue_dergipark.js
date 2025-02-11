{
	"translatorID": "7a8def3f-d31d-42ca-97f8-2b3418ee328b",
	"label": "ubtue_dergipark",
	"creator": "Timotheus Kim",
	"target": "https://dergipark.org.tr/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-01-09 15:17:47"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Universitätsbibliothek Tübingen.  All rights reserved.
	
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
	if (url.includes('/1')) {
		return 'journalArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.article-title');
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
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		let parallelTitle = ZU.xpathText(doc, '//*[@id="article_en"]/*[@class="article-title"]');
		if (parallelTitle) {
			item.notes.push({'note': 'Paralleltitel:' + parallelTitle.trim()});
		}
		let abstractText = ZU.xpathText(doc, '//*[@id="article_en"]/*[@class="article-abstract data-section"]/p');
		if (item.abstractNote  && abstractText) {
			item.abstractNote += "\\n4207 " + abstractText;
		}
		let orcidAuthorEntry = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "table", " " ))]//p');
		if (orcidAuthorEntry) {
			for (let a of orcidAuthorEntry) {
				let authorTag = a.innerText.split('\n').filter(s => s.trim())[0].trim();
				if (a.innerText.match(/\d+-\d+-\d+-\d+x?/gi)) {
					let orcidTag = a.innerText.match(/\d+-\d+-\d+-\d+x?/gi);
					item.notes.push({note: 'orcid:' + a.innerText.match(/\d+-\d+-\d+-\d+x?/gi)[0] + ' | ' + authorTag + ' | taken from website'});
				}
			}
		}
		let tagEntryEng = ZU.xpathText(doc, '//*[@id="article_en"]/*[@class="article-keywords data-section"]/p');
		if (tagEntryEng) {
			let tags = tagEntryEng.split(/,/);
			for (let t in tags) {
			item.tags.push(ZU.trimInternal(tags[t]));
			}
		}
		//duplicate keywords e.g. same proper noun in both languages e.g. Altay
		item.tags = Array.from(new Set(item.tags.map(JSON.stringify))).map(JSON.parse);
		//If DC.Type.articleType is "Kitap Tanıtımı" tag as review
		if (ZU.xpathText(doc, '//meta[@name="DC.Type.articleType"]/@content') == "Kitap Tanıtımı") item.tags.push('RezensionstagPica');
		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://dergipark.org.tr/tr/pub/da/issue/78000",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dergipark.org.tr/tr/pub/da/issue/78000/1273812",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Hz. Muhammed’in Sesinin Güzelliğine Dair Rivâyetler Üzerine Bir İnceleme",
				"creators": [
					{
						"firstName": "Fatih",
						"lastName": "Koca",
						"creatorType": "author"
					}
				],
				"date": "2023-06-15",
				"DOI": "10.15745/da.1273812",
				"ISSN": "1301-966X, 2602-2435",
				"abstractNote": "Güzellik kavramı mahiyeti itibarıyla göreceli olmakla birlikte güzel ses, insanlığın genel olarak ortak paydada buluştuğu bir yetenektir. Bu yetenek, insanlarda değişken düzeyde de olsa mevcuttur. Her yeteneğin eğitime ve gelişime ihtiyaç duyduğu gibi güzel ses de ayırt edilmeye, eğitilmeye, geliştirilmeye ve taltif edilmeye ihtiyaç duyar. Bu sayede güzel yaratılan insan, ses bakımından da güzele ulaşabilmelidir. Ortaya çıkan bu güzellik, insanlar üzerine dinî duyguların güçlendirilmesi yönünde bir etkiye de sahiptir. Bu yüzden insanlara yol gösterici olarak gönderilen peygamberler de tebliğlerinde mûsikînin bu etkisinden yararlanmışlardır. Hatta bazı peygamberler güzel sesi bir tebliğ yöntemi olarak kullanmalarıyla öne çıkmışlardır. Güçlü hitabet yeteneği ile güzel sesi tebliğ metodunun bir parçası hâlinde kullanan peygamberlerin son temsilcisi olarak Hz. Muhammed’in de hem kendinin güzel sesli olması hem de güzel sese verdiği ehemmiyet dikkate değerdir. Hz. Muhammed’in gerek kendinden önceki peygamberler hakkında vermiş olduğu bilgiler gerekse yaşadığı dönemin şartları itibarıyla güzel sesi merkeze alması önem arz eden başlıca konulardandır. Bu çalışmada Peygamberlerin seslerine dair hadis rivayetleri ile Hz. Peygamber’in sesinin güzelliği ve dinleyenler üzerindeki tesirine dair nakiller değerlendirilecektir. Ayrıca Hz. Peygamber’in güzel ses konusundaki tutumu ile “Hz. Peygember’in sesi” hakkında Kur’ân-ı Kerîm ayetleri ve hadis-i şerif rivayetleri arasında yer alan bilgiler, dönemin şartlarına uygun olarak mûsikî açısından incelenecektir.\\n4207 Starting from the nature of the concept of niceness, nice voice, smartness, together with the clues, is a skill that generally meets the common denominator. This ability is present in every human being, but with different levels. Just as every talent needs training and development, a nice voice needs to be distinguished, trained, developed and rewarded. In this way, a person who is created with a nice voice should be able to reach high level in terms of sound. This emerging niceness also has an effect on strengthening religious feelings on people. For this reason, the prophets sent as guides to people also benefited from this effect of music in their messages. Some prophets even came to the fore by using a nice voice as a method of communication. As the last prophet who has a nice voice as a part of the method of conveying with his strong oratory ability, Prophet Muhammad, as well as the importance he attached to a nice voice, had a lovely voice. The main issue  here isalso noteworthy that Muhammad both had a nice voice himself and the importance he gave to a nice voice. In this study, some hadith narrations about how the voices of the prophets were and the narrations about the niceness of the voice of Hz. Muhammad and its effect on the listeners will be evaluated. In addition, the verses of the Qur'an and the narrations of the Hadith about Hz. Muhammad's attitude towards person with a nice voice and \"Hz. Muhammad's voice\" will be examined in terms of musical context in accordance with the conditions of the period.",
				"issue": "64",
				"journalAbbreviation": "THE JOURNAL OF RELIGIOUS STUDIES",
				"language": "tr",
				"libraryCatalog": "dergipark.org.tr",
				"pages": "9-23",
				"publicationTitle": "Dini Araştırmalar",
				"url": "https://dergipark.org.tr/tr/pub/da/issue/78000/1273812",
				"volume": "26",
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
						"tag": "Güzel Ses"
					},
					{
						"tag": "Humanbeings"
					},
					{
						"tag": "Hz. Muhammad"
					},
					{
						"tag": "Hz. Muhammed"
					},
					{
						"tag": "Nice Voice"
					},
					{
						"tag": "Peygamberler"
					},
					{
						"tag": "Prophets"
					},
					{
						"tag": "Turkish Religious Music"
					},
					{
						"tag": "Türk Din Musikisi"
					},
					{
						"tag": "İnsan"
					}
				],
				"notes": [
					{
						"note": "translatedTitle:An Investigation on Narratives About Prophet Muhammad's Nice Voice"
					},
					{
						"note": "orcid:0000-0003-1555-0251 | Fatih KOCA | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dergipark.org.tr/tr/pub/da/issue/78000/1270655",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Buryat İnanışlarında Bir Kutsal Yer: Olkhon Adası",
				"creators": [
					{
						"firstName": "Mehmet Mustafa",
						"lastName": "Erkal",
						"creatorType": "author"
					}
				],
				"date": "2023-06-15",
				"DOI": "10.15745/da.1270655",
				"ISSN": "1301-966X, 2602-2435",
				"abstractNote": "Moğolların bir kabilesi olan ve Altay coğrafyasında yaşayan Buryatlar, tarih boyunca çeşitli dinlerle karşılaşmış bir topluluktur.Baykal Gölü, İrkutsk Özerk Bölgesi sınırları içinde olmasına rağmen Buryat topluluğu için oldukça önemli bir yere sahiptir. Geleneksel inanışlarına bağlı olan Buryat topluluğu için Baykal Gölü’nde bulunan Olkhon Adası, atalarından kalan bir miras ve kutsal yer olarak görülür. İnanışa göre Olkhon Adası, bünyesinde barındırdığı özel alanlar ile metafizik âlemle bağlantı sağlamak için kullanılan ve Buryat topluluğu için şamanik enerjinin en önemli küresel kutuplarından biri olarak kabul edilir. Çeşitli mitik öge ve efsaneleri bünyesinde barındıran Olkhon Adası Altay topluluklarına ev sahipliği yapmıştır. Olkhon Adası ile ilgili inanışlar, tarih boyunca birlikte yaşamış olan Moğol ve Türk topluluklarının ortak ögelerini göz önüne sermek ve birbirleriyle etkileşimini ortaya koyabilmek açısından değerli görülmektedir. Bu makalede Olkhon Adası’nın kutsal ile ilişkisi ve dünya kültürel mirası açısından önemi deskriptif ve karşılaştırmalı yöntemle değerlendirilmektedir. Dış dünya ile etkileşimi ve bağlantısının oldukça kısıtlı olması, Türk ve Moğol topluluklarının geleneksel inanışlarının korunması ve devam ettirmiş olması bağlamında değerlendirildiğinde Olkhon Adası, sözü edilen toplulukların inançlarının temeline inme noktasında paha biçilmez veriler sağlayacaktır.\\n4207 Buryats are a community that is a tribe of Mongols and lives in the Altay geography, has encountered various religions throughout history. Although Lake Baikal is located within the borders of the Irkutsk Autonomous Region, it has a very important place for the Buryat community. For the Buryat community, which adheres to their traditional beliefs, Olkhon Island, located in Lake Baikal, is seen as a legacy and sacred place left by their ancestors. According to the belief, Olkhon Island is considered one of the most important global poles of shamanic energy for the Buryat community, thought to provide a connection with the metaphysical realm through the special areas it contains. Olkhon Island, including various mythological elements and legends, has been home to Altay communities. Some of beliefs about Olkhon Island are considered valuable in terms of showing the common elements of the Mongolian and Turkish communities that have lived together throughout history and being able to reveal their interaction with each other. In this article, the relationship of Olkhon Island with the sacred and its importance in terms of world cultural heritage is evaluated by using descriptive and comparative methods. Olkhon Island will provide valuable data on the basis of the beliefs of the mentioned communities when evaluated in the context of their interaction and connection with the outside world being quite limited, the preservation and maintenance of the traditional beliefs of the Turkish and Mongolian communities.",
				"issue": "64",
				"journalAbbreviation": "THE JOURNAL OF RELIGIOUS STUDIES",
				"language": "tr",
				"libraryCatalog": "dergipark.org.tr",
				"pages": "25-44",
				"publicationTitle": "Dini Araştırmalar",
				"shortTitle": "Buryat İnanışlarında Bir Kutsal Yer",
				"url": "https://dergipark.org.tr/tr/pub/da/issue/78000/1270655",
				"volume": "26",
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
						"tag": "Altay"
					},
					{
						"tag": "Buryat"
					},
					{
						"tag": "Olkhon Adası"
					},
					{
						"tag": "Olkhon Island"
					},
					{
						"tag": "Shamanism"
					},
					{
						"tag": "Yakut"
					},
					{
						"tag": "Şamanizm."
					}
				],
				"notes": [
					{
						"note": "translatedTitle:A Sacred Place in Buryat Beliefs: Olkhon Island"
					},
					{
						"note": "orcid:0000-0003-1636-2463 | Mehmet Mustafa ERKAL | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dergipark.org.tr/tr/pub/da/issue/73863/1175149",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "‘Manevi İyi Oluş’ Kavramının Ortaya Çıkışı ve Tanımlanması",
				"creators": [
					{
						"firstName": "Hümeyra Nazlı",
						"lastName": "Tan",
						"creatorType": "author"
					},
					{
						"firstName": "Mualla",
						"lastName": "Yildiz",
						"creatorType": "author"
					}
				],
				"date": "2022-12-15",
				"DOI": "10.15745/da.1175149",
				"ISSN": "1301-966X, 2602-2435",
				"abstractNote": "İlk defa 1971 yılında kullanılmaya başlanan manevi iyi-oluş kavramı, günümüz din psikolojisi çalışmalarında sıklıkla kendisine atıfta bulunulan bir kavram haline gelmiştir. Bununla birlikte kavramın çerçevesini, kuramsal temellerini, etkileşim alanlarını ve gelişimini kapsayan çok yönlü çalışmalar oldukça sınırlıdır. Araştırma, bu sınırlılığı gidermek için manevi iyi-oluş kavramını tüm bu yönleriyle birlikte incelemeyi amaçlamakta ve manevi iyioluş kavramını açıklamaya yönelik yeni bir tanımlama denemesinde bulunmaktadır. Makalenin, manevi iyi-oluş literatürüne sunmak istediği önemli katkılardan biri de kavramın çerçevesini ve kuramsal temellerini ortaya koymaya çalışmasıdır. Bu çalışma temel olarak literatür araştırması yöntemiyle hazırlanmıştır. İlk önce manevi iyi-oluş kavramının semantik açıdan maneviyat ile ilişkisi ortaya konmuş ve maneviyatın “iyi-oluş”a katkıları neticesinde bu kavramın nasıl ortaya çıktığı incelenmiştir. Sonrasında kavramın içeriği, etkileşim alanları, yakından ilişkili olduğu yaklaşımları ve kuramsal temelleriyle ilgili görüşler değerlendirilmiştir. Konuyla ilgili literatürü oluşturan eserlerden bazıları da manevi iyi-oluşun etki alanlarını göstermesi ve kavramsallaşma sürecine sağladıkları katkılar açısından analitik olarak ele alınmış ve değerlendirilmiştir. Araştırmanın sonucuna göre manevi iyi-oluş, bireyin iletişimde bulunduğu maneviyat alanlarından özgün bir “iyi-oluş” duygusu üretmesidir. Maneviyatın “iyi-oluş”a katkıları, Din Psikolojisi çalışmalarında manevi iyi-oluş kavramına duyulan ihtiyacı pekiştirmektedir. Manevi iyi-oluş, bu katkıların kişiler üzerindeki özgün yansımalarını ve olumlu etkilerini tespit edebilmek ve bu “iyi-oluş” türlerini ölçebilmek amacıyla yapılan bilimsel araştırmaların kavramsal bir ifadesidir.\\n4207 \"Spiritual well-being\" was coined in 1971 and has since become a popular concept in modern psychology studies. Multidimensional investigations covering the concept's structure, theoretical foundations, interaction areas, and development, on the other hand, have been limited. In response to this scarcity, the research aims to examine the concept of \"spiritual well-being\" from all of these perspectives. It also seeks to provide a new definition of \"spiritual well-being.\" Another contribution of the study to the \"spiritual well-being\" literature is that it attempts to explain the framework and theoretical basis of the term. This study was mostly based on an analysis of relevant literature. Literature data on how the thought began and developed were gathered for this purpose. The semantical relationship between \"well-being\" and \"spirituality\" is investigated. Following that, the concept's content, areas of interaction, approaches, and theoretical foundations with which it is closely associated were defined as well as the concept's relationship with spirituality was stressed. Some works in the subject's literature have also been analytically evaluated, with a particular emphasis on their contributions to the enhanced relationship of \"spiritual well-being\" with other domains, as well as the conceptualization process of it. The research findings characterize spiritual well-being as the acquisition of well-being from spiritual areas to which individuals related. The contributions of spirituality to \"well-being\" underline the significance of \"spiritual well-being\" in the Psychology of Religion. \"Spiritual well-being\" is a concept used to determine the original reflections and good effects of these contributions on individuals, as well as to measure various types of \"well-being.\"",
				"issue": "63",
				"journalAbbreviation": "THE JOURNAL OF RELIGIOUS STUDIES",
				"language": "tr",
				"libraryCatalog": "dergipark.org.tr",
				"pages": "447-476",
				"publicationTitle": "Dini Araştırmalar",
				"url": "https://dergipark.org.tr/tr/pub/da/issue/73863/1175149",
				"volume": "25",
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
						"tag": "Din Psikolojisi"
					},
					{
						"tag": "Manevi İyi Oluş"
					},
					{
						"tag": "Maneviyat"
					},
					{
						"tag": "Psychology of Religion"
					},
					{
						"tag": "Spiritual Well-Being"
					},
					{
						"tag": "Spirituality"
					},
					{
						"tag": "Well-Being"
					},
					{
						"tag": "İyi Oluş"
					}
				],
				"notes": [
					{
						"note": "translatedTitle:The Formation and Definition of the Concept of \"Spritual Well-Being\""
					},
					{
						"note": "orcid:0000-0002-0325-7210 | Hümeyra Nazlı TAN | taken from website"
					},
					{
						"note": "orcid:0000-0003-2544-062X | Mualla YILDIZ | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dergipark.org.tr/tr/pub/da/issue/78000/1312424",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A Sociology of Religious Emotion",
				"creators": [
					{
						"firstName": "Halil",
						"lastName": "Yildiz",
						"creatorType": "author"
					}
				],
				"date": "2023-06-15",
				"ISSN": "1301-966X, 2602-2435",
				"abstractNote": "Dini duygular akademik çalışmalarda uzunca yıllar belirgin bir şekilde yer bulmamıştır. Bu durum dikkate alındığında literatürde duygulara yer açmak oldukça önemlidir. Özellikle yeni gelişmekte olan duygu sosyoloji çalışmaları ve özelde dini duygunun sosyolojik bağlamını keşfetmek için farklı çalışmalara ihtiyaç duyulmaktadır. Bu çerçevede Ole Riis ve Linda Woodhead tarafından kaleme alınan ve Oford Üniversitesi tarafından yayımlanan \"A Sociology of Religious Emotion\" (Dini Duygunun Sosyolojisi) isimli kitap duygu ve din sosyolojisi ekseninde dini duygulara yaklaşmanın önemli bir adımı olarak dikkat çekmektedir. Bu yönüyle özellikle dini duygulara dair yapılacak sosyolojik lisansüstü çalışmalar için oldukça faydalı bir çerçeve çizmektedir.",
				"issue": "64",
				"journalAbbreviation": "THE JOURNAL OF RELIGIOUS STUDIES",
				"language": "tr",
				"libraryCatalog": "dergipark.org.tr",
				"pages": "405-408",
				"publicationTitle": "Dini Araştırmalar",
				"url": "https://dergipark.org.tr/tr/pub/da/issue/78000/1312424",
				"volume": "26",
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
						"tag": "Dini Duygu"
					},
					{
						"tag": "Duygu"
					},
					{
						"tag": "Duygu Sosyolojisi"
					},
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0003-1321-2419 | Halil YILDIZ | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
