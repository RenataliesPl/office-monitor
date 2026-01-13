#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <DHT.h>

// ====== KONFIGURACJA SPRZĘTU ======
#define DHTPIN         23
#define DHTTYPE        DHT11

#define PIR_PIN        22
#define REED1_PIN      32   // tylko input
#define REED2_PIN      33   // tylko input

// ====== KONFIGURACJA SIECI ======
const char* WIFI_SSID     = "";
const char* WIFI_PASSWORD = "";

// ====== KONFIGURACJA MQTT ======
const char* MQTT_BROKER   = "192.168.1.165"; // IP brokera MQTT
const uint16_t MQTT_PORT  = 1883;
const char* MQTT_CLIENT_ID = "esp32_1";

// Tematy
const char* TOPIC_TEMP_HUM   = "home/status/esp32_1";
const char* TOPIC_DOOR1      = "home/alerts/door1";
const char* TOPIC_DOOR2      = "home/alerts/door2";
const char* TOPIC_MOTION     = "home/alerts/motion1";

WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(DHTPIN, DHTTYPE);

// ====== PARAMETRY CZASOWE ======
unsigned long lastTempHumPublish = 0;
const unsigned long TEMP_HUM_INTERVAL_MS = 30000;  // co 30 s

// debounce / prosty filtr dla wejść
unsigned long lastDoor1Change = 0;
unsigned long lastDoor2Change = 0;
unsigned long lastPirChange   = 0;
const unsigned long DEBOUNCE_MS = 50;

// przechowywanie poprzednich stanów
int lastDoor1State = HIGH;
int lastDoor2State = HIGH;
int lastPirState   = LOW;

// ====== FUNKCJE POMOCNICZE ======

void connectToWiFi() {
  Serial.print("Laczenie z WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Polaczono z WiFi, IP: ");
  Serial.println(WiFi.localIP());
}

void mqttReconnect() {
  // Proba ponownego polaczenia z brokerem
  while (!mqttClient.connected()) {
    Serial.print("Laczenie z MQTT...");
    if (mqttClient.connect(MQTT_CLIENT_ID)) {
      Serial.println("OK");
      // tutaj ewentualne subskrypcje
      // mqttClient.subscribe("home/cmd/esp32_1");
    } else {
      Serial.print("Blad, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" ponowna proba za 5 s");
      delay(5000);
    }
  }
}

void mqttPublish(const char* topic, const String& payload) {
  if (!mqttClient.connected()) {
    mqttReconnect();
  }
  mqttClient.publish(topic, payload.c_str());
  Serial.print("MQTT -> ");
  Serial.print(topic);
  Serial.print(" : ");
  Serial.println(payload);
}

// callback dla odbioru (jak bedziesz kiedys subskrybowal tematy)
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("MQTT odebrano z ");
  Serial.print(topic);
  Serial.print(" : ");

  String msg;
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  Serial.println(msg);

  // tutaj logika na komendy, jesli bedziesz potrzebowal
}

// ====== SETUP ======
void setup() {
  Serial.begin(115200);
  delay(1000);

  // Piny
  pinMode(PIR_PIN, INPUT);               // wiekszosc modulow PIR ma wyjscie "HIGH = ruch"
  pinMode(REED1_PIN, INPUT_PULLUP);      // kontaktron do GND
  pinMode(REED2_PIN, INPUT_PULLUP);      // kontaktron do GND

  dht.begin();

  connectToWiFi();

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
}

// ====== PĘTLA GŁÓWNA ======
void loop() {
  // Utrzymanie polaczenia MQTT
  if (!mqttClient.connected()) {
    mqttReconnect();
  }
  mqttClient.loop();

  unsigned long now = millis();

  // ====== ODCZYT TEMPERATURY/WILGOTNOŚCI CO X SEKUND ======
  if (now - lastTempHumPublish > TEMP_HUM_INTERVAL_MS) {
    lastTempHumPublish = now;

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (isnan(h) || isnan(t)) {
      Serial.println("Blad odczytu z DHT11");
    } else {
      // prosty JSON
      String payload = "{";
      payload += "\"temp\":" + String(t, 1) + ",";
      payload += "\"hum\":"  + String(h, 1);
      payload += "}";

      mqttPublish(TOPIC_TEMP_HUM, payload);
    }
  }

  // ====== OBSŁUGA KONTAKTRONU 1 ======
  int door1State = digitalRead(REED1_PIN); // LOW = zamkniety (zwarcie do GND), HIGH = otwarty
  if (door1State != lastDoor1State && (now - lastDoor1Change) > DEBOUNCE_MS) {
    lastDoor1Change = now;
    lastDoor1State = door1State;

    String stateStr = (door1State == LOW) ? "CLOSED" : "OPEN";
    mqttPublish(TOPIC_DOOR1, stateStr);
  }

  // ====== OBSŁUGA KONTAKTRONU 2 ======
  int door2State = digitalRead(REED2_PIN);
  if (door2State != lastDoor2State && (now - lastDoor2Change) > DEBOUNCE_MS) {
    lastDoor2Change = now;
    lastDoor2State = door2State;

    String stateStr = (door2State == LOW) ? "CLOSED" : "OPEN";
    mqttPublish(TOPIC_DOOR2, stateStr);
  }

  // ====== OBSŁUGA PIR ======
  int pirState = digitalRead(PIR_PIN); // HIGH = ruch, LOW = brak ruchu (typowo)
  if (pirState != lastPirState && (now - lastPirChange) > DEBOUNCE_MS) {
    lastPirChange = now;
    lastPirState = pirState;

    String stateStr = (pirState == HIGH) ? "MOTION" : "CLEAR";
    mqttPublish(TOPIC_MOTION, stateStr);
  }

  // drobne opoznienie, zeby nie mielic 100% CPU
  delay(10);
}