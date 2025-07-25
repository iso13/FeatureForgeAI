@formsubmission
Feature: Form Submission
As a user, I want to authenticate with Registration - Bolt so that I can access the application

Background:
  Given I am on the "Registration - Bolt" login page
  And the page has loaded completely

Scenario: Successful login with valid credentials
  When I enter "standard_user" in the "username" field
  And I enter "secret_sauce" in the "password" field
  And I click the "icon button" button
  Then I should be redirected to the products page
  And I should see the inventory list

Scenario: Login fails with invalid credentials
  When I enter "invalid_user" in the "username" field
  And I enter "wrong_password" in the "password" field
  And I click the "icon button" button
  Then I should see an error message
  And I should remain on the login page

Scenario: Login validation with empty fields
  When I leave the "username" field empty
  And I leave the "password" field empty
  And I click the "icon button" button
  Then I should see validation error messages
  And the login button should remain disabled or show error

Scenario: Login with performance user account
  When I enter "performance_glitch_user" in the "username" field
  And I enter "secret_sauce" in the "password" field
  And I click the "icon button" button
  Then I should be logged in successfully
  But the page load may be slower than normal