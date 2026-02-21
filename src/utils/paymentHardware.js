/**
 * Payment Hardware Simulator & Logger
 * Converts Python test.py logic to JavaScript
 * Simulates coin & bill acceptor behavior with pulse detection
 */

class PaymentHardware {
  constructor() {
    // Pin assignments (actual Raspberry Pi GPIO pins)
    this.COIN_PIN = 2;      // Actual GPIO 2 (physical pin 3)
    this.BILL_PIN = 22;     // Actual GPIO 22 (physical pin 15)

    // Shared state
    this.credit = 0;
    this.totalCredit = 0;

    // Coin config
    this.coinPulseCount = 0;
    this.coinLastPulseTime = 0;
    this.COIN_GAP_TIMEOUT = 0.5; // 500ms gap = end of coin pulse burst
    this.COIN_DEBOUNCE_MS = 50;

    this.PULSE_TO_VALUE = {
      1: 1,
      2: 5,
      5: 5,
      10: 10,
      20: 20
    };

    // Bill config
    this.billPulseCount = 0;
    this.billLastPulseTime = 0;
    this.BILL_VALUE_PER_PULSE = 10; // 1 pulse = ₱10
    this.BILL_DONE_TIMEOUT = 0.25; // 250ms gap = end of bill pulse burst
    this.BILL_DEBOUNCE_MS = 50;

    // Processing state
    this.isProcessing = false;
    this.monitoringInterval = null;
    this.lastDebugTime = Date.now();
    this.DEBUG_INTERVAL = 2000; // 2 seconds

    // Callback functions
    this.onCoinDetected = null;
    this.onBillDetected = null;
    this.onPaymentUpdate = null;

    // Hardware simulation
    this.coinGPIOState = 1; // idle HIGH
    this.billGPIOState = 1; // idle HIGH
  }

  /**
   * Initialize payment hardware monitoring
   */
  initialize(callbacks = {}) {
    console.log('🔧 Payment Hardware Initializing...');
    console.log(`   Coin → GPIO ${this.COIN_PIN} | Bill → GPIO ${this.BILL_PIN}`);
    console.log(`   Coin pulse map: ${JSON.stringify(this.PULSE_TO_VALUE)}`);
    console.log(`   Bill: ₱${this.BILL_VALUE_PER_PULSE} per pulse\n`);

    this.onCoinDetected = callbacks.onCoinDetected || null;
    this.onBillDetected = callbacks.onBillDetected || null;
    this.onPaymentUpdate = callbacks.onPaymentUpdate || null;

    this.startMonitoring();
  }

  /**
   * Start monitoring for hardware events (simulated)
   */
  startMonitoring() {
    if (this.isProcessing) {
      console.warn('⚠️  Monitoring already active');
      return;
    }

    this.isProcessing = true;
    console.log('✅ Coin & Bill Acceptor Ready... (Monitoring Active)\n');

    // Simulate monitoring loop every 10ms
    this.monitoringInterval = setInterval(() => {
      this.processPaymentEvents();
    }, 10);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isProcessing = false;
    console.log('⏹️  Monitoring stopped');
  }

  /**
   * Process coin pulse (callback)
   */
  coinPulseCallback() {
    const now = Date.now() / 1000; // Convert to seconds like Python
    if (now - this.coinLastPulseTime > this.COIN_DEBOUNCE_MS / 1000) {
      this.coinPulseCount += 1;
      this.coinLastPulseTime = now;
      console.log(`[COIN] Pulse! count = ${this.coinPulseCount}`);
    }
  }

  /**
   * Process bill pulse (callback)
   */
  billPulseCallback() {
    const now = Date.now() / 1000;
    if (now - this.billLastPulseTime > this.BILL_DEBOUNCE_MS / 1000) {
      this.billPulseCount += 1;
      this.billLastPulseTime = now;
      console.log(`[BILL] Pulse! count = ${this.billPulseCount}`);
    }
  }

