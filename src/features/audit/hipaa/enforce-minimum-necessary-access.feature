@audit @hipaa @security @accesscontrol @wip
Feature: Enforce Minimum Necessary Access
As a compliance officer at Andromeda Surgical,
I want to enforce minimum necessary access to PHI,
So that I can ensure only authorized personnel gain entry and that all events are auditable under HIPAA §164.310(a)(1).

  Scenario: Restrict support staff access to PHI
    Given a support staff user logs into the system
    When the user requests access to a patient record
    Then only non-clinical fields such as contact info should be visible

  Scenario: Restrict billing staff access to clinical notes
    Given a billing staff user is authenticated
    When they open a patient profile
    Then the clinical notes section must be hidden
