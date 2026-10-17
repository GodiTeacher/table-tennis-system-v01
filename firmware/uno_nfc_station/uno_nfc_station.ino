#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SoftwareSerial.h>
#include <PN532_I2C.h>
#include <PN532.h>
#include <NfcAdapter.h>

// NFC Self-Service Station V1
// Target hardware:
// - Arduino UNO
// - PN532 V3 in I2C mode
// - LCD2004 + PCF8574 in I2C mode
// - ESP8266 V3 bridge through SoftwareSerial

LiquidCrystal_I2C lcd(0x27, 20, 4);
SoftwareSerial espSerial(10, 11); // UNO RX <- ESP TX, UNO TX -> ESP RX

PN532_I2C pn532i2c(Wire);
NfcAdapter nfc = NfcAdapter(pn532i2c);

const uint8_t LED_GREEN = 2;
const uint8_t LED_YELLOW = 3;
const uint8_t LED_RED = 4;
const uint8_t BUZZER = 5;

String lastCard = "";
unsigned long lastCardAt = 0;
const unsigned long LOCAL_REPEAT_MS = 3000;

bool networkOnline = false;

void allLedsOff() {
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_RED, LOW);
}

void showLines(const String &a, const String &b, const String &c, const String &d) {
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(a.substring(0, 20));
  lcd.setCursor(0, 1); lcd.print(b.substring(0, 20));
  lcd.setCursor(0, 2); lcd.print(c.substring(0, 20));
  lcd.setCursor(0, 3); lcd.print(d.substring(0, 20));
}

void showReady() {
  allLedsOff();
  if (networkOnline) {
    showLines("GUANYU TT", "SYSTEM ONLINE", "TAP YOUR CARD", "READY");
  } else {
    digitalWrite(LED_RED, HIGH);
    showLines("GUANYU TT", "NETWORK OFFLINE", "WAIT FOR WIFI", "");
  }
}

void beepPattern(const String &pattern) {
  if (pattern == "short") {
    digitalWrite(BUZZER, HIGH); delay(90); digitalWrite(BUZZER, LOW);
  } else if (pattern == "double") {
    for (int n = 0; n < 2; n++) {
      digitalWrite(BUZZER, HIGH); delay(80);
      digitalWrite(BUZZER, LOW); delay(90);
    }
  } else if (pattern == "long") {
    digitalWrite(BUZZER, HIGH); delay(450); digitalWrite(BUZZER, LOW);
  }
}

void setLed(const String &led) {
  allLedsOff();
  if (led == "green") digitalWrite(LED_GREEN, HIGH);
  else if (led == "yellow") digitalWrite(LED_YELLOW, HIGH);
  else if (led == "red") digitalWrite(LED_RED, HIGH);
}

String fieldAt(const String &src, int index) {
  int start = 0;
  int current = 0;
  for (int i = 0; i <= src.length(); i++) {
    if (i == src.length() || src[i] == '|') {
      if (current == index) return src.substring(start, i);
      current++;
      start = i + 1;
    }
  }
  return "";
}

String uriPrefix(uint8_t code) {
  switch (code) {
    case 0x01: return "http://www.";
    case 0x02: return "https://www.";
    case 0x03: return "http://";
    case 0x04: return "https://";
    default: return "";
  }
}

String extractUriFromRecord(NdefRecord &record) {
  String type = record.getType();
  if (type != "U") return "";

  int payloadLength = record.getPayloadLength();
  if (payloadLength <= 1 || payloadLength > 180) return "";

  byte payload[180];
  record.getPayload(payload);

  String value = uriPrefix(payload[0]);
  for (int i = 1; i < payloadLength; i++) {
    char ch = (char)payload[i];
    if (ch >= 32 && ch <= 126) value += ch;
  }
  return value;
}

String readCardUrl() {
  if (!nfc.tagPresent(40)) return "";

  NfcTag tag = nfc.read();
  if (!tag.hasNdefMessage()) return "";

  NdefMessage message = tag.getNdefMessage();
  int count = message.getRecordCount();

  for (int i = 0; i < count; i++) {
    NdefRecord record = message.getRecord(i);
    String uri = extractUriFromRecord(record);
    if (uri.length() > 0) return uri;
  }
  return "";
}

void handleEspLine(const String &line) {
  if (line == "NET|OFFLINE") {
    networkOnline = false;
    showReady();
    return;
  }

  if (line == "NET|ONLINE") {
    networkOnline = true;
    showReady();
    return;
  }

  if (!line.startsWith("RESULT|")) return;

  String led = fieldAt(line, 2);
  String beep = fieldAt(line, 3);
  unsigned long holdMs = (unsigned long)fieldAt(line, 4).toInt();
  String l1 = fieldAt(line, 5);
  String l2 = fieldAt(line, 6);
  String l3 = fieldAt(line, 7);
  String l4 = fieldAt(line, 8);

  setLed(led);
  showLines(l1, l2, l3, l4);
  beepPattern(beep);
  delay(holdMs > 0 ? holdMs : 3000);
  showReady();
}

void sendCardToEsp(const String &rawTokenOrUrl) {
  if (rawTokenOrUrl.length() == 0) return;

  unsigned long now = millis();
  if (rawTokenOrUrl == lastCard && (now - lastCardAt) < LOCAL_REPEAT_MS) return;

  lastCard = rawTokenOrUrl;
  lastCardAt = now;

  if (!networkOnline) {
    setLed("red");
    showLines("NETWORK OFFLINE", "CHECK HOTSPOT", "", "");
    beepPattern("long");
    delay(2200);
    showReady();
    return;
  }

  showLines("CARD DETECTED", "CHECKING...", "", "");
  espSerial.println("SCAN|" + rawTokenOrUrl);
}

void setup() {
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  allLedsOff();

  Serial.begin(115200);
  espSerial.begin(9600);

  Wire.begin();

  lcd.init();
  lcd.backlight();
  showLines("GUANYU TT", "STARTING...", "", "");

  nfc.begin();

  delay(500);
  showReady();
}

void loop() {
  while (espSerial.available()) {
    String line = espSerial.readStringUntil('\n');
    line.trim();
    handleEspLine(line);
  }

  String cardUrl = readCardUrl();
  if (cardUrl.length() > 0) {
    sendCardToEsp(cardUrl);
  }

  delay(60);
}
