#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SoftwareSerial.h>

// NFC library intentionally left to final hardware test because PN532 modules differ.
// Expected V1 hardware:
//   PN532 on I2C (A4/A5)
//   LCD2004 + PCF8574 on I2C (A4/A5)
//   ESP8266 bridge on SoftwareSerial D10/D11

LiquidCrystal_I2C lcd(0x27, 20, 4);
SoftwareSerial espSerial(10, 11); // UNO RX, TX

const uint8_t LED_GREEN = 2;
const uint8_t LED_YELLOW = 3;
const uint8_t LED_RED = 4;
const uint8_t BUZZER = 5;

String lastCard = "";
unsigned long lastCardAt = 0;
const unsigned long LOCAL_REPEAT_MS = 3000;

void allLedsOff() {
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_RED, LOW);
}

void showLines(String a, String b, String c, String d) {
  lcd.clear();
  lcd.setCursor(0,0); lcd.print(a.substring(0,20));
  lcd.setCursor(0,1); lcd.print(b.substring(0,20));
  lcd.setCursor(0,2); lcd.print(c.substring(0,20));
  lcd.setCursor(0,3); lcd.print(d.substring(0,20));
}

void showReady() {
  allLedsOff();
  showLines("GUANYU TT","SYSTEM ONLINE","TAP YOUR CARD","READY");
}

void beepPattern(const String &pattern) {
  if (pattern == "short") {
    digitalWrite(BUZZER, HIGH); delay(90); digitalWrite(BUZZER, LOW);
  } else if (pattern == "double") {
    for (int n=0;n<2;n++) {
      digitalWrite(BUZZER, HIGH); delay(80); digitalWrite(BUZZER, LOW); delay(90);
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
  int start=0;
  int current=0;
  for (int i=0;i<=src.length();i++) {
    if (i==src.length() || src[i]=='|') {
      if (current==index) return src.substring(start,i);
      current++;
      start=i+1;
    }
  }
  return "";
}

void handleEspLine(const String &line) {
  if (line == "NET|OFFLINE") {
    allLedsOff();
    digitalWrite(LED_RED,HIGH);
    showLines("GUANYU TT","NETWORK OFFLINE","WAIT FOR WIFI","");
    return;
  }
  if (line == "NET|ONLINE") {
    showReady();
    return;
  }
  if (!line.startsWith("RESULT|")) return;

  String led=fieldAt(line,2);
  String beep=fieldAt(line,3);
  unsigned long holdMs=(unsigned long)fieldAt(line,4).toInt();
  String l1=fieldAt(line,5);
  String l2=fieldAt(line,6);
  String l3=fieldAt(line,7);
  String l4=fieldAt(line,8);

  setLed(led);
  showLines(l1,l2,l3,l4);
  beepPattern(beep);
  delay(holdMs > 0 ? holdMs : 3000);
  showReady();
}

void sendCardToEsp(const String &rawTokenOrUrl) {
  if (rawTokenOrUrl.length()==0) return;
  unsigned long now=millis();
  if (rawTokenOrUrl==lastCard && (now-lastCardAt)<LOCAL_REPEAT_MS) return;
  lastCard=rawTokenOrUrl;
  lastCardAt=now;
  espSerial.println("SCAN|"+rawTokenOrUrl);
}

void setup() {
  pinMode(LED_GREEN,OUTPUT);
  pinMode(LED_YELLOW,OUTPUT);
  pinMode(LED_RED,OUTPUT);
  pinMode(BUZZER,OUTPUT);
  allLedsOff();

  Serial.begin(115200);
  espSerial.begin(9600);
  Wire.begin();
  lcd.init();
  lcd.backlight();

  showLines("GUANYU TT","STARTING...","","");
  delay(600);
  showReady();

  // TODO after hardware arrives:
  // initialize PN532 I2C and verify exact module switch/jumper setting.
}

void loop() {
  while (espSerial.available()) {
    String line=espSerial.readStringUntil('\n');
    line.trim();
    handleEspLine(line);
  }

  // TODO after hardware arrives:
  // 1. detect NTAG213 with PN532
  // 2. read NDEF URL/token
  // 3. call sendCardToEsp(rawUrlOrToken)
}
