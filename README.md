# 🚀 SafeRoute3D: Afet Bölgesi Otonom İKA Karar Destek Sistemi

SafeRoute3D, afet sonrası karmaşık şehir yapılarında (enkazlar, kapalı yollar) otonom İnsansız Kara Araçlarının (İKA) en verimli rotayı çizmesini ve yaralılara ulaşmasını sağlayan bir **Karar Destek Sistemi** simülasyonudur.

---

## 🏗️ Proje Mimarisi ve Paket Yapısı

Proje, **Java Spring Boot** (Backend) ve **Three.js** (3D Frontend) mimarisi üzerine kurulmuştur.

### 📂 Paket Bilgileri
* **`com.saferoute.saferoute3d.algorithm`**: Dijkstra algoritması, `Node` ve `Edge` gibi temel grafik teorisi sınıflarını içerir.
* **`com.saferoute.saferoute3d.datastructures`**: Hocanın beklentisi doğrultusunda yazılmış **Custom** (Özel) veri yapıları:
    * `CustomHashMap`: Araç verilerine O(1) hızında erişim.
    * `CustomPriorityQueue`: Acil durum görevlerinin (Heap) yönetimi.
    * `CustomStack`: LIFO mantığıyla araçların "Eve Dönüş" (Backtracking) rotası.
    * `CustomGraph`: Şehir haritasının modellenmesi.
* **`com.saferoute.saferoute3d.service`**: `VehicleService` sınıfı projenin beynidir; rota hesaplama, en yakın aracı bulma ve simülasyon döngüsünü yönetir.
* **`com.saferoute.saferoute3d.controller`**: REST API uç noktaları (`SimulationController`).
* **`com.saferoute.saferoute3d.entity`**: Veritabanı modelleri (`Vehicle`).

---

## 🛠️ Teknik Özellikler
- **Algoritma:** Dijkstra (En Kısa Yol) ile labirent benzeri sokaklarda otonom sürüş.
- **Decision Support:** Bir yaralıya tıklandığında, sahadaki tüm araçlar arasından en yakın olanın otomatik atanması.
- **Görselleştirme:** Three.js ile 40x40 genişliğinde, 25 bina bloklu gerçekçi şehir simülasyonu.
- **Haberleşme:** WebSocket (STOMP) üzerinden saniyede 1 kez telemetri güncellemesi.
- **Lombok Devre Dışı:** Uyumluluk sorunları nedeniyle tüm `Getter/Setter` metodları manuel yazılmıştır.

---

## 🚀 Kurulum ve Çalıştırma

### 1. Ön Gereksinimler
* Java 17 veya üzeri JDK.
* Maven.

### 2. Veritabanı Yapılandırması
`src/main/resources/application.properties` dosyasında yerel PostgreSQL veya H2 ayarlarını kontrol edin:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/saferoute_db
spring.datasource.username=postgres
spring.datasource.password=sifreniz
