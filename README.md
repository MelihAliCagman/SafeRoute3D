# SafeRoute3D: Afet Bölgesi Otonom İKA Karar Destek Sistemi

SafeRoute3D, deprem sonrası enkaz ve kapalı yollarla dolu bir şehirde **otonom insansız kara araçlarının (İKA)** yaralılara en kısa güvenli rotadan ulaşmasını simüle eden 3 boyutlu bir **karar destek sistemidir**. Bir ders projesi kapsamında geliştirilmiştir; temel veri yapıları (HashMap, Queue, Stack, Priority Queue, BST, Set, Graph) **Java'nın hazır koleksiyonları kullanılmadan sıfırdan yazılmıştır** ve rota planlamada Dijkstra algoritması uygulanmıştır. Araçlar canlı olarak WebSocket üzerinden tarayıcıdaki Three.js sahnesine yansıtılır.

## Özellikler

- **3 boyutlu şehir simülasyonu:** Three.js ile çizilen yol ağı, binalar, enkaz alanları, tahliye noktası ve araçlar. Fare ile kamera döndürülebilir ve yakınlaştırılabilir.
- **Dijkstra ile rota planlama:** Seçilen İKA'yı seçilen yaralıya engellerden kaçınarak en kısa yoldan gönderir.
- **En yakın yaralıyı bulma:** Seçili araç için bekleyen yaralılar arasından en yakın olanı otomatik atar.
- **Kurtarma ve tahliye döngüsü:** Araç yaralıya ulaşır, ardından tahliye noktasına döner ve yeniden boşta duruma geçer.
- **Canlı telemetri:** Araç konumları backend'den WebSocket (STOMP) ile her 800 ms'de bir yayınlanır.
- **Senaryo ayarı:** Haritadaki yaralı sayısı 1–12 arasında seçilebilir.
- **Performans kıyaslaması:** Dizide doğrusal arama (O(n)) ile kendi yazdığımız `CustomHashMap` (O(1)) erişim süreleri ölçülüp tablo ve çubuk grafikle karşılaştırılır.
- **Algoritma akışı paneli:** Hangi algoritmanın ne zaman çalıştığı arayüzde adım adım gösterilir.

## Mimari

```
Tarayıcı (Three.js + SockJS/STOMP)
        │  REST (/api/simulation/**)      WebSocket (/ws-saferoute → /topic/vehicles)
        ▼
Spring Boot Backend
 ├── controller/   SimulationController      REST uç noktaları
 ├── service/      VehicleService            Harita, rota, simülasyon döngüsü
 ├── algorithm/    DijkstraAlgorithm, Node, Edge
 ├── datastructures/  CustomHashMap, CustomQueue, CustomStack,
 │                    CustomPriorityQueue, CustomBST, CustomSet, CustomGraph
 ├── entity/ + repository/   Vehicle (JPA)
 └── config/       WebSocketConfig, CorsConfig
        │
        ▼
PostgreSQL (araç kayıtları)
```

**Harita:** 41×41 düğümlük bir ızgara üzerinde, avenue/sokak/bağlantı yollarından oluşan düzensiz bir yol ağı tanımlanır. Yol olmayan hücreler engel (bina/yıkıntı) kabul edilir. Tahliye noktası `(0, -18)` konumundadır.

**Veri yapılarının kullanımı:**

| Veri yapısı | Kullanıldığı yer |
|---|---|
| `CustomGraph` | Şehir haritasının düğüm ve kenar modeli |
| `CustomHashMap` | Aktif araçlara ID ile O(1) erişim, araç rotaları |
| `CustomQueue` | Aracın izleyeceği rota adımları (FIFO) |
| `CustomStack` | Her araç için geri dönüş rotası altyapısı |
| `CustomPriorityQueue` (heap), `CustomBST`, `CustomSet` | Uygulanmıştır; acil görev önceliklendirme ve zaman aralığı ile log filtreleme senaryoları için hazırlanmıştır (bkz. Yol Haritası) |

## REST API

| Yöntem | Uç nokta | Açıklama |
|---|---|---|
| `POST` | `/api/simulation/add-vehicle` | Tahliye noktasında yeni araç oluşturur |
| `GET` | `/api/simulation/vehicles` | Sahadaki araçları listeler |
| `GET` | `/api/simulation/map/roads` | Yol hücreleri |
| `GET` | `/api/simulation/map/obstacles` | Bina/engel hücreleri |
| `POST` | `/api/simulation/set-target/{id}?x=&z=` | Araca Dijkstra rotası atar |
| `POST` | `/api/simulation/return-to-evacuation/{id}` | Aracı tahliye noktasına döndürür |
| `GET` | `/api/simulation/closest-vehicle?x=&z=` | Hedefe en yakın boştaki aracın ID'si |
| `GET` | `/api/simulation/performance-test` | Dizi ve HashMap arama süresi karşılaştırması |

WebSocket: `/ws-saferoute` (SockJS), abonelik kanalı `/topic/vehicles`.

## Kullanılan Teknolojiler

- **Backend:** Java 17, Spring Boot 4 (Web MVC, Data JPA, WebSocket), Hibernate, PostgreSQL, Maven
- **Frontend:** Three.js (r128) + OrbitControls, SockJS, STOMP.js, saf JavaScript/HTML/CSS
- **Algoritmalar:** Dijkstra, Hash tablosu (zincirleme), Heap, İkili Arama Ağacı

## Kurulum ve Çalıştırma

### Gereksinimler
- JDK 17 veya üzeri
- PostgreSQL (yerelde çalışır durumda)
- İnternet bağlantısı (Three.js ve STOMP kütüphaneleri CDN üzerinden yüklenir)

### Adımlar

```bash
git clone https://github.com/MelihAliCagman/SafeRoute3D.git
cd SafeRoute3D
```

1. PostgreSQL'de boş bir veritabanı oluşturun:
   ```sql
   CREATE DATABASE saferoute_db;
   ```
2. Veritabanı şifrenizi ortam değişkeni olarak tanımlayın (kullanıcı adı varsayılan olarak `postgres`; farklıysa `application.properties` içinden değiştirin). Tablolar `ddl-auto=update` ile otomatik oluşur.
   ```bash
   export DB_PASSWORD=postgres_sifreniz      # Windows PowerShell: $env:DB_PASSWORD="..."
   ```
3. Uygulamayı başlatın:
   ```bash
   ./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
   ```
4. Tarayıcıda `http://localhost:8080` adresini açın.

### Kullanım

1. **Yeni Otonom Araç Ekle** ile sahaya araç indirin (tahliye noktasında başlar).
2. Açılır listelerden bir araç ve bir yaralı seçip **Seçili Aracı Yaralıya Gönder (Dijkstra)** düğmesine basın ya da **En Yakın Yaralıyı Bul** ile otomatik atama yapın.
3. Araç yaralıya ulaşınca tahliye noktasına döner. Sağ panelden algoritma akışını ve araç durumlarını izleyin.
4. **Performans Kıyasla** ile HashMap ve dizi araması süre karşılaştırmasını görün.

## Yol Haritası

- Dijkstra'da `CustomPriorityQueue` (min-heap) kullanarak karmaşıklığı O(V²)'den O(E log V)'ye indirmek
- Acil görev kuyruğu (heap), sinyal kaybında geri dönüş (stack) ve log filtreleme (BST) uç noktalarını gerçek mantıkla tamamlamak
- Birim testleri ve Docker Compose ile tek komutla kurulum
