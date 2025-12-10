// Node.js backend example for MQTT integration with payment hardware
// Requires: npm install mqtt
const mqtt = require('mqtt');
const brokerUrl = 'mqtt://localhost'; // or your broker's address
const TOPIC_BILL = 'ctu-kiosk/payment/bill';
const TOPIC_COIN = 'ctu-kiosk/payment/coin';
const TOPIC_DISPENSE = 'ctu-kiosk/payment/dispense';

const client = mqtt.connect(brokerUrl);

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe([TOPIC_BILL, TOPIC_COIN]);
});

client.on('message', (topic, message) => {
  if (topic === TOPIC_BILL) {
    const data = JSON.parse(message.toString());
    console.log('Bill inserted:', data);
    // Relay to frontend or update DB as needed
  } else if (topic === TOPIC_COIN) {
    const data = JSON.parse(message.toString());
    console.log('Coin inserted:', data);
    // Relay to frontend or update DB as needed
  }
});

// Example: Dispense change command
function dispenseChange() {
  client.publish(TOPIC_DISPENSE, JSON.stringify({ dispense: true, timestamp: new Date().toISOString() }));
  console.log('Dispense command sent');
}

module.exports = { dispenseChange };
