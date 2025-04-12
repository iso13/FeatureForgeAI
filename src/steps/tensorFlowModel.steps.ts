// Import Cucumber steps for defining Gherkin steps and Playwright's expect assertion
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

// Import TensorFlow.js and custom model functions
import * as tf from '@tensorflow/tfjs';
import { createSimpleModel, predictValue } from '../support/model/simpleModel';

let model: tf.LayersModel; // Variable to store the TensorFlow model
let prediction: number; // Variable to store the model's prediction result


Given('a linear regression TensorFlow model has been trained to learn y = 2x - 1', async () => {
  model = await createSimpleModel(); // Call a function to initialize and train the model
});


When('I input the value {int} into the model', async (input: number) => {
  prediction = await predictValue(model, input); // Use the model to predict based on the input value
});


Then(
  'the predicted output should be within {float} of {float}',
  async (tolerance: number, expectedValue: number) => {
    // Check if the prediction is within the expected tolerance of the expected value
    expect(prediction).toBeCloseTo(expectedValue, tolerance);
  }
);