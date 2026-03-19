@audit @hipaa @access @patientrights @wip
Feature: Provide Patient Access to Health Records
As a compliance officer at Andromeda Surgical,
I want to provide patient access to health records,
So that I can ensure only authorized personnel gain entry and that all events are auditable under HIPAA §164.310(a)(1).
  
  Scenario: Deliver PHI upon patient request
    Given a patient submits a valid data access request
    When the request is verified
    Then the full PHI must be provided to the patient within 30 days

  Scenario: Deny access if request is invalid
    Given a request is submitted with insufficient identity proof
    When the system attempts to verify the request
    Then the access request must be rejected and a notification sent