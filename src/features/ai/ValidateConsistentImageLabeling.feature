@ValidateConsistentImageLabeling @no-browser
Feature: Validate Correct Image Labeling
  As an Engineer
  I want to validate that images are correctly labeled as either “cat” or “dog”
  So that I can ensure the model predictions is accurate and reliable

  Scenario: Validate correct labeling for a set of cat and dog images
    Given a pre-trained image classification model for identifying cats and dogs is loaded
    When I input a set of images containing cats and dogs
    Then each image should be correctly labeled as "cat" or "dog" with at least 50% accuracy
    