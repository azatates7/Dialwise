# AGENTS.md — Dialwise / Rehberim: Telefon + Rehber Uygulaması (Android, React Native)

> **Uygulama adı dile göre değişir:**
> - İngilizce: **Dialwise** → `android/app/src/main/res/values/strings.xml`
> - Türkçe: **Rehberim** → `android/app/src/main/res/values-tr/strings.xml`
>
> Ad kodda sabit yazılmaz. Kod içinde ve bu dökümanda ürüne "Dialwise" denir.

## 1. Amaç

**Dialwise**, telefonun varsayılan arama ve rehber uygulamasının **yerine geçen** bir uygulamadır. Ürünün çekirdeği arama yapmak ve almak, arama geçmişi ve kişilerdir. Bu kısım Samsung Phone kadar sorunsuz çalışmalıdır.

**Arama kaydı bir artı özelliktir**, ürünün merkezi değildir:
- Kayıt kapalıyken veya mikrofon izni yokken uygulama eksiksiz bir telefon uygulamasıdır.
- Kayıtla ilgili hiçbir hata arama akışını etkileyemez.
- Kayıt arayüzü ön planda değildir: InCall ekranında tek bir buton, Recents'ta küçük bir 🎙 ikonu ve ⋮ menüsünde Records ekranı.

Kayıt motoru, mevcut **CallRecorder** projesinden (React Native, Android, offline) taşınır.

- Alt sekmeler: **Keypad · Recents · Contacts**
- Sağ üstte **⋮** menüsü: **Records** (ses kayıtları) ve **Settings**
- Görsel ve akış referansı: **Samsung Phone (One UI)** uygulaması
- Platform: şimdilik yalnızca Android. iOS kapsam dışı.
- Tamamen offline. Ağ çağrısı yok, bulut yok, analitik yok.

---

## 2. Temel kararlar ve gerekçeleri

| Karar | Gerekçe |
|---|---|
| Uygulama `ROLE_DIALER` (varsayılan telefon uygulaması) rolünü ister | Aramayı yönetmek için `InCallService` gerekir. Play'in Call Log politikası, `READ_CALL_LOG` iznini varsayılan telefon uygulamasına tanır. Play sürümünden çıkarılan özellikler böylece meşru şekilde geri gelir. |
| `minSdkVersion 29` (Android 10) | `RoleManager` API 29'da geldi. Daha eski sürümleri desteklemek, ayrı bir kod yolu ve ayrı kayıt davranışı demek. |
| Arama kontrolü ve kayıt **native (Kotlin)** katmanında yapılır, UI React Native'de | JS bağlamı ölüyken de gelen arama yakalanmalı ve kayıt sürmeli. JS yalnızca görüntüleme ve komut katmanıdır. |
| Zil sesini sistem çalar (`IN_CALL_SERVICE_RINGING = false`) | Zil, titreşim ve DND mantığını yeniden yazmamak için. |
| Kişi ekleme ve düzenleme **sistemin kişi editörüyle** yapılır (`ACTION_INSERT` / `ACTION_EDIT`) | Kişi editörü yazmak büyük ve hataya açık bir iş. Ayrıca `WRITE_CONTACTS` izni gerekmez. |
| Recents verisi **sistem arama geçmişinden** (`CallLog.Calls`) okunur | Tek doğru kaynak sistemdir. Uygulama yalnızca kayıt meta verisini kendi veritabanında tutar. |
| **Dil sistemden gelir:** Türkçe ve İngilizce. Uygulama içinde dil seçimi yok. | Telefon uygulaması sistemin bir parçası gibi davranmalı. Ayrı bir dil ayarı, kullanıcının yönetmesi gereken ikinci bir şey olur. Sistem dili Türkçe ise Türkçe, diğer tüm dillerde İngilizce. |
| **Tema sistemden gelir:** aydınlık ve karanlık. Uygulama içinde tema seçimi yok. | Aynı gerekçe. Sistem teması değişince uygulama yeniden başlatılmadan anında güncellenir. |
| Dil ve tema altyapısı **Faz 1'de** kurulur | Sonradan eklemek, yazılmış her ekrana geri dönüp sabit metinleri ve renkleri ayıklamak demek. Baştan kurmanın maliyeti düşük. |
| Accessibility service **kullanılmaz** | Play, kayıt amaçlı accessibility kullanımını yasaklıyor. Play sürümünde zaten çıkarıldı, öyle kalacak. |
| **Ayrı uygulama, yeni `applicationId`:** `com.azatates.dialwise` (yayından sonra değiştirilemez) | Dialwise bir telefon uygulaması, CallRecorder ise bir kayıt uygulaması. Aynı Play kaydını kullanırlarsa mevcut yorumlar, kategori ve izin beyanları yeni ürünle uyuşmaz. Telefon uygulaması rolü ve arama geçmişi izni beyanı da yayındaki CallRecorder'ı riske atmamalı. CallRecorder kendi başına ayrı bir uygulama olarak kalır. |

