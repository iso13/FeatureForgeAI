import { Given, When, Then } from '@cucumber/cucumber';
import { LoginPage } from '@/pages/loginPage';
import { CustomWorld } from '@/support/world';

Given('I am on the FeatureGen login page', async function (this: CustomWorld) {
    const loginPage = new LoginPage(this.page!);
    this.basePage = loginPage;
    await loginPage.goto();
});

When('I enter valid credentials', async function (this: CustomWorld) {
    const loginPage = this.basePage as LoginPage;

    const email = process.env.FEATUREGEN_EMAIL;
    const password = process.env.FEATUREGEN_PASSWORD;

    if (!email || !password) {
        throw new Error('FEATUREGEN_EMAIL or FEATUREGEN_PASSWORD is not set in environment variables.');
    }

    await loginPage.login(email, password);
});

Then('I should be redirected to the dashboard', async function (this: CustomWorld) {
    const locator = this.page.getByText('Generate New Feature', { exact: true });

    await locator.waitFor({ state: 'visible', timeout: 10_000 });

});