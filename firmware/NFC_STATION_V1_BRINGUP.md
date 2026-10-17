# NFC Station V1 — First Hardware Bring-Up Checklist

Use this sequence after all parts arrive. Do not connect everything at once.

## Stage 1 — LCD + UNO only
Connect:
- UNO A4 -> LCD SDA
- UNO A5 -> LCD SCL
- UNO 5V -> LCD VCC
- UNO GND -> LCD GND

Expected:
- LCD backlight turns on
- Display shows startup / READY text

If blank:
- adjust the PCF8574 contrast potentiometer
- verify I2C address, normally 0x27 or 0x3F

## Stage 2 — LEDs + buzzer
Connect:
- D2 -> resistor -> green LED
- D3 -> resistor -> yellow LED
- D4 -> resistor -> red LED
- D5 -> 5V active buzzer
- all grounds common

Expected test:
- green short beep = success
- yellow double beep = already checked in
- red long beep = error / rate limit

## Stage 3 — PN532 + NTAG213 offline test
Switch PN532 to I2C mode before power-on.

Connect:
- A4 -> PN532 SDA
- A5 -> PN532 SCL
- PN532 power according to the delivered module printing
- GND -> common GND

Expected:
- PN532 detects NTAG213
- NDEF URL can be read
- test URL should contain /c/<token>

At this stage Wi-Fi is not required.

## Stage 4 — ESP8266 bridge + iPhone hotspot
Power:
- UNO from USB
- ESP8266 V3 from its own Type-C USB
- UNO and ESP8266 GND must be connected

Serial:
- UNO D11 -> level shifter HV1 -> LV1 -> ESP RX
- ESP TX -> level shifter LV2 -> HV2 -> UNO D10
- level shifter HV -> UNO 5V
- level shifter LV -> ESP 3.3V

Expected:
- iPhone hotspot enabled
- ESP8266 connects automatically
- LCD changes from NETWORK OFFLINE to SYSTEM ONLINE
- device heartbeat appears in App

## Stage 5 — End-to-end NFC test
Before test:
1. In App open More -> NFC self-service device.
2. Rotate Device Secret for "管嶼入口機 01".
3. Put Wi-Fi SSID/password, Device Key and Device Secret into ESP8266 firmware.
4. Upload firmware.
5. Use a student card already linked in NFC Wallet.

Expected scans:
1. First scan: CHECK-IN OK / green / short beep
2. Second scan: ALREADY CHECKED / yellow / double beep
3. Third scan: ALREADY CHECKED / yellow / double beep
4. Fourth scan within 30 minutes: SCAN LIMIT / red / long beep

App verification:
- Today page shows the student
- Daily attendance editor shows the same student
- device page shows Online and firmware version
- wallet balance and points shown on LCD match the App

## V1 rule
If Wi-Fi / Cloudflare / Supabase is unavailable:
- device must NOT display CHECK-IN OK
- no local fake attendance is accepted
- LCD shows NETWORK OFFLINE / TRY AGAIN

Offline queueing is intentionally deferred to a later version.
