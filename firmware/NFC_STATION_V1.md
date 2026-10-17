# NFC Self-Service Station V1

Hardware:
- Arduino UNO
- PN532 NFC reader (I2C)
- LCD2004 + PCF8574 (I2C)
- ESP8266 V3 Type-C
- 2-channel bidirectional level shifter
- 5V active buzzer
- Green / yellow / red LEDs with 220–330 ohm resistors

## UNO pin plan
- A4 SDA: shared PN532 + LCD2004
- A5 SCL: shared PN532 + LCD2004
- D2: green LED
- D3: yellow LED
- D4: red LED
- D5: active buzzer
- D10: SoftwareSerial RX from ESP8266 TX through level shifter
- D11: SoftwareSerial TX to ESP8266 RX through level shifter
- GND: common ground between UNO, ESP8266, PN532, LCD

UNO and ESP8266 should be powered independently from USB 5V, with common ground.

## Station behavior
1. UNO waits for NTAG213.
2. Same card held on reader is ignored locally for ~3 seconds.
3. UNO extracts the NDEF URL/token and sends one serial line to ESP8266:
   SCAN|<raw-card-url-or-token>
4. ESP8266 POSTs to:
   /api/device/nfc/check-in
5. API returns:
   - code
   - lcd.lines[0..3]
   - indicator.led
   - indicator.beep
   - hold_ms
6. ESP8266 sends a compact response to UNO:
   RESULT|<code>|<led>|<beep>|<hold_ms>|<line1>|<line2>|<line3>|<line4>
7. UNO updates LCD, LED and buzzer.
8. After hold_ms, UNO returns to READY screen.

## Scan policy
- Local same-card debounce: 3 seconds
- Cloud default: 30 minutes / max 3 accepted scans per student/device
- First accepted scan of the day: CHECKIN_OK
- Later accepted scans: ALREADY_CHECKED_IN
- Fourth scan inside current window: RATE_LIMIT

## Ready / network states
READY:
GUANYU TT
SYSTEM ONLINE
TAP YOUR CARD
READY

OFFLINE:
GUANYU TT
NETWORK OFFLINE
WAIT FOR WIFI

No offline attendance is recorded in V1.


## Final wiring table

### I2C bus
Arduino UNO A4 / SDA -> PN532 SDA
Arduino UNO A4 / SDA -> LCD2004 SDA
Arduino UNO A5 / SCL -> PN532 SCL
Arduino UNO A5 / SCL -> LCD2004 SCL

PN532 must be switched to I2C mode on the module before power-on.
Exact DIP / solder-jumper position will be confirmed from the delivered board printing.

### Indicators
UNO D2 -> 220–330 ohm resistor -> Green LED anode
UNO D3 -> 220–330 ohm resistor -> Yellow LED anode
UNO D4 -> 220–330 ohm resistor -> Red LED anode
All LED cathodes -> GND

UNO D5 -> active buzzer signal / positive lead
Buzzer ground / negative lead -> GND

### UNO <-> ESP8266 serial through 2-channel level shifter

Level-shifter power:
- HV -> UNO 5V
- LV -> ESP8266 3.3V
- GND -> common GND

Channel 1, UNO TX to ESP RX:
- UNO D11 -> HV1
- LV1 -> ESP8266 software-serial RX

Channel 2, ESP TX to UNO RX:
- ESP8266 software-serial TX -> LV2
- HV2 -> UNO D10

Important:
- Do not connect UNO 5V directly to an ESP8266 GPIO.
- UNO and ESP8266 must share GND.
- ESP8266 V3 is powered from its own Type-C USB 5V input.
- UNO is powered from its own USB 5V input.

### Power
Recommended supply: 5V / 2A multi-port USB supply.
- Port 1 -> Arduino UNO USB
- Port 2 -> ESP8266 V3 Type-C
- Optional Port 3 -> spare / service use

LCD2004 and PN532 can normally be powered from UNO 5V / GND, subject to the delivered PN532 board's printed voltage specification.

## Arduino libraries to install
- PN532 by Seeed Studio / Elechouse-compatible package providing:
  - PN532_I2C.h
  - PN532.h
  - NfcAdapter.h
- LiquidCrystal_I2C
- SoftwareSerial (built in)

If the delivered PN532 V3 board uses a different library-compatible pin mode, only the reader initialization layer should need adjustment; the cloud API and device protocol stay unchanged.
