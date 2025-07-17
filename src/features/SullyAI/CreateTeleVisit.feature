@createTeleVisit @wip
Feature: Create TeleVisit
As a Doctor,
I want to create a televisit for a patient,
So that I can generate a clinical summary.

Background:
Given the user logs into Sully AI
And the user selects patient Jane Doe2

Scenario: Successfully create a TeleVisit and generate clinical summary
  When the user initiates a TeleVisit
  And the user starts the audio recording
  And the user ends the recording after the consultation
  Then the system should transcribe the audio
  And the system should extract clinical data from the transcription
  And the system should generate a clinical summary

Scenario: TeleVisit fails due to no audio input
  When the user initiates a TeleVisit
  And the user starts but does not provide any audio input
  Then the system should notify the user that no speech was detected
  And the clinical summary should not be generated