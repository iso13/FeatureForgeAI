@userauthentication
Feature: User Authentication
As a user, I want to authenticate with Login - Bolt so that I can access the application

Background:
  Given I am on the "Login - Bolt" login page
  And the page has loaded completely

Scenario: Successful login with valid credentials
  When I enter "standard_user" in the "usernameOrEmail" field
  And I enter "secret_sauce" in the "password" field
  And I click the "login" button
  Then I should be redirected to the products page
  And I should see the inventory list

Scenario: Login validation with empty fields
  When I leave the "usernameOrEmail" field empty
  And I leave the "password" field empty
  And I click the "login" button
  Then I should see validation error messages
  And the login button should remain disabled or show error

Scenario: Login fails with invalid credentials
  When I enter "invalid_user" in the "usernameOrEmail" field
  And I enter "wrong_password" in the "password" field
  And I click the "login" button
  Then I should see an error message
  And I should remain on the login page

Scenario: Login attempt with locked out user
  When I enter "locked_out_user" in the "usernameOrEmail" field
  And I enter "secret_sauce" in the "password" field
  And I click the "login" button
  Then I should see a locked out error message
  And I should remain on the login page

Scenario: Login with problem user account
  When I enter "problem_user" in the "usernameOrEmail" field
  And I enter "secret_sauce" in the "password" field
  And I click the "login" button
  Then I should be logged in successfully
  But I may experience visual glitches on the products page