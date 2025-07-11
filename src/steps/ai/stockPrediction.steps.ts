/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

// Step definitions
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { StockPricePredictor } from '../../support/predictor/stockPricePredictor';
import { parseCSV } from '../../utils/csvParser';
import path from 'path';

let predictor: StockPricePredictor;
let predictedPrice: number;


Given('I have trained the stock price predictor with historical data', async function () {
  const filePath = path.resolve(__dirname, '../data/tesla_stock_data.csv');
  const stockData = await parseCSV(filePath);
  predictor = new StockPricePredictor();
  await predictor.train(stockData);
});

When('I predict the stock price for a future date {string}', function (date: string) {
  const inputData = predictor.getInputForDate(date);
  predictedPrice = predictor.predict(inputData);
  console.log(`Predicted stock price for ${date}: ${predictedPrice}`);
});

When('I predict the stock price for a historical date {string}', function (date: string) {
  const inputData = predictor.getInputForDate(date);
  predictedPrice = predictor.predict(inputData);
  console.log(`Predicted stock price for ${date}: ${predictedPrice}`);
});


Then('the predicted price should be displayed', function () {
  expect(predictedPrice).toBeGreaterThan(0);
});
