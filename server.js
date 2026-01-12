import express from 'express';
import twilio from 'twilio';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Configuration
const CONFIG = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_PHONE_NUMBER,
    toNumber: process.env.TARGET_PHONE_NUMBER,
  },
  thingspeak: {
    channelId: process.env.THINGSPEAK_CHANNEL_ID,
    apiKey: process.env.THINGSPEAK_API_KEY,
  },
  limits: {
    voltage: 250,      // High limit
    current: 15,       // High limit
    temperature: 50,   // High limit
    battery: 20,       // Low limit
  },
  checkInterval: 60000, // Check every 60 seconds
  cooldown: 30 * 60 * 1000, // 30 minutes in milliseconds
};

// Initialize Twilio Client
let client;
if (CONFIG.twilio.accountSid && CONFIG.twilio.authToken) {
  client = twilio(CONFIG.twilio.accountSid, CONFIG.twilio.authToken);
} else {
  console.warn("Twilio credentials missing. SMS notifications will not work.");
}

// State to track last notification times
const lastNotificationTime = {
  voltage: 0,
  current: 0,
  temperature: 0,
  battery: 0,
};

// Helper function to send SMS
const sendSMS = async (message) => {
  if (!client) {
    console.log(`[SIMULATION] Sending SMS: "${message}" to ${CONFIG.twilio.toNumber}`);
    return;
  }

  try {
    await client.messages.create({
      body: message,
      from: CONFIG.twilio.fromNumber,
      to: CONFIG.twilio.toNumber,
    });
    console.log(`SMS Sent: "${message}"`);
  } catch (error) {
    console.error("Error sending SMS:", error);
  }
};

// Function to check sensors
const checkSensors = async () => {
  if (!CONFIG.thingspeak.channelId || !CONFIG.thingspeak.apiKey) {
    console.log("ThingSpeak credentials missing. Skipping check.");
    return;
  }

  try {
    const url = `https://api.thingspeak.com/channels/${CONFIG.thingspeak.channelId}/feeds.json?api_key=${CONFIG.thingspeak.apiKey}&results=1`;
    const response = await axios.get(url);

    if (response.data && response.data.feeds && response.data.feeds.length > 0) {
      const latest = response.data.feeds[0];
      const now = Date.now();

      // Parse values (ThingSpeak returns strings)
      const voltage = Number(latest.field1) || 0;
      const current = Number(latest.field2) || 0;
      const soc = Number(latest.field3) || 0; // Battery State of Charge
      // Field 4 is Load Power, not alerting on it based on requirements
      const temperature = Number(latest.field5) || 0;

      console.log(`[${new Date().toISOString()}] Telemetry - V: ${voltage}, I: ${current}, SOC: ${soc}%, T: ${temperature}°C`);

      // Check Voltage (High Limit)
      if (voltage > CONFIG.limits.voltage) {
        if (now - lastNotificationTime.voltage > CONFIG.cooldown) {
          const msg = `SYSTEM ALERT: High Voltage detected! Reading: ${voltage}V (Limit: ${CONFIG.limits.voltage}V)`;
          await sendSMS(msg);
          lastNotificationTime.voltage = now;
        }
      }

      // Check Current (High Limit)
      if (current > CONFIG.limits.current) {
        if (now - lastNotificationTime.current > CONFIG.cooldown) {
          const msg = `SYSTEM ALERT: High Current detected! Reading: ${current}A (Limit: ${CONFIG.limits.current}A)`;
          await sendSMS(msg);
          lastNotificationTime.current = now;
        }
      }

      // Check Temperature (High Limit)
      if (temperature > CONFIG.limits.temperature) {
        if (now - lastNotificationTime.temperature > CONFIG.cooldown) {
          const msg = `SYSTEM ALERT: High Temperature detected! Reading: ${temperature}°C (Limit: ${CONFIG.limits.temperature}°C)`;
          await sendSMS(msg);
          lastNotificationTime.temperature = now;
        }
      }

      // Check Battery (Low Limit) - Only alert if soc > 0 to avoid false positives on disconnected sensors
      if (soc < CONFIG.limits.battery && soc > 0) {
        if (now - lastNotificationTime.battery > CONFIG.cooldown) {
          const msg = `SYSTEM ALERT: Low Battery detected! Level: ${soc}% (Limit: ${CONFIG.limits.battery}%)`;
          await sendSMS(msg);
          lastNotificationTime.battery = now;
        }
      }

    }
  } catch (error) {
    console.error("Error fetching ThingSpeak data:", error.message);
  }
};

// Start the polling loop
setInterval(checkSensors, CONFIG.checkInterval);

// Health check endpoint (for Render / Uptime monitors)
app.get('/', (req, res) => {
  res.send('Microgrid Notification Service is Running.');
});

// Start Express server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  // Run an immediate check on startup
  checkSensors();
});;
