#include <Servo.h>

Servo coinServo;

const int servoPin = 9;
const int restAngle = 0;
const int pushAngle = 85;   // adjust for 1 coin
const int moveDelay = 300;

int coinsToDispense = 10;    // 👈 CHANGE THIS VALUE

void setup() {
  coinServo.attach(servoPin);
  coinServo.write(restAngle);
  delay(1000);

  // dispense coins once
  for (int i = 0; i < coinsToDispense; i++) {
    pushCoin();
    delay(500); // gap between coins
  }
}

void loop() {
  // do nothing
}

void pushCoin() {
  coinServo.write(pushAngle);
  delay(moveDelay);

  coinServo.write(restAngle);
  delay(moveDelay);
}