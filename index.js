const puppeteer = require('puppeteer')
const express = require('express')
const maxpages = 32
const debug = false

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

async function init() {
    const app = express()
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
    });
    const pages = []
    const pages_status = []
    for (let i = 0; i < maxpages; i++) {
        pages[i] = await browser.newPage();
        pages_status[i] = false
    }

    async function releasePage(i)
    {
        pages_status[i] = false
    }

    async function getPage()
    {
        let i = 0
        let page
        for (i = 0; i < maxpages; i++) {
            if (!pages_status[i]) {
                pages_status[i] = true
                page = pages[i]
                return {page, i}
            }
        }
        await delay(1000 + randomIntFromInterval(0,1000));
        debug && console.log('all renderer busy, waiting 1 secs')
        return getPage()
    }
    
    async function printPDF(url) {
        const {page, i} = await getPage()
        debug && console.log('rendering pdf', url, 'on page', i)
        await page.goto(url, {waitUntil: 'networkidle0'});
        const pdf = await page.pdf({ format: 'A4', printBackground: true });
        debug && console.log('rendered pdf', url, 'on page', i)
        releasePage(i)
    
        return pdf
    }

    app.get('/', (req, res) => {
        res.send('Hello, World!')
    })

    app.get('/topdf', (req, res) => {
        printPDF(req.query.url).then(pdf => {
            res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdf.length })
            res.send(pdf)
        })
    })
    app.listen(3000, () => {
        debug && console.log('Server listening on port 3000')
    })    
}
init()