---

## 3. Faz 0 — Mevcut kodu incele (KOD YAZMADAN ÖNCE)

Dialwise yeni bir depodur. Kayıt motoru mevcut CallRecorder deposundan **kopyalanarak** alınır. CallRecorder deposu değiştirilmez.

Ajan, CallRecorder deposunu inceleyip bulgularını Dialwise deposundaki `docs/existing-recorder.md` dosyasına yazar:

1. Proje bare React Native mi, Expo (prebuild / dev client) mı? RN sürümü ne?
2. Kayıt nasıl başlatılıyor ve durduruluyor? Tetikleyici ne (`PhoneStateListener` / `TelephonyCallback` / broadcast)?
3. Kullanılan `AudioSource`, encoder, dosya formatı ve kayıt klasörü.
4. Foreground service tipi ve bildirim yapısı.
5. Kayıt listesi ve oynatıcı nasıl yapılmış, hangi kütüphaneler var?
6. Ayarlar nerede tutuluyor (AsyncStorage, MMKV, SQLite)?

**Kural:** Kayıt motoru (encoder, dosya adlandırma, oynatıcı) **yeniden yazılmaz, taşınır**. Değişen tek şey tetikleyicidir: telefon durumu dinleyicisinin yerini `InCallService` callback'leri alır. Eski dinleyici Dialwise'ya taşınmaz.

Faz 0'da yalnızca inceleme yapılır. Kayıt kodunun taşınması Faz 4'te yapılır (bkz. Bölüm 10).

---

## 4. Mimari

