import mqtt, { IClientOptions, MqttClient } from 'mqtt';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

let client: MqttClient | null = null;

export async function initializeMQTT(): Promise<void> {
  return new Promise((resolve, reject) => {
    const options: IClientOptions = {
      clientId: `indoor-map-server-${Date.now()}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    };

    if (config.mqtt.username) {
      options.username = config.mqtt.username;
      options.password = config.mqtt.password;
    }

    try {
      client = mqtt.connect(config.mqtt.brokerUrl, options);

      client.on('connect', () => {
        logger.info('MQTT connected');

        // Subscribe to sensor topics
        client?.subscribe('sensors/#', (err) => {
          if (err) {
            logger.error('Failed to subscribe to sensors topic:', err);
          } else {
            logger.debug('Subscribed to sensors/#');
          }
        });

        // Subscribe to asset tracking topics
        client?.subscribe('assets/#', (err) => {
          if (err) {
            logger.error('Failed to subscribe to assets topic:', err);
          } else {
            logger.debug('Subscribed to assets/#');
          }
        });

        resolve();
      });

      client.on('message', (topic, payload) => {
        handleMessage(topic, payload.toString());
      });

      client.on('error', (error) => {
        logger.error('MQTT error:', error);
        reject(error);
      });

      client.on('offline', () => {
        logger.warn('MQTT offline');
      });

      client.on('reconnect', () => {
        logger.info('MQTT reconnecting...');
      });
    } catch (error) {
      logger.error('Failed to initialize MQTT:', error);
      reject(error);
    }
  });
}

function handleMessage(topic: string, payload: string) {
  try {
    const data = JSON.parse(payload);
    logger.debug(`MQTT message on ${topic}:`, data);

    // TODO: Process sensor readings, asset locations, etc.
    // Route to appropriate handlers based on topic

    if (topic.startsWith('sensors/')) {
      // Handle sensor data
      // processSensorReading(topic, data);
    } else if (topic.startsWith('assets/')) {
      // Handle asset location updates
      // processAssetLocation(topic, data);
    }
  } catch (error) {
    logger.error(`Failed to parse MQTT message on ${topic}:`, error);
  }
}

export function publish(topic: string, message: object): void {
  if (client) {
    client.publish(topic, JSON.stringify(message));
  }
}

export function subscribe(topic: string): void {
  if (client) {
    client.subscribe(topic);
  }
}

export function getMQTTClient(): MqttClient | null {
  return client;
}

export function closeMQTT(): void {
  if (client) {
    client.end();
    client = null;
  }
}
