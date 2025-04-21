![BDD](docs/images/BDD.png)
# cucumber-playwright

# Cucumber Playwright Framework 🚀

This repository hosts a robust and scalable **Cucumber Playwright** framework designed to facilitate Behavior-Driven Development (BDD) practices for end-to-end testing. It seamlessly integrates **Cucumber** and **Playwright** in a TypeScript environment to deliver automated test scripts that are maintainable, efficient, and aligned with modern development practices.

---

## Key Features 🌟
- **BDD-Driven Design**: Write test cases in natural language using the Gherkin syntax, promoting collaboration between technical and non-technical stakeholders.
- **Playwright Integration**: Leverage Playwright’s fast, reliable, and capable browser automation for comprehensive test coverage across multiple platforms and devices.
- **TypeScript Support**: Ensure type safety and robust coding practices with a fully TypeScript-based implementation.
- **Flexible Tagging System**: Execute tests selectively using tags to support modular and targeted test execution.
- **Dynamic Reporting**: Generate detailed test execution reports in both JSON and HTML formats for better visibility into test results.
- **Custom Helpers**: Extend functionality with modular utilities such as `apiHelper` for API testing or `performance/loadTest` for performance testing.
- **Cross-Browser Testing**: Execute tests across multiple browsers (Chromium, Firefox, WebKit) and configurations with ease.
- **CI/CD Ready**: Seamlessly integrate with CI/CD pipelines for automated and continuous testing.

---

## Use Cases 🎯
- **AI Feature**: Leverage AI to automatically generate Cucumber feature files, streamlining the creation of BDD scenarios and enhancing productivity.
- **End-to-End Testing**: Validate the complete user journey across web applications.
- **API Testing**: Automate API validations with reusable step definitions and dynamic payload management.
- **Performance Testing**: Incorporated k6 and Cucumber for running performance tests.
- **Mobile and Desktop Testing**: Extend capabilities to test across mobile devices and desktop browsers.
- **Accessibility (a11y) Testing**: Ensure digital accessibility compliance and create inclusive user experiences.
- **AI/ML Support**: Validate and test AI/ML models with advanced capabilities and integrations.

---

## Project Structure 📂
- **`src/features/`**: Contains feature files written in Gherkin syntax.
- **`src/steps/`**: Houses step definition files for implementing test steps.
- **`src/support/`**: Includes utilities, helpers, and configuration files for extended functionality.
- **`reports/`**: Stores test execution reports, both JSON and HTML formats.
- **`performance/`**: Contains performance testing scripts, such as `loadTest.js` for k6.

---

## Table of Contents
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [Writing Tests](#writing-tests)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Additional Resources](#additional-resources)

## Prerequisites

- [Node.js (>= 20.x)](https://nodejs.org/)
- [npm (>= 10.x)](https://www.npmjs.com/)

## Setup

1. **Clone the repository:**

   ```sh
   git clone https://github.com/iso13/cucumber-playwright.git
   cd cucumber-playwright
   ```

2. **Install dependencies:**

   ```sh
   npm install
   ```

3. **Install Playwright browsers:**

   ```sh
   npx playwright install
   ```

4. **Setup reports:**

   ```sh
   npm run prepReport
   ```

5. **Optional Install for Performance Testing k6 Globally: Install k6 globally on your system to use it as a CLI:**

   **Mac:**

   https://brew.sh/

   ```zsh
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

   https://grafana.com/docs/k6/latest/set-up/install-k6/

   ```zsh
   brew install k6
   ```

   **Debian/Ubuntu Linux:**

   https://grafana.com/docs/k6/latest/set-up/install-k6/

   ```bash
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   ```

   ```bash
   sudo apt-get install k6
   ```

   **Windows:**

   https://chocolatey.org/install

   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

   https://grafana.com/docs/k6/latest/set-up/install-k6/

   ```powershell
   choco install k6
   ```

## Running Features

1. **Run all features except features and or scenarios with @wip tag, work in progress:** (If this passes, you are all set)

   ```sh
   npm run cucumber -- --tags "not @wip"
   ```

2. **Run all tests:**

   ```sh
   npm run cucumber
   ```

3. **Run a specific feature by tag:**

   ```sh
   npm run cucumber -- --tags "@tagName"
   ```

## Project Structure

- `features/`: Contains the feature files written in Gherkin syntax.
- `steps/`: Contains the step definitions for the feature files.
- `support/`: Contains support files and hooks.


## Writing Tests

1. **Create a feature file in the `features/` directory:**

   ```gherkin
   @exampleFeature
   Feature: Example feature

     Scenario: Example scenario
       Given I open the homepage
       Then I should see the title "Example Domain"
   ```

2. **Create step definitions in the `steps/` directory:**

   ```typescript
   import { Given, Then } from 'cucumber';
   import { expect } from '@playwright/test';

   Given('I open the homepage', async function () {
     await page.goto('https://example.com');
   });

   Then('I should see the title {string}', async function (title) {
     const pageTitle = await page.title();
     expect(pageTitle).toBe(title);
   });
   ```
## Troubleshooting

- **Error: `npx playwright install` fails.**  
  Ensure that you are running a supported Node.js version (`>= 20.x`).

- **Tests are not running as expected.**  
  Make sure all dependencies are installed by running:
  
  ```sh
  npm install
  ```

## Contributing

Contributions are welcome! Please follow the [Contributing Guidelines](CONTRIBUTING.md) for submitting issues and pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Additional Resources

- [Cucumber Documentation](https://cucumber.io/docs/guides/10-minute-tutorial/)
- [Playwright Documentation](https://playwright.dev/docs/intro)

