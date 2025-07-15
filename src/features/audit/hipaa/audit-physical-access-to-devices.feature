@audit @hipaa @physical @no-browser @hipaa-164.310-a-1
Feature: Audit Physical Access to Devices
As a compliance officer at Andromeda Surgical,
I want all physical access attempts to the surgical robotics lab to be logged and monitored,
So that I can ensure only authorized personnel gain entry and that all events are auditable under HIPAA §164.310(a)(1).

  Scenario: Log badge scan into surgical lab
    Given a user badge is scanned at the lab entry
    When access is granted
    Then the event must be logged with user ID, timestamp, and location

  Scenario: Alert on unauthorized physical access attempt
    Given a badge scan fails three consecutive times
    When the system detects abnormal access attempts
    Then a physical security alert must be issued to compliance