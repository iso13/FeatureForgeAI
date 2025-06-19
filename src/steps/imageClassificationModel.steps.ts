// Step Definition for Validate Correct Image Labeling for Cats and Dogs
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';
import path from 'path';
import { getDirName } from '../utils/dirname.js'; // use .js extension for ESM

let model: tf.LayersModel;
let predictions: { image: string; label: string }[] = [];

const __dirname = getDirName(import.meta.url);
const KNOWN_IMAGES_DIR = path.join(__dirname, '../support/images/known');

const EXPECTED_LABELS = [
  { image: 'cat.jpg', label: 'cat' },
  { image: 'dog.jpg', label: 'dog' },
];

// Load a pre-trained image classification model
async function loadImageClassificationModel() {
  return await tf.loadLayersModel(
    'file://./src/support/model/image-classification-model/model.json',
  );
}

// Predict label for an image
async function predictImageLabel(
  model: tf.LayersModel,
  imagePath: string,
): Promise<string> {
  const imageBuffer = fs.readFileSync(imagePath);
  let imageTensor = tf.node.decodeImage(imageBuffer);

  // Resize to [100, 100, 3]
  imageTensor = tf.image.resizeBilinear(imageTensor, [100, 100]);
  imageTensor = imageTensor.expandDims(0); // [1, 100, 100, 3]

  const predictionTensor = model.predict(imageTensor) as tf.Tensor;
  const predictionArray = predictionTensor.dataSync();
  const predictedIndex = predictionArray.indexOf(Math.max(...predictionArray));

  const LABELS = ['cat', 'dog'];
  return LABELS[predictedIndex];
}

Given('a pre-trained image classification model for identifying cats and dogs is loaded', async () => {
  model = await loadImageClassificationModel();
});

When('I input a set of images containing cats and dogs', async () => {
  predictions = [];
  for (const { image } of EXPECTED_LABELS) {
    const imagePath = path.join(KNOWN_IMAGES_DIR, image);
    const label = await predictImageLabel(model, imagePath);
    predictions.push({ image, label });
  }
});

Then(
  'each image should be correctly labeled as {string} or {string} with at least {int}% accuracy',
  (label1: string, label2: string, accuracyThreshold: number) => {
    let correctPredictions = 0;
    for (const { image, label } of predictions) {
      const expectedLabel = EXPECTED_LABELS.find((el) => el.image === image)?.label;
      if (expectedLabel === label) {
        correctPredictions++;
      }
    }

    const accuracy = (correctPredictions / EXPECTED_LABELS.length) * 100;
    console.log('Predictions:', predictions);
    console.log(`Accuracy: ${accuracy}%`);

    expect([label1, label2]).toContain('cat');
    expect([label1, label2]).toContain('dog');
    expect(accuracy >= accuracyThreshold).toBe(true);
  },
);