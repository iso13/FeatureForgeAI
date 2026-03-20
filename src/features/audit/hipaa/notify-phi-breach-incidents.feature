@audit @hipaa @incident @breach @wip
Feature: Notify PHI Breach Incidents
As a compliance officer at Andromeda Surgical,
I want to notify PHI breach incidents,
So that I can ensure only authorized personnel gain entry and that all events are auditable under HIPAA §164.310(a)(1).
  
  Scenario: Log access anomaly from unknown location
    Given a user logs in from an unrecognized IP address
    When the activity is flagged as suspicious
    Then a PHI incident alert must be sent to the privacy officer

  Scenario: Notify HHS for large breach
    Given a confirmed PHI breach affecting more than 500 patients
    When the breach is logged in the system
    Then a report must be submitted to the HHS portal within 60 days