```
┌──────────────────────────── React Native (TS) ────────────────────────────┐
│  Tabs: Keypad | Recents | Contacts      ⋮ → Records, Settings             │
│  InCall ekranı (ayrı ReactActivity, component: "InCall")                  │
│        ▲ events (DeviceEventEmitter)          │ commands (NativeModules)  │
└────────┼──────────────────────────────────────┼───────────────────────────┘
         │                                      ▼
┌──────────────────────────── Native (Kotlin) ──────────────────────────────┐
│ DialerRoleModule   CallControlModule   CallLogModule   ContactsModule     │
│ RecordingsModule                                                          │
│                         CallManager (singleton, tek doğru kaynak)         │
│ PhoneInCallService ──► CallManager ──► RecorderService (FGS, mic)        │
│ CallNotificationHelper (CallStyle: incoming / ongoing)                    │
│ RecordingsDb (SQLite)                                                     │
└───────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Native bileşenler

**`PhoneInCallService : InCallService`**
- `onCallAdded` / `onCallRemoved` çağrılarında `CallManager`'a çağrı ekler ve çıkarır, `Call.Callback` kaydeder.
- Gelen aramada `CallNotificationHelper.showIncoming()` çağrılır: full-screen intent ile `InCallActivity` açılır.
- Giden aramada ve aktif aramada `InCallActivity` başlatılır.
- `onCallAudioStateChanged` ile mute, hoparlör ve Bluetooth durumu `CallManager` üzerinden JS'e iletilir.

**`CallManager` (object)**
- Aktif çağrı listesi, her çağrının durumu (`RINGING`, `DIALING`, `ACTIVE`, `HOLDING`, `DISCONNECTED`), numara, yön ve başlangıç zamanı.
- Durum geçişlerinde iki şey olur:
  - Çağrı `ACTIVE` olduğunda ve otomatik kayıt kuralı uyuyorsa `RecorderService.start(callInfo)` çağrılır.
  - `DISCONNECTED` olduğunda `RecorderService.stop()` çağrılır ve kayıt meta verisi veritabanına yazılır.
- JS bağlamı varsa event emit eder. Yoksa sessizce devam eder, JS açıldığında `getActiveCalls()` ile durumu çeker.

**`RecorderService` (foreground service — mevcut koddan taşınır)**
- `foregroundServiceType="microphone|phoneCall"`.
- Manuel başlatma ve durdurma (InCall ekranındaki kayıt butonu) ve otomatik mod aynı servisi kullanır.
- Görüşme beklemeye alınınca (hold) kayıt **durmaz**. Görüşme bitince durur.
- Aynı anda tek kayıt yapılır. Konferans ya da ikinci çağrıda mevcut kayıt sürer, yenisi açılmaz.

**`CallNotificationHelper`**
- Gelen arama: `NotificationCompat.CallStyle.forIncomingCall`, Answer/Decline butonlarıyla birlikte, full-screen intent kullanır.
- Aktif arama: `CallStyle.forOngoingCall` bildirimi, kayıt yapılıyorsa "● Kaydediliyor" metniyle.

**`InCallActivity : ReactActivity`**
- `getMainComponentName() = "InCall"`.
- `showWhenLocked`, `turnScreenOn`, `launchMode="singleInstance"`, `excludeFromRecents`.

### 4.2 JS'e açılan native API'ler

| Modül | Metotlar | Events |
|---|---|---|
| `DialerRoleModule` | `isDefaultDialer()`, `requestDefaultDialer()` | — |
| `CallControlModule` | `placeCall(number, phoneAccountId?)`, `answer(id)`, `reject(id)`, `hangup(id)`, `hold(id, bool)`, `setMuted(bool)`, `setAudioRoute('speaker'\|'earpiece'\|'bluetooth'\|'wired')`, `playDtmf(id, digit)`, `stopDtmf(id)`, `getActiveCalls()`, `getPhoneAccounts()` | `callAdded`, `callStateChanged`, `callRemoved`, `audioStateChanged` |
| `RecordingsModule` | `startManual(callId)`, `stopManual(callId)`, `isRecording()`, `list(filter, page)`, `delete(ids)`, `share(id)`, `getStorageUsage()` | `recordingStarted`, `recordingStopped` |
| `CallLogModule` | `query({type?, number?, limit, offset})`, `delete(ids)` *(opsiyonel, `WRITE_CALL_LOG` ister)*, `markMissedAsRead()` | `callLogChanged` (ContentObserver) |
| `ContactsModule` | `list({query?, limit, offset})`, `getById(id)`, `getStarred()`, `searchT9(digits)`, `openInsert(number?)`, `openEdit(id)` | `contactsChanged` (ContentObserver) |

Native tarafta dönen tüm listeler sayfalıdır. JS'e binlerce kayıt tek seferde gönderilmez.

---

## 5. Manifest ve izinler

```xml
<uses-permission android:name="android.permission.CALL_PHONE"/>
<uses-permission android:name="android.permission.READ_PHONE_STATE"/>
<uses-permission android:name="android.permission.READ_PHONE_NUMBERS"/>
<uses-permission android:name="android.permission.READ_CALL_LOG"/>
<uses-permission android:name="android.permission.WRITE_CALL_LOG"/>      <!-- yalnızca Recents'tan silme için; çıkarılabilir -->
<uses-permission android:name="android.permission.READ_CONTACTS"/>
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT"/>
```

Varsayılan telefon uygulaması rolüne aday olmak için **zorunlu** intent filter'lar (`MainActivity`):

```xml
<intent-filter>
  <action android:name="android.intent.action.DIAL"/>
  <category android:name="android.intent.category.DEFAULT"/>
</intent-filter>
<intent-filter>
  <action android:name="android.intent.action.DIAL"/>
  <action android:name="android.intent.action.VIEW"/>
  <category android:name="android.intent.category.DEFAULT"/>
  <category android:name="android.intent.category.BROWSABLE"/>
  <data android:scheme="tel"/>
</intent-filter>
```

InCallService tanımı:

```xml
<service android:name=".telecom.PhoneInCallService"
         android:permission="android.permission.BIND_INCALL_SERVICE"
         android:exported="true">
  <meta-data android:name="android.telecom.IN_CALL_SERVICE_UI" android:value="true"/>
  <meta-data android:name="android.telecom.IN_CALL_SERVICE_RINGING" android:value="false"/>
  <intent-filter><action android:name="android.telecom.InCallService"/></intent-filter>
