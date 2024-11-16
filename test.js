const puppeteer = require('puppeteer');
const { loginToLuma } = require('./luma_login.js'); 

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await loginToLuma(page);
    const url = 'https://lu.ma/5pfsbv2f';
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log("Page loaded");
    await page.click('button.luma-button.primary');
    await page.waitForNetworkIdle({ timeout: 5000 });
    await delay(1000);
    const result = await page.evaluate(() => {
        const formQuestions = [];
        
        // Look for elements within the form section
        // You might need to adjust this selector based on the actual HTML structure
        const formSection = document.querySelector('form') || 
                           document.querySelector('.form-section') ||
                           document.querySelector('[data-testid="registration-form"]');
                           
        if (formSection) {
            // Get all text elements within the form that look like questions
            const questionElements = formSection.querySelectorAll('label, .form-field-label');
            
            questionElements.forEach(element => {
                const text = element.innerText?.trim();
                if (text) {
                    formQuestions.push(text);
                }
            });
        }
        
        return {
            questions: formQuestions
        };
    });
    
    console.log('Form Questions found:');
    result.questions.forEach((question, index) => {
        console.log(`${index + 1}. ${question}`);
    });
    await page.screenshot({ path: `test.png`, fullPage: true });
    await browser.close();
})();