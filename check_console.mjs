import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    await page.goto('http://localhost:5173/');
    await new Promise(r => setTimeout(r, 2000));
    
    // Switch to the second tab
    await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const mButton = Array.from(buttons).find(b => b.textContent && b.textContent.includes('Market Share'));
        if (mButton) {
           mButton.click();
        }
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
})();
