# Arnavutköy CBS — Kullanım Kılavuzu

> Bu kılavuz, uygulamayı **son kullanıcı** (ziyaretçi, belediye personeli, sistemi kuran/dağıtan kişi) gözünden anlatır. Teknik mimari detayları için [API_VE_MIMARI.md](./API_VE_MIMARI.md) belgesine bakınız.

## İçindekiler

1. [Uygulama Nedir?](#1-uygulama-nedir)
2. [Kurulum ve Çalıştırma](#2-kurulum-ve-çalıştırma)
3. [Ana Ekran Tanıtımı (`/`)](#3-ana-ekran-tanıtımı-)
4. [Katmanlarla Çalışma](#4-katmanlarla-çalışma)
5. [Araçlarla Çalışma](#5-araçlarla-çalışma)
6. [Analizlerle Çalışma](#6-analizlerle-çalışma)
7. [Personel Girişi ve Rol Farkları](#7-personel-girişi-ve-rol-farkları)
8. [Mahalle Rehberi (`/rehber`)](#8-mahalle-rehberi-rehber)
9. [Çevrimdışı Kullanım (PWA)](#9-çevrimdışı-kullanım-pwa)
10. [Sık Karşılaşılan Durumlar / Sorun Giderme](#10-sık-karşılaşılan-durumlar--sorun-giderme)
11. [Erişilebilirlik Notları](#11-erişilebilirlik-notları)

---

## 1. Uygulama Nedir?

Arnavutköy CBS, Arnavutköy Belediyesi'nin coğrafi verilerini (imar, altyapı, deprem senaryosu, kent hizmetleri, arazi/topografya) tek bir harita üzerinde bir araya getiren web tabanlı bir sistemdir. İki bölümü vardır:

- **CBS Tezgâhı** (`/`) — harita üzerinde katman açıp kapatabildiğiniz, ölçüm/analiz araçlarını kullanabildiğiniz tam teşekküllü çalışma alanı.
- **Mahalle Rehberi** (`/rehber`) — giriş yapmaya gerek kalmadan, "bu mahalleye taşınmadan önce neye dikkat etmeliyim?" sorusuna kısa bir karne ile cevap veren kamu sayfası.

Uygulama bir **tarayıcı sekmesinde** çalışır; masaüstünüze veya telefonunuza "uygulama olarak yükleyebilir", internet olmadan da (önceden ziyaret ettiyseniz) kullanabilirsiniz ([§9](#9-çevrimdışı-kullanım-pwa)).

## 2. Kurulum ve Çalıştırma

Bu bölüm, uygulamayı yerelde çalıştıracak geliştirici/sistem yöneticisi içindir. Son kullanıcı olarak yalnızca belediyenin size verdiği bağlantıyı açmanız yeterlidir.

```bash
npm install
cp .env.example .env
# .env dosyasına VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY değerlerini girin
# (boş bırakılırsa uygulama "salt-kamu" modda çalışır — bkz. §7)

npm run dev          # http://localhost:5173 üzerinde geliştirme sunucusu
```

Gerçek veriyle çalışmak için resmî veri hattını bir kez çalıştırmanız gerekir (bkz. [API_VE_MIMARI.md §15](./API_VE_MIMARI.md#15-veri-alım-hattı-ingest-pipeline)):

```bash
npm run data:build
```

Üretim derlemesi ve önizleme:

```bash
npm run build        # tsc -b && vite build → dist/
npm run preview       # üretim çıktısını yerelde sun
```

## 3. Ana Ekran Tanıtımı (`/`)

Uygulamayı açtığınızda karşınıza şunlar çıkar:

- **Sol enstrüman rayı**: katmanlar, araçlar, analizler, arama kutusu ve alt harita seçici buradan açılır.
- **Tam ekran harita**: fare tekerleği ile yakınlaştırma, sürükleyerek kaydırma, sağ tık/iki parmak ile döndürme-eğme.
- **Sol alt durum çubuğu (Antet)**: mevcut ölçek, imleç koordinatı, çözünürlük/zum, veri sürümü ve açık/koyu tema anahtarı.
- **Sağ üst kimlik doğrulama düğmesi**: ziyaretçiyseniz "Personel girişi", giriş yapmışsanız rol rozetiniz ve e-postanız.

## 4. Katmanlarla Çalışma

1. Sol raydan **Katmanlar** panelini açın.
2. Katmanlar gruplar halinde listelenir: *Altlık* (sınırlar/maskeler), *Topografya* (yükselti/eğim/bakı/gölgelendirme/kontur), *Kent* (bina/yol/su/POI/sağlık kurumu), *Altyapı* (durak/bisiklet yolu/fen işleri/projeler), *Mülkiyet* (imar, arazi kullanımı — bazıları personel girişi gerektirir), *Risk* (toplanma alanları).
3. Bir katmanın yanındaki anahtarı açarak/kapatarak haritada gösterip gizleyebilirsiniz.
4. Bazı katmanların (özellikle topografya katmanları) yanında bir **opaklık kaydırıcısı** bulunur — katmanı tamamen kapatmadan altındaki haritayı görebilirsiniz.
5. Kilit simgesiyle işaretli katmanlar (imar planı, numarataj, yol rayiç, zemin etüt, imar uygulama alanları) yalnızca personel girişiyle görünür hale gelir ([§7](#7-personel-girişi-ve-rol-farkları)).

> Aynı anda birden fazla katman açık kalabilir; katman sırası (üstte/altta boyanma) sabittir ve panelde değiştirilemez.

## 5. Araçlarla Çalışma

Sol raydan **Araçlar** panelini açın; 17 araç ikon olarak listelenir. Bir ikona tıklamak o aracın panelini açar; aynı ikona tekrar tıklamak paneli kapatır. Aynı anda yalnızca bir araç aktif olabilir.

| Araç | Nasıl kullanılır |
|---|---|
| **Bilgi** | Haritada herhangi bir binaya/yola/POI'ye/sağlık kurumuna tıklayın → sağda öznitelikler, arazi bilgisi, mahalle adı ve (varsa) geçmiş kayıtlar açılır. Bina için 2B/3B görünüm arasında geçiş yapabilirsiniz. |
| **Ölçüm** | "Çizgi" veya "Alan" modunu seçin, haritada tıklayarak nokta ekleyin, çift tık/Enter ile bitirin. Toplam mesafe/alan ve her segmentin uzunluğu gösterilir. Geri al/Temizle düğmeleriyle düzeltebilirsiniz. |
| **Tampon** | Bir nokta/çizgi/alan çizin, yarıçapı (metre) girin. İsterseniz "İlçe sınırına kırp" seçeneğini işaretleyin. Sonuç alanı ve çevresi hesaplanır. |
| **Çizim** | Serbest not/işaretleme ekleyin (nokta/çizgi/alan). "Kaydet" ile taslak listesine eklenir — araç değiştirseniz de kaybolmaz. Listeden bir taslağa odaklanabilir, silebilir veya tüm taslakları GeoJSON dosyası olarak indirebilirsiniz. |
| **Arazi** | Önce yükselti verisi indirilir (ilerleme çubuğu gösterilir, bir kere indirildikten sonra hızlı açılır). Haritaya tıklayarak yükselti/eğim/bakı okuyabilir, 3B araziyi açıp abartı oranını ayarlayabilir, kontur aralığını değiştirebilirsiniz. |
| **Yükselti profili** | Bir çizgi çizin; mesafeye karşı yükselti grafiği (yükseliş/iniş/min/maks) otomatik oluşur. |
| **Koordinat** | Ondalık (örn. `41.1234, 28.7123`) veya derece-dakika-saniye formatında koordinat girin → harita o noktaya gider ve işaretlenir. Mevcut merkez koordinatı da kopyalanabilir gösterilir. |
| **Paylaş** | Mevcut görünümü (konum, zum, açık katmanlar, alt harita) tek bir bağlantı olarak kopyalayın — bu bağlantıyı açan herkes aynı görünümü görür. |
| **Numarataj** | Mahalle seçip bina/bağımsız bölüm bilgilerini girerek 20 haneli resmî MAKS-UAVT adres kodunu üretin/doğrulayın. Harita etkileşimi gerekmez. |
| **Panorama** *(jeton gerektirir)* | Haritada sokak görünümü kapsama çizgileri belirir; bir çizgiye tıklayınca o noktadaki 360° görüntü açılır. |
| **Çalışma alanı** | Mevcut görünümü, açık katmanları ve taslaklarınızı adlandırıp kaydedin; sonra listeden seçip anında geri yükleyin. Tarayıcınızda yerel olarak saklanır. |
| **İmar planı düzenle** *(yalnızca personel)* | İmar lekesini elle çizip kaydedin — ayrıntılı anlatım aşağıda. |
| **Mahalle bilgileri** *(yalnızca personel)* | Mahalle seçin, nüfus ve hane sayısını, veri yılını ve kaynağını girin. Yüzölçümü geometriden gelir; yoğunluk ve "yoğun mu seyrek mi" sınıfı siz yazarken hesaplanır. Kaydettiğiniz an mahalle karnesindeki *tahmini* etiketi kalkar. |
| **Veri içe aktar** *(yalnızca personel)* | Bir GeoJSON dosyası seçip hedef tabloyu (imar lekesi, imar tesisi, mahalle nüfusu, proje, zemin etüt vb.) belirleyerek toplu veri yükleyin. Sonuçta kaç kaydın yazıldığı/atlandığı özetlenir. Mahalle hedefinde mevcut kayıtlar **güncellenir**, mükerrer kayıt oluşmaz. |
| **Saha modu** | Sahada telefonla kullanım için: "Canlı" modda gerçek GPS/pusula okunur; masaüstünde "Kayıt/Tekrar oynatma" modu ile örnek bir iz simüle edilir. Doğruluk eşiğini ve filtre ağırlığını ayarlayabilirsiniz. |
| **Başarım testi** | Cihazınızın CPU/GPU/depolama performansını ölçün; sonuçları Excel/JSON olarak indirip destek talebine ekleyebilirsiniz. |
| **Yazdır** | Başlık girin, yönü (yatay/dikey) seçin, "Oluştur" deyin — mevcut harita görünümü ölçek çubuğu ve kuzey oku ile A4 PDF olarak iner. |

### 5.1 İmar planı düzenle *(yalnızca personel)*

Bu araç imar verisini haritada **elle üretmenizi** sağlar — dosya içe aktarmaya gerek yoktur. Üç seviye vardır ve her seviyede kayıt ekleyip düzenleyip silebilirsiniz.

**1. Plan** — En üstteki listeden bir imar planı seçin. Yoksa **+ Yeni plan** ile açın: plan adı, ölçek (1/1000 gibi), durum (taslak / askıda / yürürlükte / iptal), onay tarihi, askı başlangıç–bitiş. Lekeler ve tesisler her zaman bir plana bağlanır. Planı silmek içindeki her şeyi de siler; araç bunu onaylatır.

**2. İmar lekesi** — *İmar lekesi* sekmesindeyken:

- **Haritaya çizerek**: haritaya tıklayarak köşe ekleyin, `Enter` bitirir, `Backspace` son köşeyi siler, `Esc` sıfırlar. Köşeleri sürükleyerek düzeltebilirsiniz.
- **Koordinat girerek**: köşe tablosuna enlem ve boylamı elle yazın. Tablo haritayla çift yönlü çalışır — haritada çizdiğiniz köşe tabloya düşer, tabloda değiştirdiğiniz koordinat haritayı anında günceller. **+ Satır ekle** ile yeni köşe açarsınız, `×` ile silersiniz. Geçersiz satır kırmızı çerçeveyle uyarır.
- **Toplu yapıştırma**: **Toplu yapıştır** düğmesiyle açılan kutuya pafta çıktısını satır satır yapıştırın. Hem ondalık derece (`41.24840, 28.65540`) hem DMS (`41°14'54.2"K 28°39'19.4"D`) okunur. Okunamayan satırlar numarasıyla bildirilir, kalanı alınır. Ondalık ayracı olarak virgül de kabul edilir (`0,30`).
- **Öznitelikler**: fonksiyon (konut, ticaret, dini tesis, eğitim… 19 seçenek), TAKS, KAKS/Emsal, Hmax, kat adedi, yapı nizamı, ada, parsel, plan notu. Alan çiziminizden otomatik hesaplanır.

Listeden mevcut bir lekeye tıklamak onu düzenlemeye alır: geometrisi çizime yüklenir, formu dolar, harita o lekeye odaklanır.

**3. Leke içi tesis** — *Leke içi tesis* sekmesine geçin ve önce üst lekeyi seçin. Sonra aynı çizim/koordinat yöntemleriyle tesisin alanını belirleyin ve künyesini girin: tür (cami, okul, kreş, sağlık ocağı, park, pazar yeri… 17 seçenek), ad, alan m², kapasite (kişi), durum, yıl, açıklama.

`Durum` alanı yıl kutusunun anlamını belirler: **Planlanan** seçiliyken "Hedef yıl", **Mevcut** ya da **Yapım aşamasında** seçiliyken "Yapım yılı" yazar. Alan kutusunu boş bırakırsanız çiziminizden hesaplanan değer kaydedilir.

Tesis üst lekenin dışına taşarsa sarı bir uyarı görürsünüz ama kayıt yine de yapılır — plan bütünlüğünü kontrol etmeniz istenir. Tesis **tamamen** lekenin dışındaysa kaydedilmez; yanlış üst lekeyi seçmiş olabilirsiniz.

**Haritada görünüm**: kaydettiğiniz leke ve tesisler künyeleriyle birlikte, çizimin tam üstünde yazılı olarak görünür:

```
Dini tesis                          Merkez Camii
Ada/Parsel 1520/7                   Cami · 1200 m² · 750 kişi
E:0.5 · T:0.25 · Hmax:24.5 · 2 kat  Planlanan · 2027
```

Tesisler duruma göre renklenir: yeşil = mevcut, sarı = yapım aşamasında, mavi = planlanan. Bu katmanları görmek için **Katmanlar → Mülkiyet** altından *İmar planı (lekeler)* ve *İmar tesisleri (leke içi)* katmanlarını açın.

## 6. Analizlerle Çalışma

1. Sol raydan **Analizler** panelini açın; analizler kategoriye göre (mekânsal, risk, ulaşım, imar, afet, idari) akordeon halinde gruplanır.
2. Bir analiz başlığına tıklayarak genişletin, parametrelerini (kaydırıcı/seçim kutusu/anahtar) ayarlayın.
3. **Çalıştır** düğmesine basın. Sonuç haritada (varsa) renkli bir katman olarak belirir; sağ panelde özet metin, sayısal göstergeler ve (varsa) tablo/grafik gösterilir.
4. **Temizle** ile analiz sonucunu haritadan kaldırabilirsiniz. Yeni bir analiz çalıştırmak öncekinin haritadaki gösterimini otomatik değiştirir.
5. Bazı analizler (imar uyumsuzluğu, kazı çakışması, beyan dışı alan) yalnızca personel girişiyle çalıştırılabilir.

Analizlerin ne işe yaradığına dair somut örnekler için bkz. [KULLANIM_SENARYOSU.md](./KULLANIM_SENARYOSU.md).

## 7. Personel Girişi ve Rol Farkları

| | Ziyaretçi (giriş yapılmamış) | Personel | Yönetici |
|---|---|---|---|
| Kamu katmanları (yol, bina, POI, sağlık, topografya, afet) | ✅ | ✅ | ✅ |
| İmar planı, imar tesisi, arazi/adres, yol rayiç, zemin etüt katmanları | ❌ | ✅ | ✅ |
| Kamu analizleri (uygunluk, taşkın, erişilebilirlik, tahliye) | ✅ | ✅ | ✅ |
| Personel analizleri (imar uyumsuzluğu, kazı çakışması, beyan dışı) | ❌ | ✅ | ✅ |
| Veri içe aktarma aracı | ❌ | ✅ | ✅ |
| İmar planı düzenleme, mahalle bilgisi girişi | ❌ | ✅ | ✅ |
| Denetim izi (audit log) görüntüleme | ❌ | ❌ | ✅ |

Giriş yapmak için sağ üstteki **"Personel girişi"** düğmesine tıklayın, kurumsal e-posta ve şifrenizi girin. Hesabınız yoksa **sistem yöneticinizle** iletişime geçin — uygulama üzerinden kendi kendine kayıt (self-servis signup) yoktur; rol ataması yalnızca sunucu tarafında yapılır.

## 8. Mahalle Rehberi (`/rehber`)

Bu sayfaya giriş yapmadan erişebilirsiniz. Ana ekrandan (Rail üzerindeki bağlantıdan) veya doğrudan `/rehber` adresinden ulaşılır.

1. Üstteki arama kutusundan bir mahalle seçin (38 mahalle listelenir, alfabetik, Türkçe karakter duyarlı arama).
2. Üstte mahallenin adı, UAVT kodu, koordinatı, **genel puanı** (0–100) ve 38 mahalle arasındaki sırası görünür.
3. "Taşınmadan önce" kontrol listesinde, eşik değerleri aşan durumlar (ör. çok sayıda ağır hasarlı bina, en yakın hastane/okulun çok uzak olması, mahallede hiç pazar yeri olmaması) otomatik olarak uyarı satırı halinde listelenir.
4. Beş bölüm kartı ayrıntıları gösterir:
   - **Nüfus ve alan**: nüfus, yüzölçümü, yoğunluk (kişi/km²), hane sayısı, hane başına kişi. Kartın sağ üstündeki rozet mahallenin **yoğun mu seyrek mi** olduğunu söyler: *Kırsal · Seyrek · Orta · Yoğun · Çok yoğun*. Altında ilçe ortalamasına göre konumu yazar ("ilçe ortalamasının 6,3 katı"). **Bu bölüm puanlanmaz ve genel puanı etkilemez** — yüksek yoğunluk objektif olarak iyi ya da kötü değildir; hizmete erişimi artırır, kişi başına açık alanı azaltır.
   - **Deprem**: İBB deprem senaryosuna göre beklenen hasar/kayıp/geçici barınma sayıları.
   - **Erişim**: en yakın hastane/eczane/okul/park/otobüs durağına düz hat mesafesi.
   - **Hizmet**: mahalledeki park, wifi noktası, geri dönüşüm noktası, pazar yeri, otobüs durağı sayısı.
   - **Altyapı**: deprem senaryosuna göre beklenen gaz/su/kanalizasyon hattı hasar sayısı.
5. **Mahalleleri karşılaştır** bölümü iki parçadan oluşur:
   - **Sıralama tablosu** — 38 mahalle tek tabloda. Sütun başlığına (nüfus, yüzölçümü, yoğunluk, genel puan, ağır hasarlı bina, hastane mesafesi) tıklayınca o göstergeye göre sıralanır, tekrar tıklayınca yön değişir. Yanındaki mini çubuklar büyüklüğü gösterir. Verisi olmayan mahalle en iyi sayılmaz, listenin sonuna düşer.
   - **Yan yana karne** — tablodan bir satıra tıklayarak mahalleyi karşılaştırmaya ekleyin (en fazla 3). Karneler sütun sütun dizilir; her satırda en iyi değer **▲** ile yeşil vurgulanır. Nüfus göstergelerinde vurgulama yapılmaz — orada "kazanan" yoktur. Sayfa açıldığında en yoğun ve en seyrek mahalle otomatik karşılaştırılır.
6. **"Haritada aç"** düğmesi, sizi seçili mahalleyi merkezleyen ana harita görünümüne götürür.
7. **"Karneyi PDF indir"** düğmesi, tüm bu bilgileri tek sayfalık bir PDF olarak indirir.

> **Nüfus değerleri şu an tahminidir.** Mahalle bazlı nüfus açık veride yayımlanmıyor (TÜİK ADNKS'nin API'si yok, İBB açık verisindeki nüfus setleri ilçe kırılımlı), bu yüzden ilçe toplamı bina yoğunluğuna göre dağıtılarak türetilmiştir. Sayfanın üstündeki sarı uyarı bunu belirtir. Sanayi ve havalimanı çevresindeki mahallelerde sapma belirgindir. Belediye personeli **Mahalle bilgileri** aracıyla gerçek TÜİK verisini girdiğinde o mahallede tahmin devre dışı kalır. Deprem, erişim, hizmet ve altyapı göstergeleri bu tahminden etkilenmez.

> Sayfanın altındaki dipnot, verinin kaynağını (İBB Açık Veri, OpenStreetMap) ve mahalle sınırlarının **yaklaşık** olduğunu, sayfanın resmî bir imar/tapu belgesi yerine geçmediğini açıkça belirtir.

## 9. Çevrimdışı Kullanım (PWA)

Uygulama bir **İlerici Web Uygulaması (PWA)**'dır:

- Tarayıcınızın adres çubuğundaki "yükle" simgesine (veya mobilde "Ana ekrana ekle") tıklayarak uygulamayı bir masaüstü/mobil uygulaması gibi kurabilirsiniz.
- Bir kez ziyaret ettiğiniz veri ve harita döşemeleri önbelleğe alınır; internet bağlantınız kesilse bile önceden gördüğünüz alanlarda çalışmaya devam eder.
- Yeni bir sürüm yayınlandığında ekranda **"Yenile" / "Sonra"** seçenekli bir bildirim belirir — uygulama sizin onayınız olmadan kendiliğinden yenilenmez, çalışmanızı kaybetme riski yoktur.

## 10. Sık Karşılaşılan Durumlar / Sorun Giderme

| Durum | Açıklama |
|---|---|
| **"Bu katman/analiz personel girişi gerektirir" mesajı** | Katman/analiz mülkiyet, imar veya tapu verisi içeriyor; personel hesabıyla giriş yapmanız gerekir ([§7](#7-personel-girişi-ve-rol-farkları)). |
| **Kurumsal katman boş / bir bildirim mesajı görünüyor** | İlgili Supabase tablosu henüz hiç veri içermiyor olabilir; bildirim hangi birimin ne zaman veri gireceğini açıklar. Uygulama çökmez, yalnızca o katmanı boş gösterir. |
| **"Personel girişi" düğmesi devre dışı** | Sunucu (Supabase) bu kurulumda yapılandırılmamış — uygulama salt-kamu modda çalışıyor demektir. Sistem yöneticinizle görüşün. |
| **Panorama aracı bir uyarı gösteriyor, harita çizgisi yok** | `VITE_MAPILLARY_TOKEN` ortam değişkeni girilmemiş. Ücretsiz bir jeton alıp sistem yöneticinize iletebilirsiniz. |
| **Saha modunda gerçek konum okunmuyor (masaüstü)** | Beklenen davranış — masaüstü bilgisayarlarda GPS/pusula donanımı yoktur. "Tekrar oynatma" modunu kullanın veya tarayıcının geliştirici araçlarından sensör simülasyonu açın. |
| **Arazi/Kontur aracı ilk açılışta yavaş** | Yükselti verisi (DEM) ilk kullanımda indirilip cihazınızda önbelleğe alınır; sonraki açılışlar anında olur. |
| **`npm run data:build` çalıştırılmadan uygulama açıldı** | Mahalle Rehberi sayfası "38 mahallenin göstergeleri hesaplanamadı, yöneticiye `npm run data:build` çalıştırmasını bildirin" mesajı gösterir — bu bir hata değil, veri hattının hiç çalıştırılmadığının işaretidir. |

## 11. Erişilebilirlik Notları

- Sol alt durum çubuğundaki güneş/ay simgesiyle **açık/koyu tema** arasında manuel geçiş yapabilirsiniz; sistem tercih değişikliği de otomatik izlenir.
- `prefers-reduced-motion` işletim sistemi ayarınız açıksa, uygulamadaki geçiş animasyonları otomatik olarak kapanır.
- Klavye ile çizim oturumlarında **Enter** ile bitirme, **Backspace** ile son noktayı geri alma, **Esc** ile sıfırlama desteklenir (Ölçüm, Tampon, Çizim, Saha, Profil araçları).
- Odak (focus) durumundaki tüm etkileşimli öğeler belirgin bir kırmızı çerçeveyle vurgulanır.