</service>
```

- `DIAL` intent'i numara ile gelirse Keypad sekmesi açılır ve numara önceden doldurulur.
- Uygulama varsayılan telefon uygulaması değilse açılışta bir onboarding ekranı gösterilir: neden gerektiğini anlatır ve `requestDefaultDialer()` çağırır. Kullanıcı reddederse Keypad, Recents ve Contacts salt-okunur ve "sistem uygulamasıyla ara" modunda çalışır (`ACTION_CALL`). Kayıt devre dışı kalır.
- **İzin sırası:** Onboarding'de yalnızca telefon için gereken izinler istenir (rol, telefon, arama geçmişi, kişiler, bildirim). `RECORD_AUDIO` onboarding'de **istenmez**. Kullanıcı kaydı ilk kez açtığında (InCall'daki kayıt butonu veya Settings'te otomatik kayıt) istenir.

---

## 6. Ekranlar (Samsung Phone referansı)

### Ortak header
- Sol: sekme başlığı (büyük, One UI tarzı).
- Sağ: 🔍 arama ikonu (Recents ve Contacts'ta) ve **⋮** menüsü: `Records`, `Settings`.

### Keypad
- 3×4 tuş takımı. Rakamın altında harfler (ABC, DEF…). Tuşa basınca DTMF tonu çalar (ayarlardan kapatılabilir).
- Numara alanı. Backspace'e uzun basınca alan temizlenir. `0`'a uzun basınca `+` yazılır.
- Numara alanının üstünde **T9 önerileri**: girilen rakamlarla eşleşen kişiler (isim ve numara). Tek dokunuşla doldurur.
- Yeşil arama butonu. Çift SIM varsa önce SIM seçici açılır (Settings'te varsayılan SIM belirlenebilir).
- Numara kayıtlı değilse "Kişilere ekle" linki görünür (`openInsert`).

### Recents
- Bölümler: **Bugün / Dün / tarih**.
- Satır içeriği: kişi adı ya da numara, yön ikonu (gelen / giden / cevapsız; cevapsız kırmızı), SIM rozeti, saat. Kayıt varsa 🎙 ikonu.
- Satıra dokununca **satır genişler** (Samsung davranışı): `Ara`, `Mesaj`, `Detay` ve kayıt varsa `▶ Kaydı dinle`.
- Filtre: Tümü / Cevapsız.
- Sola kaydırınca mesaj, sağa kaydırınca arama (Samsung davranışı, ayarlardan kapatılabilir).

### Contacts
- En üstte arama alanı, ardından **Favoriler** (starred), sonra alfabetik liste. Sağ kenarda hızlı kaydırma indeksi. İndeks ve sıralama dile göre değişir (bkz. Bölüm 6.1).
- Kişi detay sayfası: numaralar (her biri için ara ve mesaj), `Düzenle` (sistem editörü), bu kişiyle **son aramalar** ve **bu kişinin kayıtları**.
- `+` FAB ile yeni kişi (sistem editörü).

### InCall (ayrı activity)
- Üstte isim ya da numara, durum (Aranıyor / Çalıyor / süre sayacı) ve kayıt yapılıyorsa ● REC göstergesi.
- Butonlar: `Hoparlör`, `Sessiz`, `Tuş takımı`, `Beklet`, `Bluetooth` (bağlıysa) ve `Kayıt` (toggle). Samsung düzenine uygun olarak kayıt butonu da diğerleriyle aynı ızgarada durur, öne çıkarılmaz.
- Kırmızı kapatma butonu.
- Gelen aramada: Cevapla / Reddet (kaydırma veya buton).

### Records (⋮ → Records)
- Tarihe göre gruplu liste. Her satırda kişi adı ya da numara, yön, süre, tarih ve dosya boyutu.
- Satıra dokununca satır içi oynatıcı açılır: oynat/duraklat, seek bar, süre.
- Uzun basınca çoklu seçim: sil, paylaş.
- Arama (isim / numara) ve filtre (kişi, yön).
- Silme işlemi onay ister ve hem dosyayı hem veritabanı satırını siler.
- Paylaşım `FileProvider` üzerinden yapılır.

### Settings (⋮ → Settings)
Dil ve tema ayarı **yoktur**, ikisi de sistemi takip eder (bkz. Bölüm 6.1).

**Arama**
- Varsayılan telefon uygulaması durumu ve "Ayarla" butonu.
- Varsayılan SIM.
- Keypad dokunma sesi.
- Kaydırma hareketleri.

**Arama kaydı** (ayrı bölüm, en altta)
- **Otomatik kayıt:** Kapalı (varsayılan) / Tüm aramalar / Yalnızca seçili kişiler / Kayıtlı olmayan numaralar.
- Kayıt bildirimini göster.
- Depolama kullanımı ve "X günden eski kayıtları sil" seçeneği.

---

## 6.1 Dil ve tema

### Dil (Türkçe / İngilizce)

**Kural:** Sistem dili Türkçe (`tr`) ise Türkçe, diğer tüm dillerde İngilizce. Uygulama içinde dil ayarı yoktur.

**Native taraf (Android resources):**
- `res/values/strings.xml` (İngilizce, varsayılan) ve `res/values-tr/strings.xml` (Türkçe).
- Native tarafta görünen tüm metinler buradan gelir: `app_name`, bildirim metinleri (gelen arama, aktif arama, "Kaydediliyor"), bildirim kanalı adları, foreground service bildirimi, Answer/Decline butonları.
- Bu metinleri sistem otomatik olarak doğru dilde gösterir, ek kod gerekmez.
- Kotlin kodunda kullanıcıya görünen sabit metin yazılmaz.

**JS taraf:**
- `src/i18n/en.json` ve `src/i18n/tr.json`. İki dosyanın anahtarları birebir aynı olmalı.
- Dil bilgisi `Intl.DateTimeFormat().resolvedOptions().locale` ile okunur (Hermes Intl'i destekliyor). Yeni kütüphane eklenmez. Bu yöntem cihazda çalışmazsa, mevcut native modüllerden birine `getLocale()` metodu eklenir.
- Kullanıcı uygulama açıkken sistem dilini değiştirirse: `AppState` tekrar `active` olduğunda dil yeniden okunur ve gerekirse arayüz güncellenir.
- Küçük bir `t('key')` yardımcı fonksiyonu yazılır. Çoğul ve parametre desteği için i18n kütüphanesi gerekirse önce gerekçe yazılır.

**Dile göre değişen davranışlar:**

| Konu | Türkçe | İngilizce |
|---|---|---|
| Kişi sıralaması | `Intl.Collator('tr')`: Ç, C'den sonra; İ/ı doğru | `Intl.Collator('en')` |
| Hızlı kaydırma indeksi | A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z | A–Z |
| Recents bölümleri | Bugün / Dün / `20 Kasım` | Today / Yesterday / `Nov 20` |
| Saat | 24 saat (`14:05`) | Sistem ayarına göre (12/24 saat) |
| Süre | `3 dk 12 sn` | `3m 12s` |
| Tarih ve saat biçimi | `Intl.DateTimeFormat` ile, elle biçimlendirme yok | Aynı |

- **T9 eşleştirme dilden bağımsızdır.** Tuşlardaki harfler İngilizce (ABC, DEF…) kalır. Türkçe karakterler eşleştirmeden önce karşılıklarına çevrilir: Ç→C, Ğ→G, I/İ→I, Ö→O, Ş→S, Ü→U. Böylece iki dilde de aynı tuşlar aynı kişileri bulur.
- Büyük/küçük harf dönüşümü `toLocaleUpperCase('tr')` / `toLocaleLowerCase('tr')` ile yapılır. Türkçede düz `toUpperCase` "i" harfini yanlış çevirir.
- Telefon numarası biçimlendirme dile değil, **SIM ülkesine** göre yapılır (`PhoneNumberUtils.formatNumber(number, simCountryIso)`).

### Tema (aydınlık / karanlık)

**Kural:** Tema her zaman sistemi takip eder. Uygulama içinde tema ayarı yoktur.

**JS taraf:**
- `useColorScheme()` (React Native'in kendi hook'u) ile `light` / `dark` okunur. Sistem teması değişince ekran anında güncellenir.
- `src/theme/` altında iki palet tanımlanır: `lightColors`, `darkColors`. İki paletin anahtarları birebir aynı.
- Ekranlar ve bileşenler renkleri yalnızca `useTheme()` üzerinden alır. Bileşen içinde sabit renk kodu (`#fff` gibi) yazılmaz.
- React Navigation'a da aynı palet verilir (`DefaultTheme` / `DarkTheme` üzerine).
- `StatusBar` ve navigation bar renkleri temaya göre ayarlanır.
- Renkler One UI'a benzer: aydınlıkta beyaz yüzeyler ve açık gri arka plan, karanlıkta saf siyah (OLED) arka plan ve koyu gri kartlar.

