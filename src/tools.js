/* eslint max-len: 0 */
const Apify = require('apify');
const routes = require('./routes');


const {
    utils: { log, puppeteer },
} = Apify;

// Iteratively fetch listing pages
// Intercept search requests
exports.getAPIRequests = async(webUrl) => {
    log.info(`Getting request from ${webUrl}`);



    // Open browser
    const browser = await Apify.launchPuppeteer({
        proxyUrl: this.createProxyUrl(Math.random()),
        headless: true,
        // useChrome: false, // -> 이부분 로컬에서는 풀어야 됩니다.  에러 -> apify.launchPuppeteer Failed to launch the browser process!
        stealth: true,
        handlePageTimeoutSecs: 60,
    });


    // Open new page
    const page = await browser.newPage();


    // Block requests
    await puppeteer.blockRequests(page, {
        urlPatterns: ['.css', '.jpg', '.jpeg', '.png', '.svg', '.gif', '.woff', '.pdf', '.zip', '*ads*', '*analytics*', '*facebook*', '*optimizely*', '*webp*', '*youtube*', '*bing*'],
    });

    // Set interception
    var searchRequest = null;
    var timerId = null;
    await page.setRequestInterception(true);
    await page.authenticate({ username: 'user', password: 'password' });


    // Promisify requests
    const checkForSearchRequest = new Promise(resolve => page.on('request', (request) => {

        const requestUrl = request.url();

        //if (requestUrl.includes('https://redsky.target.com/v2/plp/search')) {
        // if (requestUrl.includes('https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v1')) {
        if (requestUrl.includes('plp_search_v1')) { // new version ..

            console.log("requestUrl ===> " + requestUrl);
            // 2021-04-24 -_- 바뀌었네 ? 2번째를 타겟으로 ... 수정

            if(timerId) clearTimeout(timerId);
            timerId = setTimeout(() => searchRequest = request.url(), 3000);

            // if(searchRequest == null) searchRequest = 0;
            // else if(searchRequest == 0)
            //     searchRequest = request.url();
        }

        if (searchRequest) {
            resolve();
        }
        request.continue();
    }));


    // Open page
    await page.goto(webUrl, {
        waitFor: 'load',
        timeout: 120000,
    });


    // Intercept & search for API request
    await checkForSearchRequest;

    // Close browser
    await browser.close();

    return {
        baseURL: searchRequest.replace(/&offset=\d+/g, ''),
    };
};

// URL Builders
// exports.getBaseURL = (keyword, category) => {
//     const webUrl = `https://www.target.com/s?sortBy=relevance&Nao=0${category ? `&category=${category}` : ''}${keyword ? `&searchTerm=${escape(keyword.replace(' ', '+'))}` : ''}`;
//     return getAPIRequests(webUrl);
// };

// URL Builders
exports.getBaseURL = (keyword, category) => {
        const webUrl = `https://www.target.com/s?sortBy=relevance&Nao=0${category ? `&category=${category}` : ''}${keyword ? `&searchTerm=${escape(keyword.replace(' ', '+'))}` : ''}`;

    //var webUrl = `https://redsky.target.com/v2/plp/search?key=ff457966e64d5e877fdbad070f276d18ecec4a01&keyword=${escape(keyword.replace(' ', '+'))}&page=/s/${escape(keyword.replace(' ', '+'))}&channel=WEB&count=24&default_purchasability_filter=true&include_sponsored=true&offset=0&platform=desktop&pricing_store_id=2433&store_ids=2433%2C2432%2C1267%2C1188%2C2430&useragent=Mozilla%2F5.0+%28Windows+NT+10.0%3B+Win64%3B+x64%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F85.0.4183.102+Safari%2F537.36&visitor_id=0173322EDEA302018E4A9DE05E6155C9`;
    //webUrl = webUrl.replace(/&offset=\d+/g, '');

    console.log(webUrl);
    console.log("===================================");

    return exports.getAPIRequests(webUrl);
    //return { baseURL: webUrl };
};

exports.getProductUrl = (tcin) => {
    // example API call for development purposes:
    return `https://redsky.target.com/v3/pdp/tcin/${tcin}?excludes=taxonomy%2Cbulk_ship%2Cawesome_shop%2Cquestion_answer_statistics%2Crating_and_review_reviews%2Crating_and_review_statistics%2Cdeep_red_labels%2Cin_store_location&key=key&pricing_store_id=3991`;
};

exports.getProductLocationUrl = (tcin, lat, lng, zip, state) => {
    // example API call for development purposes:
    // https://redsky.target.com/v1/location_details/78305069?latitude=40.987&longitude=29.028&zip=34710&state=34&excludes=in_store_location%2Cavailable_to_promise_store

    return `https://redsky.target.com/v1/location_details/${tcin}?latitude=${lat}&longitude=${lng}&zip=${zip}&state=${state}`;
};

exports.getRandomInt = (min, max) => { //min ~ max 사이의 임의의 정수 반환
    return Math.floor(Math.random() * (max - min)) + min;
}

// Retrieves sources and returns object for request list
exports.getSources = async() => {
    const { pages, keyword, category } = global.inputData || {};
    log.debug('Getting sources');



    // Build target queue
    const targetPages = [];

    // Build category & keyword search url
    var { baseURL } = await this.getBaseURL(keyword, category);

    baseURL =  baseURL.replace("https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v1?" , "https://redsky.target.com/v2/plp/search?");


    // Check for sequential page targeting like: 1-5
    const isSequential = pages.split('-').length > 1;


    if (isSequential) {
        // Split pages
        const [minPage, maxPage] = pages.split('-');

        // Iterate and add to request queue
        for (let index = parseInt(minPage, 10); index <= parseInt(maxPage, 10); index++) {

            targetPages.push({
                url: `${baseURL}&offset=${(index - 1) * 24}`,
                userData: {
                    label: 'LIST',
                    page: index,
                    baseURL,
                },
            });
        }
    } else {
        // Split pages
        const manualPages = pages.split(',').map(val => parseInt(val, 10));

        // Iterate and add to request queue
        manualPages.forEach((page) => {
            targetPages.push({
                url: `${baseURL}&offset=${(page - 1) * 24}`,
                userData: {
                    label: 'LIST',
                    page,
                    baseURL,
                },
            });
        });
    }


    return targetPages;
};

// Create router
exports.createRouter = (globalContext) => {
    return async function(routeName, requestContext) {
        const route = routes[routeName];
        if (!route) throw new Error(`No route for name: ${routeName}`);
        log.debug(`Invoking route: ${routeName}`);
        return route(requestContext, globalContext);
    };
};

// Validate actor input if usage is correct or not
exports.checkInput = () => {
    const { pages, keyword, category } = global.inputData || {};

    // Validate if input is fine
    if (!category && !keyword) {
        throw new Error('Category or keyword must be provided!');
    } else if (!pages) {
        throw new Error('Pages must be provided!');
    } else if (pages.replace(/\d|-|,/g, '').length !== 0) {
        throw new Error('Pages must be provided in correct format: 1-5 or 1,2,3,6');
    }

    log.info('ACTOR - INPUT DATA IS VALID');
};

// Creates proxy URL
//exports.createProxyUrl = session => `http://auto:${process.env.APIFY_PROXY_PASSWORD}@proxy.apify.com:8000`;
exports.createProxyUrl = session => `http://session-${session},country-US:${process.env.APIFY_PROXY_PASSWORD}@proxy.apify.com:8000`;
//groups-RESIDENTIAL,
