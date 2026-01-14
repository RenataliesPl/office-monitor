# office-monitor
Projekt wdrożeniowy
## Struktura projektu
- monitor-app - Dashboard - aplikacja mobilna
- monitor-back - RESTFull API zarządzające całością (odczyt kolejki, kamer zdarzeń, API dla Dashboard)
- monitor-iot - oprogramowanie czujników podłączonych do ESP32
- mosquitto - ustawienia kolejki MQTT (Docker)
- monitor-web - Dashboard - wersja webowa
## Instalacja i uruchomienie
### 1. Mosquitto 
W katalogu mosquitto znajdują się pliki konfiguracyjne Eclipse-Mosquitto (MQTT) w Dockerze. Aby uruchomić wydajemy polecenie:
`docker compose up -d`
Mosquitto nasłuchuje na localhost:1883
### 2. IOT
W katalogu monitor-iot znajduje się szkic, który należy wgrać na ESP32. Wcześniej w pliku main.cpp należy skonfigurować
swoje lokalne WiFi oraz MQTT (Docker Mosquitto)
```
// ====== KONFIGURACJA SIECI ======
const char* WIFI_SSID     = "sid";
const char* WIFI_PASSWORD = "password";

// ====== KONFIGURACJA MQTT ======
const char* MQTT_BROKER   = "192.168.1.166"; // IP brokera MQTT
const uint16_t MQTT_PORT  = 1883;
const char* MQTT_CLIENT_ID = "esp32_1";
```
Projekt można otworzyć w Platformio. Do naszego ESP podłączamy dwa kontaktrony (symulujące drzwi i okno) pod piny 
D32 i D33, czujnik ruchu pod pin D22 oraz Czujnik temperatury i wilgotności DHT11 pod D23.
Szkic kompilujemy i wgrywamy na ESP.
### 3. Backend
Backend zczytuje statusy i zdarzenia z kolejki MQTT, zapisuje historie zdarzeń oraz wystawia WebSocket dla aplikacji 
frontendowych. Napisany w Javie / SpringBoot 4.0. 
#### Konfiguracja
W pliku docker-compose.yml konfiguracja bazy danych PostgreSql w Dockerze. Te same dane są w 
src/main/resources/application.properties
```
spring.datasource.driver-class-name=org.postgresql.Driver
spring.datasource.url=jdbc:postgresql://localhost:5432/monitordb
spring.datasource.username=monitoruser
spring.datasource.password=monitorpassword
```
Dodatkowo konfiguracja brokera MQTT w application.properties
```
mqtt.broker=tcp://192.168.1.166:1883
mqtt.client-id=spring-mqtt-backend
```
Uruchamiamy docker-compose.yml to spowoduje postawienie bazy danych postgres a następnie uruchamiamy aplikację.
Aplikacja wystartuje na localhost:8080/ 
Dostępne API
/api/status - wyświetla statusy (temperatura/wilgotnośc z czujnika)
/api/events - wyświetla zdarzenia (otwarcie/zamknięcie okna/drzwi, ruch z czujnika)
### Payload
Przykładowy payload dla /api/events
```
  {
    "id": 79,
    "payload": "CLEAR",
    "sensor": "motion1",
    "timestamp": "2026-01-14T12:44:26.50456",
    "type": "CLEAR"
  }
```
Przykładowy payload dla /api/status
```
[
  {
    "humidity": 33,
    "id": "esp32_1",
    "lastUpdated": "2026-01-14T12:38:37.875725",
    "temperature": 22.3
  }
]
```
## Autorzy