**Native taraf:**
- `styles.xml` içindeki uygulama teması `Theme.AppCompat.DayNight.NoActionBar` (veya Material3 DayNight) olur. Bu, açılışta ve `InCallActivity` açılırken beyaz ekran yanıp sönmesini önler.
- `res/values/colors.xml` ve `res/values-night/colors.xml` içinde arka plan ve bildirim renkleri tanımlanır.
- `AndroidManifest.xml` içinde `MainActivity` ve `InCallActivity` için `android:configChanges` değerinde `uiMode` bulunmalı. Böylece tema değişince activity yeniden oluşturulmaz, değişikliği RN tarafı yapar.
- Splash/açılış ekranı da iki temada doğru renkte olmalı.

## 7. Veri modeli

Uygulamanın kendi SQLite veritabanı yalnızca kayıtları ve kayıt kurallarını tutar. Arama geçmişi ve kişiler sistemden okunur.

```sql
CREATE TABLE recordings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path       TEXT NOT NULL UNIQUE,
  number_raw      TEXT,
  number_e164     TEXT,                 -- PhoneNumberUtils.formatNumberToE164(num, "TR")
  contact_lookup  TEXT,                 -- ContactsContract lookup key (nullable)
  direction       TEXT NOT NULL,        -- 'in' | 'out'
  started_at      INTEGER NOT NULL,     -- epoch ms (ACTIVE anı)
  ended_at        INTEGER,
  duration_ms     INTEGER,
  size_bytes      INTEGER,
  call_log_id     INTEGER,              -- eşleşince doldurulur
  phone_account   TEXT,
  created_at      INTEGER NOT NULL
);
CREATE INDEX idx_rec_number  ON recordings(number_e164);
CREATE INDEX idx_rec_started ON recordings(started_at);

CREATE TABLE auto_record_rules (
  contact_lookup TEXT PRIMARY KEY       -- "yalnızca seçili kişiler" modu için
);
```

