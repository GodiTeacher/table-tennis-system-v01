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
