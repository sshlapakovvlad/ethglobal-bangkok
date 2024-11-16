const puppeteer = require('puppeteer');
const { loginToLuma } = require('./luma_login.js');
const fs = require('fs');

async function scrollAndGetEvents(page) {
    return await page.evaluate(async () => {
        const uniqueUrls = new Set();
        let previousHeight;
        let scrollAttempts = 0;
        const maxScrollAttempts = 50; // Adjust this number if needed

        while (scrollAttempts < maxScrollAttempts) {
            // Get current events
            const eventUrls = Array.from(document.querySelectorAll('a[href^="/"]'))
                .filter(link => {
                    const href = link.getAttribute('href');
                    const excludedPaths = ['/discover', '/home', '/create', '/calendar', '/signin', '/settings', 'home/calendars'];
                    return !excludedPaths.some(path => href === path) && 
                            href.match(/\/[a-zA-Z0-9-]{5,}$/);
                })
                .map(link => 'https://lu.ma' + link.getAttribute('href'));

            // Add new URLs to set
            eventUrls.forEach(url => uniqueUrls.add(url));

            // Get current scroll position
            previousHeight = document.documentElement.scrollHeight;

            // Scroll down
            window.scrollTo(0, previousHeight);

            // Wait for possible new content to load
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Check if we've reached the bottom
            const currentHeight = document.documentElement.scrollHeight;
            if (currentHeight === previousHeight) {
                scrollAttempts++;
                if (scrollAttempts >= 3) { // If height hasn't changed for 3 attempts, we're probably at the bottom
                    break;
                }
            } else {
                scrollAttempts = 0; // Reset counter if we found new content
            }
        }

        return Array.from(uniqueUrls);
    });
}

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await loginToLuma(page);
    const calendarUrl = 'https://lu.ma/devcon';
    await page.goto(calendarUrl, { waitUntil: 'networkidle2' });
    const eventUrls = await scrollAndGetEvents(page);
    console.log(eventUrls);
    for (const eventUrl of eventUrls) {
        await registerForEvent(page, eventUrl);
    }
    await browser.close();
})();

let screenshotIndex = 0;

async function registerForEvent(page, eventUrl) {
    try {
        await page.goto(eventUrl, { waitUntil: 'networkidle2' });
        console.log(`Registering for ${eventUrl}`);
        // Wait for network to be idle first
        await page.waitForNetworkIdle();
        console.log(`Waiting for button to be both present and clickable`);

        const isRegisteredAlready = await isRegistered(page);
        if(isRegisteredAlready) {
            console.log(`Already registered for ${eventUrl}`);
            return;
        }
        
        // Wait for button to be both present and clickable
        await page.waitForSelector('button.luma-button.primary', {
            visible: true,
            timeout: 5000
        });

        const buttonText = await page.$eval('button.luma-button.primary', button => button.textContent.trim());
        console.log('Button text:', buttonText);

        if (buttonText === "One-click Register" || buttonText === "One-click Apply") {
            console.log(`One-click register or apply found, clicking`);
            // Click the button
            await page.click('button.luma-button.primary');
            console.log(`Button clicked, waiting for network to be idle`);
            await page.waitForNetworkIdle({ timeout: 5000 });
            console.log(`Waiting for response`);
            await page.screenshot({ path: `registration-${screenshotIndex++}.png`, fullPage: true });
            const isRegistered = isRegistered(page);
            if (!isRegistered) {
                throw new Error('Registration failed');
            }
        } else if (buttonText === "Request to Join") {
            console.log(`Request to join found, clicking`);
            await page.click('button.luma-button.primary');
            await page.waitForNetworkIdle({ timeout: 5000 });

            const questions = await getFormQuestions(page);
            const fileExists = fs.existsSync('questions.csv');
            
            // Create CSV content
            const csvContent = questions
                .map(question => `"${question.replace(/"/g, '""')}",""`)
                .join('\n');
            
            // If file doesn't exist, create it with headers
            if (!fileExists) {
                fs.writeFileSync('questions.csv', 'question,answer\n');
            }
            
            // Append the new questions
            fs.appendFileSync('questions.csv', csvContent + '\n');
            
            console.log('Questions appended to questions.csv');
            console.log(questions);
        } else {
            console.log(`Unknown button text: ${buttonText}`);
        }
    } catch (error) {
        console.error('Failed to complete registration:', error);
        await page.screenshot({ path: `error-${screenshotIndex++}.png`, fullPage: true });
    }
}

async function isRegistered(page) {
    const isRegisteredAlready = await page.evaluate(() => {
        const isRegistered = document.body.innerText.includes("You’re In\n")
        const isTicket = document.body.innerText.includes("My Ticket\n")
        const isPendingApproval = document.body.innerText.includes("Pending Approval\n")
        return isRegistered && isTicket || isPendingApproval;
    });

    return isRegisteredAlready;
}

async function getFormQuestions(page) {
    const result = await page.evaluate(() => {
        const formQuestions = [];
        
        const formSection = document.querySelector('form') || 
                           document.querySelector('.form-section') ||
                           document.querySelector('[data-testid="registration-form"]');
                           
        if (formSection) {
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
    
    return result.questions;
}


// One-Click Apply
// Request to Join
// Join Waitlist
// Register
// Get Ticket
// One-Click Register