- **Dosyalar:** `context.filesDir/recordings/`. Uygulamaya özel klasör olduğu için depolama izni gerekmez.
- **Dosya adı:** `yyyyMMdd_HHmmss_<numara>.m4a`. Mevcut uygulamada format farklıysa mevcut format korunur.
- **Arama geçmişiyle eşleştirme:** Sistem çağrıyı geçmişe gecikmeli yazar. `DISCONNECTED` sonrası 2 sn beklenir, `CallLog.Calls` tablosunda aynı numaraya ait ve `date` değeri `[started_at - 60sn, started_at]` aralığında olan en yeni satır aranır, bulunan `call_log_id` yazılır. Bulunamazsa 3 kez tekrar denenir, yine olmazsa `null` kalır. Recents ekranı o zaman numara ve zaman penceresiyle eşleştirir.
- **CallRecorder'daki eski kayıtlar:** Dialwise ayrı bir uygulama olduğu için CallRecorder'ın kendi klasöründeki dosyalara erişemez. Bu kayıtlar taşınmaz. Dialwise yalnızca kendi yaptığı kayıtları listeler.

---

## 8. Çağrı ve kayıt akışı

```
callAdded(RINGING|DIALING)
   └─► notification / InCallActivity
ACTIVE
   ├─► autoRecord kuralı uyuyor mu? → RecorderService.start()
   └─► kullanıcı Kayıt butonuna basabilir → start/stop (manuel)
HOLDING ↔ ACTIVE        (kayıt devam eder)
DISCONNECTED
   ├─► RecorderService.stop() → DB insert
   ├─► call_log eşleştirme (gecikmeli)
   └─► InCallActivity kapanır, notification iptal
```

Kenar durumlar:
- **İkinci gelen arama (call waiting):** InCall ekranında "Beklet ve cevapla" ve "Sonlandır ve cevapla" seçenekleri. Kayıt ilk aramaya bağlı kalır.
- **Acil aramalar:** Uygulama acil aramaya hiçbir koşulda müdahale etmez ve engellemez. `placeCall` çağrısı numarayı filtrelemez.
- **Mikrofon izni yoksa:** Arama normal sürer. Kayıt başlamaz, bildirim ile izin istenir.
- **Kayıt hatası** (mikrofon meşgul, encoder hatası): Arama asla etkilenmez. Hata loglanır, kullanıcıya bildirim gösterilir.

---

## 9. JS klasör yapısı

