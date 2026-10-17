#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>
#include <SoftwareSerial.h>

// Fill these values after creating the device in ChatGPT app.
const char* WIFI_SSID = "YOUR_IPHONE_HOTSPOT";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* DEVICE_KEY = "YOUR_DEVICE_KEY";
const char* DEVICE_SECRET = "YOUR_DEVICE_SECRET";
const char* API_URL = "https://table-tennis-system-v01.cramtabletennis.workers.dev/api/device/nfc/check-in";
const char* PING_URL = "https://table-tennis-system-v01.cramtabletennis.workers.dev/api/device/ping";
const char* FIRMWARE_VERSION = "UNO-STATION-V1.0.0";

SoftwareSerial unoSerial(D5, D6); // ESP RX, TX - final pins to verify on board
unsigned long lastHeartbeatAt = 0;
const unsigned long HEARTBEAT_MS = 120000;

String jsonValue(const String &json, const String &key) {
  String needle="\""+key+"\":";
  int pos=json.indexOf(needle);
  if(pos<0)return "";
  pos+=needle.length();
  while(pos<json.length() && (json[pos]==' '))pos++;
  if(pos<json.length() && json[pos]=='\"'){
    int end=json.indexOf('\"',pos+1);
    if(end>pos)return json.substring(pos+1,end);
  }
  int end=json.indexOf(',',pos);
  if(end<0)end=json.indexOf('}',pos);
  return end>pos?json.substring(pos,end):"";
}

String arrayLine(const String &json,int idx){
  int p=json.indexOf("\"lines\":[");
  if(p<0)return "";
  p=json.indexOf('[',p)+1;
  for(int i=0;i<=idx;i++){
    int q1=json.indexOf('\"',p);
    if(q1<0)return "";
    int q2=json.indexOf('\"',q1+1);
    if(q2<0)return "";
    if(i==idx)return json.substring(q1+1,q2);
    p=q2+1;
  }
  return "";
}

void sendNetworkState(bool online){
  unoSerial.println(online?"NET|ONLINE":"NET|OFFLINE");
}

bool ensureWifi(){
  if(WiFi.status()==WL_CONNECTED)return true;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID,WIFI_PASSWORD);
  unsigned long started=millis();
  while(WiFi.status()!=WL_CONNECTED && millis()-started<12000){
    delay(300);
  }
  bool ok=WiFi.status()==WL_CONNECTED;
  sendNetworkState(ok);
  return ok;
}

void sendHeartbeat(){
  if(!ensureWifi())return;

  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  client->setInsecure();

  HTTPClient https;
  if(!https.begin(*client,PING_URL))return;
  https.addHeader("Content-Type","application/json");

  String body="{";
  body+="\"device_key\":\""+String(DEVICE_KEY)+"\",";
  body+="\"device_secret\":\""+String(DEVICE_SECRET)+"\",";
  body+="\"firmware\":\""+String(FIRMWARE_VERSION)+"\"";
  body+="}";

  int code=https.POST(body);
  https.end();

  if(code==200){
    lastHeartbeatAt=millis();
    sendNetworkState(true);
  }
}

void sendResultToUno(const String &json){
  String code=jsonValue(json,"code");
  String led=jsonValue(json,"led");
  String beep=jsonValue(json,"beep");
  String hold=jsonValue(json,"hold_ms");
  String l1=arrayLine(json,0);
  String l2=arrayLine(json,1);
  String l3=arrayLine(json,2);
  String l4=arrayLine(json,3);
  unoSerial.println("RESULT|"+code+"|"+led+"|"+beep+"|"+hold+"|"+l1+"|"+l2+"|"+l3+"|"+l4);
}

void postScan(const String &tokenOrUrl){
  if(!ensureWifi())return;

  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  client->setInsecure(); // V1 prototype only; pin CA/cert before production hardware rollout.

  HTTPClient https;
  if(!https.begin(*client,API_URL)){
    sendNetworkState(false);
    return;
  }
  https.addHeader("Content-Type","application/json");

  String body="{";
  body+="\"device_key\":\""+String(DEVICE_KEY)+"\",";
  body+="\"device_secret\":\""+String(DEVICE_SECRET)+"\",";
  body+="\"card_token\":\""+tokenOrUrl+"\",";
  body+="\"firmware\":\""+String(FIRMWARE_VERSION)+"\"";
  body+="}";

  int code=https.POST(body);
  String response=https.getString();
  https.end();

  if(code<=0){
    sendNetworkState(false);
    return;
  }
  sendResultToUno(response);
}

void setup(){
  Serial.begin(115200);
  unoSerial.begin(9600);
  if(ensureWifi())sendHeartbeat();
}

void loop(){
  while(unoSerial.available()){
    String line=unoSerial.readStringUntil('\n');
    line.trim();
    if(line.startsWith("SCAN|")){
      postScan(line.substring(5));
    }
  }
  if(WiFi.status()!=WL_CONNECTED){
    ensureWifi();
  }

  if(WiFi.status()==WL_CONNECTED && millis()-lastHeartbeatAt>=HEARTBEAT_MS){
    sendHeartbeat();
  }
}
