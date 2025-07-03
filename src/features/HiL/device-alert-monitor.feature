@HiL @deviceAlertMonitor @no-browser
Feature: Device alert validation for heart rate monitor

  As a QA engineer
  I want to validate that the device correctly raises alerts when heart rate exceeds thresholds
  So that patient safety is ensured during remote monitoring

  Background:
    Given the heart rate monitor device is connected via API
    And the device is in idle state

  Scenario: Alert triggers when heart rate exceeds threshold
    When I simulate a heart rate of 160 bpm
    Then the device should send an "ALERT_HIGH_HEART_RATE" notification
    And the alert should be logged in the monitoring system

  Scenario: No alert for normal heart rate
    When I simulate a heart rate of 75 bpm
    Then no alert should be sent
    And the device status should remain "NORMAL"