```
src/
  app/            navigation (BottomTabs + Stack), InCall root
  screens/
    keypad/  recents/  contacts/  contactDetail/  records/  settings/  incall/  onboarding/
  components/     Header, OverflowMenu, CallRow, ContactRow, AlphabetIndex, AudioPlayer, SimPicker
  native/         typed wrapper'lar (DialerRole.ts, CallControl.ts, Recordings.ts, CallLog.ts, Contacts.ts)
  hooks/          useActiveCall, useCallLog, useContacts, useRecordings, useDefaultDialer
  store/          settings (mevcut çözüm neyse o)
  theme/          lightColors, darkColors, useTheme(), tipografi (One UI benzeri)
  i18n/           en.json, tr.json, t(), locale okuma, tarih/süre biçimlendirme, collator
android/app/src/main/java/com/azatates/dialwise/
  telecom/        PhoneInCallService, CallManager, CallNotificationHelper, InCallActivity
  recording/      RecorderService (CallRecorder'dan taşınan), RecordingsDb
  modules/        *Module.kt + DialwisePackage.kt
```

---

## 10. Fazlar ve kabul kriterleri

Her faz ayrı bir branch'te ve ayrı PR'da yapılır. Bir faz bitmeden sonrakine geçilmez.

| Faz | Kapsam | Kabul kriteri (gerçek cihazda) |
|---|---|---|
Sıralama ürünün önceliğini yansıtır: **önce telefon uygulaması eksiksiz çalışır, kayıt en son eklenir.** Faz 1–3 sonunda uygulama kayıt olmadan da günlük kullanıma hazır olmalıdır.

| Faz | Kapsam | Kabul kriteri (gerçek cihazda) |
|---|---|---|
| **0** | CallRecorder kodunu inceleme ve `docs/existing-recorder.md` | Bölüm 3'teki 6 sorunun cevabı yazılmış |
| **1** | Dil ve tema altyapısı (Bölüm 6.1), rol, intent filter'lar, `PhoneInCallService`, `CallManager`, bildirimler, InCall ekranı (kayıt butonu hariç) | Uygulama varsayılan yapılabiliyor. Giden arama yapılıyor. Kilit ekranında ve uygulama kapalıyken gelen arama cevaplanıp reddedilebiliyor. Mute, hoparlör ve kapatma çalışıyor. Sistem dili TR/EN ve tema aydınlık/karanlık değiştirildiğinde uygulama adı, bildirimler ve InCall ekranı doğru dil ve renkte görünüyor. |
| **2** | Recents ekranı | Liste sistem arama geçmişiyle birebir. Cevapsızlar kırmızı. Genişleyen satır aksiyonları çalışıyor. |
| **3** | Contacts ve kişi detay sayfası, T9 önerileri, Keypad'in tamamı, Settings'in "Arama" bölümü | 1000+ kişiyle akıcı kaydırma. İndeks ve sıralama TR'de Türkçe alfabeye, EN'de A–Z'ye göre doğru. T9 eşleşmesi doğru (İ/ı dahil). **Bu fazın sonunda uygulama sistem telefon uygulamasının yerine günlük kullanılabilir olmalı.** |
| **4** | Kayıt: motoru CallRecorder'dan taşıma, `CallManager`'a bağlama, InCall'daki kayıt butonu, otomatik kayıt, `recordings` tablosu, call log eşleştirme, Recents'ta 🎙 ikonu | Gelen ve giden aramada kayıt oluşuyor, süre doğru. Hold sırasında kayıt kopmuyor. Kayıt kapalıyken ve mikrofon izni yokken Faz 1–3'ün tüm kabul kriterleri hâlâ geçiyor. |
| **5** | Records ekranı, oynatıcı, paylaşım, silme, kişi detayındaki kayıtlar bölümü, Settings'in "Arama kaydı" bölümü | Oynat, seek, paylaş, çoklu sil çalışıyor. Otomatik kayıt modları doğru uygulanıyor. |
| **6** | Cilalama: çift SIM, DTMF, call waiting, Bluetooth yönlendirme, boş ve hata durumları, iki dil ve iki temada tüm ekranların gözden geçirilmesi | Çift SIM'li cihazda SIM seçimi doğru. Bluetooth kulaklıkla arama ve ses yönlendirme çalışıyor. |

---

## 11. Kapsam dışı (bu sürümde YOK)

