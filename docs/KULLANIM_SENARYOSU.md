# Arnavutköy CBS — Kullanım Senaryoları

> Bu belge, sistemin farklı kullanıcı tiplerinin gerçek bir işi baştan sona nasıl tamamladığını somut adımlarla anlatır. Araç/analiz/katman isimleri [KULLANIM_KILAVUZU.md](./KULLANIM_KILAVUZU.md) ile birebir örtüşür; teknik iç işleyiş için [API_VE_MIMARI.md](./API_VE_MIMARI.md) belgesine bakınız.

## İçindekiler

1. [Vatandaş — Taşınmadan önce mahalle araştırması](#senaryo-1-vatandaş--taşınmadan-önce-mahalle-araştırması)
2. [Ziyaretçi — Haritada gezinme ve mesafe ölçümü](#senaryo-2-ziyaretçi--haritada-gezinme-ve-mesafe-ölçümü)
3. [Personel — İmar uyumsuzluğu / kaçak yapı tespiti](#senaryo-3-personel--imar-uyumsuzluğu--kaçak-yapı-tespiti)
4. [Personel — Kazı ruhsatı çakışma kontrolü](#senaryo-4-personel--kazı-ruhsatı-çakışma-kontrolü)
5. [Planlamacı — Yeni tesis için yer seçimi (MCDA)](#senaryo-5-planlamacı--yeni-tesis-için-yer-seçimi-mcda)
6. [Afet yönetimi — Tahliye/toplanma kapasitesi analizi](#senaryo-6-afet-yönetimi--tahliyetoplanma-kapasitesi-analizi)
7. [Saha ekibi — Arazide GPS ile iz kaydı](#senaryo-7-saha-ekibi--arazide-gps-ile-iz-kaydı)
8. [Personel — Yeni imar verisini içe aktarma](#senaryo-8-personel--yeni-imar-verisini-içe-aktarma)
9. [Vatandaş — Beyan/vergi öncesi taşkın riski kontrolü](#senaryo-9-vatandaş--taşkın-riski-kontrolü)
10. [Sistem yöneticisi — Sıfırdan kurulum ve ilk veri yüklemesi](#senaryo-10-sistem-yöneticisi--sıfırdan-kurulum-ve-ilk-veri-yüklemesi)

---

## Senaryo 1: Vatandaş — Taşınmadan önce mahalle araştırması

**Aktör**: Arnavutköy'e taşınmayı düşünen bir vatandaş, kimliği doğrulanmamış.
**Amaç**: Adayı olan bir mahallenin deprem riski, günlük ihtiyaçlara yakınlığı ve altyapı durumunu öğrenmek.
**Ön koşul**: Giriş yapmaya gerek yok; `npm run data:build` bir kez çalıştırılmış olmalı (canlı sistemde zaten çalıştırılmıştır).

**Adımlar:**
1. Vatandaş `/rehber` adresini açar (veya ana sayfadaki bağlantıdan geçer).
2. Üstteki arama kutusuna mahalle adının ilk birkaç harfini yazar, listeden mahalleyi seçer.
3. Sayfa, o mahallenin **genel puanını** (0–100) ve 38 mahalle arasındaki sırasını gösterir.
4. "Taşınmadan önce" kontrol listesini okur — örneğin "Bu mahallede en yakın hastaneye mesafe 3.200 m (eşik: 3.000 m)" gibi otomatik üretilmiş bir uyarı görür.
5. Dört bölüm kartını (Deprem, Erişim, Hizmet, Altyapı) inceleyerek hangi alt puanın düşük olduğunu anlar.
6. Kararını desteklemek için "Karneyi PDF indir" düğmesine basar, dosyayı bilgisayarına kaydeder.
7. Merak ettiği başka bir mahalleyi de aynı şekilde karşılaştırmak için arama kutusundan yeni bir seçim yapar (sayfa yeniden yüklenmeden anında güncellenir).

**Sonuç**: Vatandaş, resmî bir imar/tapu belgesi olmayan ama İBB açık verisine dayanan somut göstergelerle bilgilenmiş bir karar verir; PDF'i saklayarak veya paylaşarak karşılaştırma yapabilir.

---

## Senaryo 2: Ziyaretçi — Haritada gezinme ve mesafe ölçümü

**Aktör**: Belirli bir arsanın yola olan mesafesini öğrenmek isteyen bir ziyaretçi (vatandaş, mütehahit, emlakçı).
**Amaç**: Haritada ilgilendiği bölgeyi bulmak, çevresindeki hizmetleri görmek, iki nokta arası mesafeyi ölçmek.

**Adımlar:**
1. Ana sayfayı (`/`) açar; harita otomatik olarak Arnavutköy sınırlarını gösterecek şekilde ortalanmıştır.
2. Arama kutusuna adres/mahalle adı yazar, sonuçlardan birine tıklayarak haritayı o konuma götürür.
3. **Katmanlar** panelinden "Binalar", "Yollar", "Sağlık kurumları" ve "Park ve bahçeler" katmanlarını açar.
4. **Araçlar** panelinden **Ölçüm** aracını seçer, "Çizgi" modunu işaretler.
5. Arsanın köşesine tıklar, en yakın yol kenarına kadar ikinci bir nokta ekler, çift tıklayarak ölçümü bitirir.
6. Ekranda beliren mesafe etiketini (ör. "42 m") not eder.
7. Merak ettiği bir binaya **Bilgi** aracıyla tıklayarak yapı katı sayısı ve alan bilgisini görür.
8. **Paylaş** aracına geçip mevcut görünümü kopyalar, bağlantıyı bir arkadaşına gönderir.

**Sonuç**: Ziyaretçi, hiçbir hesap açmadan, tamamen kamuya açık katman ve araçlarla somut bir mesafe ölçümü ve konum paylaşımı yapar.

---

## Senaryo 3: Personel — İmar uyumsuzluğu / kaçak yapı tespiti

**Aktör**: İmar Müdürlüğü'nde görevli bir belediye personeli.
**Amaç**: Yeşil alan, park, orman gibi yapılaşmaya kapalı fonksiyonlu imar parsellerinde inşa edilmiş (kaçak) binaları tespit etmek.
**Ön koşul**: Personel hesabıyla giriş yapılmış olmalı; `imar_lekesi` ve `bina` tabloları Supabase'de dolu olmalı.

**Adımlar:**
1. Sağ üstten "Personel girişi" ile e-posta/şifresini girerek oturum açar; rozeti "Personel" olarak değişir.
2. **Katmanlar** panelinden "İmar planı (lekeler)" katmanını açarak genel resmi görür.
3. **Analizler** panelinden "İmar" kategorisi altındaki **İmar uyumsuzluğu / kaçak yapı** analizini genişletir.
4. "Yalnızca yapıya kapalı fonksiyonlu zonlar" seçeneğini işaretli bırakır (varsayılan) ve **Çalıştır**'a basar.
5. Harita üzerinde kırmızı dolgulu binalar (tespit edilen ihlaller) belirir; sağ panelde "kontrol edilen bina sayısı", "ihlal sayısı" ve "parselsiz bina sayısı" metrikleri görünür.
6. Şüpheli bir binaya **Bilgi** aracıyla tıklayarak parsel bilgisini ve (yetkisi varsa) denetim geçmişini kontrol eder.
7. Bulguları saha ekibine iletmek üzere **Yazdır** aracıyla haritanın anlık bir PDF çıktısını alır.

**Sonuç**: Personel, elle parsel-bina eşleştirmesi yapmadan, saniyeler içinde olası kaçak yapı adaylarını haritada işaretlenmiş olarak görür ve raporlar.

---

## Senaryo 4: Personel — Kazı ruhsatı çakışma kontrolü

**Aktör**: Fen İşleri Müdürlüğü'nde yeni bir kazı ruhsatı başvurusunu değerlendiren personel.
**Amaç**: Aynı sokakta, aynı tarih aralığında başka bir kurumun (İSKİ, İGDAŞ, BEDAŞ) zaten planlı bir kazısı olup olmadığını görmek.

**Adımlar:**
1. Personel girişi yapar.
2. **Katmanlar** panelinden "Fen işleri çalışmaları" katmanını açarak mevcut kazı ruhsatlarını haritada görür.
3. **Analizler** panelinden "İdari" kategorisi altındaki **Altyapı kazı çakışması** analizini açar.
4. Yakınlık eşiğini (varsayılan 25 m) ihtiyaca göre ayarlar (örn. dar sokaklarda 15 m'ye düşürür) ve **Çalıştır**'a basar.
5. Haritada tüm ruhsat hatları ve çakışma tespit edilen noktalarda kırmızı işaretler belirir; sağ panelde her çakışan çift için tarih örtüşmesi (gün) ve mesafe (metre) tablo halinde listelenir.
6. Yeni başvuruyla çakışan bir kayıt bulursa, ilgili kurumla koordinasyon için ilgili sıradaki bilgiyi (kurum adı, tarih aralığı) not alır.
7. Çakışma yoksa yeni ruhsatı onaylama sürecine güvenle devam eder.

**Sonuç**: Kurumlar arası kazı çakışmaları, saha ekipleri birbirinin işini bozmadan önce masabaşında tespit edilir.

> Not: Eğer henüz gerçek ruhsat verisi girilmemişse, analiz otomatik olarak 3 kayıtlık bir **demo veri seti** ile çalışır ve özet metninde bunun demo veri olduğunu açıkça belirtir — böylece personel özelliği canlı veri girilmeden önce de test edebilir.

---

## Senaryo 5: Planlamacı — Yeni tesis için yer seçimi (MCDA)

**Aktör**: Yeni bir sağlık ocağı veya park için uygun arazi arayan bir şehir planlamacısı (kamu erişimiyle de kullanılabilir).
**Amaç**: Düşük eğimli, yola ve mevcut hizmetlere yakın, aşırı yoğun yapılaşmadan uzak bir aday alan bulmak.

**Adımlar:**
1. **Analizler** panelinden "Mekânsal" kategorisi altındaki **Uygun yer seçimi (MCDA)** analizini açar.
2. Izgara hücre boyutunu (ör. 300 m) seçer.
3. Dört ağırlık kaydırıcısını ihtiyaca göre ayarlar — örneğin "yola yakınlık" ve "eğim" ağırlığını yükseltip "bina yoğunluğundan uzaklık"ı orta düzeyde bırakır.
4. Gösterilecek aday sayısını (örn. 10) belirler ve **Çalıştır**'a basar.
5. Harita üzerinde hücreler 0–100 arası bir renk skalasında (choropleth) boyanır; en yüksek skorlu hücrelerde nokta işaretçiler belirir.
6. Sağ paneldeki aday tablosunu skora göre inceler, en iyi 2-3 adayı harita üzerinde yakınlaştırarak çevresini (mevcut yol, bina, arazi kullanımı katmanlarını açarak) gözle kontrol eder.
7. Ağırlıkları değiştirip analizi tekrar çalıştırarak duyarlılık (sensitivity) karşılaştırması yapar.

**Sonuç**: Öznel "bence burası uygun" değerlendirmesi yerine, birden fazla kritere dayalı, tekrarlanabilir ve ağırlıkları şeffaf bir sıralama elde edilir.

---

## Senaryo 6: Afet yönetimi — Tahliye/toplanma kapasitesi analizi

**Aktör**: Afet ve Acil Durum Müdürlüğü'nde tahliye planlaması yapan bir görevli.
**Amaç**: Hangi mahallelerde resmî deprem senaryosuna göre beklenen geçici barınma ihtiyacının, mevcut toplanma alanı kapasitesini aştığını görmek.

**Adımlar:**
1. **Katmanlar** panelinden "Afet acil — toplanma alanları" katmanını açarak mevcut alanları haritada görür.
2. **Analizler** panelinden "Afet" kategorisi altındaki **Afet tahliye planı** analizini açar.
3. "Yalnızca açığı olan mahalleleri göster" seçeneğini işaretli bırakır ve **Çalıştır**'a basar.
4. Bu analiz haritada bir katman göstermez; bunun yerine sağ panelde mahalle bazında **ihtiyaç vs. kapasite** çubuk grafiği ve bir tablo (mahalle, ihtiyaç, kapasite, açık, karşılanma oranı) belirir.
5. En büyük açığa sahip ilk birkaç mahalleyi not alır — bunlar yeni toplanma alanı açılması gereken öncelikli bölgelerdir.
6. Bulguyu, yeni bir toplanma alanı için uygun yer aramak amacıyla **Senaryo 5**'teki uygun yer seçimi analiziyle birleştirebilir (ör. o mahallede/civarında yeni MCDA çalıştırarak).

**Sonuç**: Kıt kaynak (toplanma alanı) önceliklendirmesi, sezgi yerine resmî deprem senaryosu verisine dayalı, sayısal bir gerekçeyle yapılır.

---

## Senaryo 7: Saha ekibi — Arazide GPS ile iz kaydı

**Aktör**: Sahada yürüyerek bir bölgeyi kontrol eden (ör. zemin etüdü, altyapı denetimi) bir saha ekibi üyesi, telefonuyla.
**Amaç**: Yürüdüğü güzergâhı kaydetmek ve rapora eklemek.

**Adımlar:**
1. Telefonda tarayıcıdan (veya kurulu PWA'dan) uygulamayı açar, **Saha modu** aracını seçer.
2. "Canlı" modu seçer; tarayıcı konum/pusula izni ister, izin verir (iOS'ta ayrı bir "hareket & yön" izni de onaylanır).
3. Doğruluk eşiğini (ör. 20 m) ve pusula filtre ağırlığını ayarlar.
4. "Kaydet" anahtarını açar ve yürümeye başlar; harita üzerinde canlı iz çizgisi ve yön konisi belirir.
5. Yürüyüş bitince kaydı durdurur; iz haritada kalır, gerekirse **Çizim** aracına aktarıp GeoJSON olarak dışa aktarabilir.
6. Ofise döndüğünde masaüstünden aynı işlemi **Ölçüm** aracıyla tekrar kontrol edebilir (iz üzerinden mesafe doğrulaması).

**Sonuç**: Saha ekibi, kâğıt harita veya ayrı bir GPS cihazı olmadan, doğrudan aynı sisteme entegre bir iz kaydı üretir.

> Not: Masaüstü bilgisayarda gerçek GNSS/IMU donanımı olmadığından, aracı "Tekrar oynatma" (sentetik iz) modunda test etmek/demo yapmak da mümkündür.

---

## Senaryo 8: Personel — Yeni imar verisini içe aktarma

**Aktör**: İmar Müdürlüğü'nde encümen kararıyla onaylanan yeni bir imar uygulama alanını sisteme işleyen personel.
**Amaç**: Elindeki GeoJSON dosyasını doğrudan veritabanına toplu olarak yüklemek.

**Adımlar:**
1. Personel girişi yapar.
2. **Araçlar** panelinden **Veri içe aktar** aracını açar.
3. Hedef tablo olarak "İmar uygulama alanı"nı seçer.
4. Bilgisayarından hazırladığı `.geojson` dosyasını seçer.
5. Uygulama dosyayı okuyup önizler; geometrisi olmayan veya zorunlu alanı eksik olan kayıtları otomatik sayarak ayıklar.
6. "İçe aktar" düğmesine basar; 500'lük gruplar halinde Supabase'e yazılır.
7. İşlem sonunda "X kayıt yazıldı, Y kayıt geometri eksikliğinden, Z kayıt zorunlu alan eksikliğinden atlandı" özetini görür.
8. **Katmanlar** panelinden "İmar uygulama alanları" katmanını açarak yeni verinin haritada göründüğünü doğrular.

**Sonuç**: Elle tek tek veri girişi yerine, hazırlanmış bir dosya birkaç tıkla sisteme işlenir; hatalı kayıtlar veri bütünlüğünü bozmadan raporlanarak atlanır.

---

## Senaryo 9: Vatandaş — Taşkın riski kontrolü

**Aktör**: Ev/arsa satın almadan önce taşkın riskini merak eden bir vatandaş.
**Amaç**: İlgilendiği bölgenin taşkın risk sınıfını görmek (kamu erişimiyle, giriş gerekmez).

**Adımlar:**
1. Ana sayfayı (`/`) açar, arama kutusuyla ilgilendiği bölgeye gider.
2. **Analizler** panelinden "Risk" kategorisi altındaki **Taşkın riski** analizini açar.
3. Izgara hücre boyutunu ve risk eşiğini varsayılan bırakarak **Çalıştır**'a basar.
4. Harita üzerinde hücreler mavi (düşük risk) → turuncu → kırmızı (yüksek risk) skalasında boyanır; ilgilendiği bölgenin rengini kontrol eder.
5. Sağ panelde risk sınıfı dağılım grafiğini ve "riskli hücre/bina sayısı" metriklerini inceler.
6. Aynı bölgede **Arazi** aracıyla noktasal yükselti/eğim bilgisini de teyit ederek analiz sonucunu doğrular.

**Sonuç**: Vatandaş, resmî bir taşkın haritası olmasa da, açık veri (yükselti, eğim, su hatları) üzerinden hesaplanan bir gösterge ile bilgi sahibi olur.

---

## Senaryo 10: Sistem yöneticisi — Sıfırdan kurulum ve ilk veri yüklemesi

**Aktör**: Uygulamayı ilk kez bir sunucuya/ortama kuran BT/sistem yöneticisi.
**Amaç**: Uygulamayı çalışır hale getirmek, resmî veriyi indirmek, veritabanını hazırlamak.

**Adımlar:**
1. `npm install` ile bağımlılıkları kurar.
2. `.env.example` dosyasını `.env` olarak kopyalar, Supabase proje ayarlarından `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` değerlerini girer.
3. `npx supabase link --project-ref <proje-ref>` ile Supabase CLI'ı projeye bağlar.
4. `npm run db:push` ile 6 migrasyonu (şema, audit, RLS, güvenlik sertleştirme, kent rehberi) veritabanına uygular.
5. `npm run data:build` komutuyla resmî veriyi indirip `public/data/` altına normalize eder (Nominatim, İBB CKAN, Overpass kaynaklarından); süreç sonunda her veri setinin kaç kayıt içerdiğini gösteren bir özet alır.
6. `npm run fonts` ve `npm run icons` ile yazı tiplerini ve PWA ikonlarını üretir (yalnızca bir kere gerekir).
7. `npm run build` ile üretim paketini oluşturur, `npm run preview` ile yerelde doğrular.
8. `npm run typecheck` ve `npm run test` ile (184 test) her şeyin yeşil olduğunu teyit eder.
9. `dist/` klasörünü barındırma sağlayıcısına (Vercel/Netlify/nginx) yükler; SPA geri düşüş kuralının (`vercel.json` / `public/_redirects` / nginx `try_files`) etkin olduğundan emin olur — aksi halde `/rehber` adresi doğrudan açıldığında 404 alınır.
10. Supabase Auth panelinden ilk personel/yönetici hesabını oluşturup `app_metadata.rol` alanını elle ayarlar.

**Sonuç**: Uygulama, gerçek belediye verisiyle, doğru rol atamalarıyla ve çevrimdışı çalışabilen bir PWA olarak üretime hazır hale gelir.
