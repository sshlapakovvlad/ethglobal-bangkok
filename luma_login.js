async function loginToLuma(page) {
    try {
        // Go to login page
        await page.goto('https://lu.ma/signin', { waitUntil: 'networkidle2' });
        
        // Wait for the email input field and type email
        await page.waitForSelector('input[type="email"]');
        await page.type('input[type="email"]', "");
        
        // Click continue button
        await page.click('button[type="submit"]');
        
        // Wait for the magic link message or password input
        // If using password:
        await page.waitForSelector('input[type="password"]');
        await page.type('input[type="password"]', "");
        
        // Click the login button
        await page.click('button[type="submit"]');
        
        // Wait for navigation to complete
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        console.log('Successfully logged in!');
        
        // Save the session cookies for future use (optional)
        
    } catch (error) {
        console.error('Login failed:', error);
    }
}

module.exports = { loginToLuma };