SMS, görüntülü arama, sesli mesaj (voicemail), spam engelleme ve `CallScreeningService`, transkript, bulut yedekleme, iOS, widget'lar, kişi birleştirme.

---

## 12. Cihazda doğrulanması gereken riskler

1. **Android 14+ foreground service kısıtları:** Uygulama arka plandayken gelen aramada `microphone` tipli FGS başlatılabiliyor mu? `phoneCall` tipi ve aktif `InCallService` bağlantısıyla test et. Olmazsa servis `InCallActivity` öne geldiğinde başlatılır.
2. **Karşı tarafın sesi:** Android 10+ üçüncü parti uygulamaların downlink sesini doğrudan almasına izin vermiyor. Mevcut uygulamanın `AudioSource` seçimi korunur. Hoparlör açıkken ve kapalıyken kayıt kalitesi Samsung ve en az bir başka marka cihazda karşılaştırılıp sonuç `docs/existing-recorder.md` dosyasına eklenir.
3. **OEM pil optimizasyonu** (Samsung, Xiaomi): Uygulama kapalıyken gelen arama ekranı gecikiyor mu? Gerekirse onboarding'e "pil optimizasyonundan çıkar" adımı eklenir.
4. **Arama geçmişine yazma gecikmesi:** Bölüm 7'deki tekrar deneme mantığı farklı cihazlarda test edilir.
5. **Soğuk başlatma süresi:** `InCallActivity` (RN) uygulama kapalıyken kaç ms'de açılıyor? 1,5 sn'yi aşarsa cevaplama için CallStyle bildirimi zaten yeterli. InCall ekranını native'e taşımak **ayrı bir karar** olarak kullanıcıya sorulur.
6. **Play beyanı:** Call Log ve Phone izinleri için Permissions Declaration Form'da "Default Phone handler" seçilir. Uygulamanın gerçekten tam bir telefon uygulaması olarak çalıştığı review videosunda gösterilir.

---

## 13. Kodlama kuralları

- Native kod **Kotlin**, JS kodu **TypeScript (strict)**.
- **Minimal değişiklik:** Mevcut kayıt kodunu yeniden yazma, taşı. Çalışan bir şeyi "daha temiz" olsun diye refactor etme.
- **Yeni bağımlılık** eklemeden önce PR açıklamasında gerekçe yazılır. Önce platform API'si ve mevcut kütüphaneler değerlendirilir.
- Ağ çağrısı, analitik ve reklam SDK'sı **eklenmez**.
- Accessibility service **eklenmez**.
- Arama kontrol kodunda hiçbir exception aramayı düşürmemeli. Kayıt hataları yakalanır ve loglanır, çağrı akışı sürer.
- Kullanıcıya görünen tüm metinler JS'te `src/i18n/` altında, native tarafta `strings.xml` içinde. Kodda sabit metin yazılmaz. Sistem dili Türkçe değilse İngilizce gösterilir.
- Yeni bir metin eklendiğinde **iki dile birden** eklenir. `en.json` ve `tr.json` anahtarları birebir aynı olmalı.
- Renkler yalnızca `useTheme()` üzerinden alınır. Bileşende sabit renk kodu yazılmaz.
- Native modüller için JS tarafında typed wrapper zorunlu. Ekranlar `NativeModules`'a doğrudan erişmez.

## 14. Test

- **Kotlin unit test:** `CallManager` durum geçişleri, otomatik kayıt kural değerlendirmesi, numara normalizasyonu, call log eşleştirme algoritması.
- **Jest:** T9 eşleştirme (Türkçe karakterler dahil), Recents gruplama (TR: Bugün / Dün, EN: Today / Yesterday), Records filtreleri, TR ve EN kişi sıralaması, `en.json` ile `tr.json` anahtarlarının birebir aynı olduğunu kontrol eden test.
- **Manuel dil ve tema testi:** Her ekran 4 kombinasyonda kontrol edilir: TR+aydınlık, TR+karanlık, EN+aydınlık, EN+karanlık. Uygulama açıkken sistem teması değiştirildiğinde ekran yeniden başlatılmadan güncelleniyor olmalı.
- **Manuel cihaz test listesi** (her faz sonunda `docs/test-checklist.md` güncellenir): kilit ekranında gelen arama, uygulama kapalıyken gelen arama, call waiting, hold, Bluetooth, çift SIM, uçak modu ve acil arama (yalnızca arama ekranının açıldığı doğrulanır, gerçek acil arama yapılmaz).
