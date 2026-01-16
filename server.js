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
    voltage: 15,          // High limit
    lightIntensity: 100,  // Low limit (was Current)
    temperature: 40,      // High limit
    humidity: 80,         // High limit
  },
  checkInterval: 60000, // Check every 60 seconds
  cooldown: 30 * 1000, // 30 seconds in milliseconds
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
  lightIntensity: 0,
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
      const lightIntensity = Number(latest.field2) || 0; // Was Current, now Light Intensity
      const humidity = Number(latest.field3) || 0; // Was Battery, now Humidity
      // Field 4 is Load Power, not alerting on it based on requirements
      const temperature = Number(latest.field5) || 0;

      console.log(`[${new Date().toISOString()}] Telemetry - V: ${voltage}, Light: ${lightIntensity}, Humidity: ${humidity}%, T: ${temperature}°C`);

      // Check Light Intensity (Low Limit) - SMS Alert
      if (lightIntensity < CONFIG.limits.lightIntensity) {
        if (now - lastNotificationTime.lightIntensity > CONFIG.cooldown) {
          const msg = `--- Welcome to SUNकल्प --- ALERT!!! The panel is not receiving sufficient light. Please check for any obstruction around the panel.`;
          await sendSMS(msg);
          lastNotificationTime.lightIntensity = now;
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