  /**
   * Main payment processing loop
   */
  processPaymentEvents() {
    const now = Date.now() / 1000;

    // ── Process coin burst ────────────────────────────────
    if (
      this.coinPulseCount > 0 &&
      now - this.coinLastPulseTime > this.COIN_GAP_TIMEOUT
    ) {
      const pulses = this.coinPulseCount;
      this.coinPulseCount = 0;

      const value = this.PULSE_TO_VALUE[pulses];
      if (value === undefined) {
        console.log(`[COIN] ❌ Unknown coin: ${pulses} pulses`);
      } else {
        this.credit += value;
        this.totalCredit += value;
        console.log(
          `[COIN] ✓ ${pulses} pulses → ₱${value} added | Total: ₱${this.credit}`
        );

        // Trigger callback
        if (this.onCoinDetected) {
          this.onCoinDetected({
            pulses,
            value,
            totalCredit: this.credit,
            timestamp: new Date().toISOString()
          });
        }

        // Update UI
        if (this.onPaymentUpdate) {
          this.onPaymentUpdate({ type: 'coin', amount: value, total: this.credit });
        }
      }
    }

    // ── Process bill burst ────────────────────────────────
    if (
      this.billPulseCount > 0 &&
      now - this.billLastPulseTime > this.BILL_DONE_TIMEOUT
    ) {
      const pulses = this.billPulseCount;
      this.billPulseCount = 0;

      const added = pulses * this.BILL_VALUE_PER_PULSE;
      this.credit += added;
      this.totalCredit += added;
      console.log(
        `[BILL] ✓ ${pulses} pulses → ₱${added} added | Total: ₱${this.credit}`
      );

      // Trigger callback
      if (this.onBillDetected) {
        this.onBillDetected({
          pulses,
          amount: added,
          totalCredit: this.credit,
          timestamp: new Date().toISOString()
        });
      }

      // Update UI
      if (this.onPaymentUpdate) {
        this.onPaymentUpdate({ type: 'bill', amount: added, total: this.credit });
      }
    }

    // ── Debug every 2s ────────────────────────────────────
    if (now - this.lastDebugTime > this.DEBUG_INTERVAL / 1000) {
      const coinStateDesc = this.coinGPIOState === 1 ? 'HIGH' : 'LOW (pulse)';
      const billStateDesc = this.billGPIOState === 1 ? 'HIGH' : 'LOW (pulse)';

      console.log(
        `[DEBUG] COIN GPIO${this.COIN_PIN}=${coinStateDesc} (pulses=${this.coinPulseCount}) | ` +
        `BILL GPIO${this.BILL_PIN}=${billStateDesc} (pulses=${this.billPulseCount}) | ` +
        `Credit=₱${this.credit}`
      );
      this.lastDebugTime = now;
    }
  }

  /**
   * Simulate coin insertion (for testing in UI)
   */
  simulateCoinInsertion(pulseCount = 1) {
    console.log(`\n📝 [SIMULATION] Inserting coin with ${pulseCount} pulse(s)...`);
    for (let i = 0; i < pulseCount; i++) {
      this.coinPulseCallback();
      // Stagger pulses slightly
      setTimeout(() => {}, 5);
    }
    // Trigger processing after timeout
    setTimeout(() => {
      this.processPaymentEvents();
    }, this.COIN_GAP_TIMEOUT * 1000 + 50);
  }

  /**
   * Simulate bill insertion (for testing in UI)
   */
  simulateBillInsertion(pulseCount = 1) {
    console.log(`\n📝 [SIMULATION] Inserting bill with ${pulseCount} pulse(s)...`);
    for (let i = 0; i < pulseCount; i++) {
      this.billPulseCallback();
      setTimeout(() => {}, 5);
    }
    // Trigger processing after timeout
    setTimeout(() => {
      this.processPaymentEvents();
    }, this.BILL_DONE_TIMEOUT * 1000 + 50);
  }

  /**
   * Get current credit
   */
  getCredit() {
    return this.credit;
  }

  /**
   * Get total credit (lifetime)
   */
  getTotalCredit() {
    return this.totalCredit;
  }

  /**
   * Reset credit for new transaction
   */
  resetCredit() {
    console.log(`💾 Resetting credit: ₱${this.credit} → ₱0\n`);
    this.credit = 0;
  }

  /**
   * Dispense change
   */
  dispenseChange(amount) {
    console.log(`🪙 Dispensing change: ₱${amount}`);
    // This would trigger servo control in real hardware
    return { success: true, amount, timestamp: new Date().toISOString() };
  }

  /**
   * Get hardware status
   */
  getStatus() {
    return {
      isMonitoring: this.isProcessing,
      currentCredit: this.credit,
      totalCredit: this.totalCredit,
      coinPulses: this.coinPulseCount,
      billPulses: this.billPulseCount,
      coinGPIO: this.coinGPIOState,
      billGPIO: this.billGPIOState,
      timestamp: new Date().toISOString()
    };
  }
}

export default new PaymentHardware();
