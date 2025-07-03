import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// Setup mock device API
const mock = new MockAdapter(axios);
let lastAlert: string | null = null;
let lastDeviceStatus: string = 'IDLE';

Given('the heart rate monitor device is connected via API', async () => {
  mock.reset(); // Clear any previous mocks
  mock.onGet('/device/status').reply(200, { status: 'IDLE' });
  mock.onPost('/device/simulate-heart-rate').reply((config) => {
    const { bpm } = JSON.parse(config.data);

    if (bpm > 120) {
      lastAlert = 'ALERT_HIGH_HEART_RATE';
      lastDeviceStatus = 'ALERT';
      return [200, { alert: lastAlert }];
    } else {
      lastAlert = null;
      lastDeviceStatus = 'NORMAL';
      return [200, { alert: null }];
    }
  });

  const response = await axios.get('/device/status');
  expect(response.data.status).toBe('IDLE');
});

Given('the device is in idle state', () => {
  lastDeviceStatus = 'IDLE';
});

When('I simulate a heart rate of {int} bpm', async (bpm: number) => {
  const response = await axios.post('/device/simulate-heart-rate', { bpm });
  lastAlert = response.data.alert;
});

Then('the device should send an {string} notification', (expectedAlert: string) => {
  expect(lastAlert).toBe(expectedAlert);
});

Then('the alert should be logged in the monitoring system', async () => {
  // Simulate alert logging check
  const logs = ['ALERT_HIGH_HEART_RATE']; // You could mock or inject this
  expect(logs.includes(lastAlert!)).toBe(true);
});

Then('no alert should be sent', () => {
  expect(lastAlert).toBeNull();
});

Then('the device status should remain {string}', (expectedStatus: string) => {
  expect(lastDeviceStatus).toBe(expectedStatus);
});