@validateAIMedicalScribe @no-browser @hipaa @high-risk
Feature: AI assistant summarizes clinical encounters for providers  
  As a healthcare provider,  
  I want an AI agent to transcribe and summarize patient visits,  
  So that my documentation is complete, accurate, and HIPAA-compliant.

  Background:
    Given the AI agent has access to real-time audio of the clinical visit
    And the EMR system is connected for storing visit notes

  Scenario: Generate structured summary for a primary care visit
    When the doctor completes a routine checkup
    Then the AI should transcribe the conversation
    And extract relevant symptoms, history, and treatment plan
    And tag the summary with appropriate ICD-10 codes
    And store the summary in the patient's EMR chart

  @wip
  Scenario: Stop and notify if transcription confidence is low
    Given the room audio is unclear or inconsistent
    When the AI tries to transcribe the visit
    Then it should detect low confidence
    And halt the summary generation
    And notify the provider for manual documentation

  @wip
  Scenario: Retry if EMR write fails
    Given the EMR API is temporarily unavailable
    When the AI tries to save the summary
    Then it should retry with exponential backoff
    And log each failed attempt
    And send an alert if retries exceed 3 attempts

  @wip
  Scenario: Handle multiple languages
    Given the patient and provider switch between English and Spanish
    When the AI transcribes the encounter
    Then it should detect and translate appropriately
    And ensure the final summary is stored in English
    And highlight translated sections for review

  @wip
  Scenario: Resume documentation after data correction
    Given the AI halted due to missing patient metadata
    When the provider updates the missing fields in the EMR
    And resumes the AI assistant
    Then the AI should pick up the transcription from the previous checkpoint
    And complete and store the full summary