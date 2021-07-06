Apify = require('apify');
const tools = require('./tools');


const {
    utils: { log, requestAsBrowser },
} = Apify;



// var ItemOptionData = [
//     { tcin: '53364661', color: 'White', size: 'XS' },
//     { tcin: '53364671', color: 'White', size: 'S' },
//     { tcin: '53364684', color: 'White', size: 'M' },
//     { tcin: '53364694', color: 'White', size: 'L' },
//     { tcin: '53364701', color: 'White', size: 'XL' },
//     { tcin: '53364708', color: 'White', size: 'XXL' },
//     { tcin: '78816588', color: 'White', size: 'L Husky' },
//     { tcin: '78816581', color: 'White', size: 'XL Husky' },
//     { tcin: '78816585', color: 'White', size: 'XXL Husky' },
//     { tcin: '53364685', color: 'Black', size: 'XS' },
//     { tcin: '53364695', color: 'Black', size: 'S' },
//     { tcin: '53364704', color: 'Black', size: 'M' },
//     { tcin: '53364625', color: 'Black', size: 'L' },
//     { tcin: '53364639', color: 'Black', size: 'XL' },
//     { tcin: '53364654', color: 'Black', size: 'XXL' },
//     { tcin: '78816477', color: 'Black', size: 'L Husky' },
//     { tcin: '78816478', color: 'Black', size: 'XL Husky' },
//     { tcin: '78816479', color: 'Black', size: 'XXL Husky' },
//     { tcin: '53364709', color: 'Navy', size: 'XS' },
//     { tcin: '53364710', color: 'Navy', size: 'S' },
//     { tcin: '53364711', color: 'Navy', size: 'M' },
//     { tcin: '53364633', color: 'Navy', size: 'L' },
//     { tcin: '53364641', color: 'Navy', size: 'XL' },
//     { tcin: '53364646', color: 'Navy', size: 'XXL' },
//     { tcin: '78816586', color: 'Navy', size: 'L Husky' },
//     { tcin: '78816587', color: 'Navy', size: 'XL Husky' },
//     { tcin: '78816583', color: 'Navy', size: 'XXL Husky' },
//     { tcin: '53364680', color: 'Red', size: 'XS' },
//     { tcin: '53364692', color: 'Red', size: 'S' },
//     { tcin: '53364630', color: 'Red', size: 'M' },
//     { tcin: '53364643', color: 'Red', size: 'L' },
//     { tcin: '53364650', color: 'Red', size: 'XL' },
//     { tcin: '53364659', color: 'Red', size: 'XXL' },
//     { tcin: '78816580', color: 'Red', size: 'L Husky' },
//     { tcin: '78816582', color: 'Red', size: 'XL Husky' },
//     { tcin: '78816584', color: 'Red', size: 'XXL Husky' }
//   ];

//  안되면 이걸 써야 합니다 .. 오브젝트 중복 제거 ..
//   var ItemOption = {};
//   ItemOptionData.forEach((optionData) => {

//     var c = Object.keys(optionData).reduce(function(sumObj, currentColumn, currentIndex, array) {
//         if( currentColumn == "tcin") return;

//         if(!ItemOption[currentColumn]) ItemOption[currentColumn] = [];

//         if(ItemOption[currentColumn].includes( optionData[currentColumn] ) == false )
//             ItemOption[currentColumn][ItemOption[currentColumn].length] = optionData[currentColumn];

//         return sumObj;
//     }, {});
// });

// console.log(ItemOption);
//   return;

console.log(11111112322211);



// Create crawler
Apify.main(async () => {

    log.info('PHASE -- STARTING ACTOR.');

    global.inputData = await Apify.getInput();
    log.info(`ACTOR OPTIONS: -- ${JSON.stringify(global.inputData)}.`);

    // Validate inputs
    tools.checkInput();

    // 디버그용. !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! /9998 - localtest , 9999 - test
    if (global.inputData.url == "9999") {
        log.setLevel(log.LEVELS.DEBUG);
    }



    // Create request queue
    const requestQueue = await Apify.openRequestQueue();


    // 2020-10-12 추가된 코드

    // Initialize first request
    const pages = await tools.getSources();

    if (log.getLevel() == log.LEVELS.DEBUG)
        log.debug('start pages: ', pages);

    for (const page of pages) {
        // 비동기 해제함.
        await requestQueue.addRequest({...page }); // Rest 파라미터 (Rest Parameter) // 여기
    }
    // // 오후 10:17 2020-02-22 디버그 ...
    // var c = await requestQueue.getInfo();
    // console.log(c);
    // //console.log(requestQueue);

    // Create route
    const router = tools.createRouter({ requestQueue });

    log.info('PHASE -- SETTING UP CRAWLER.');
    const crawler = new Apify.BasicCrawler({
        requestQueue,
        handleRequestTimeoutSecs: 300,
        maxRequestRetries: 5,
        useApifyProxy: false,
        useSessionPool: true,
        handleRequestFunction: async (context) => {
            const { request, session } = context;
            log.debug(`CRAWLER -- Processing ${request.url}`);

            // Send request
            const response = await requestAsBrowser({
                url: request.url,
                method: 'GET',
                proxyUrl: tools.createProxyUrl(session.id),
                // proxyUrl:null ,
                timeoutSecs: 120,
                abortFunction: (res) => {
                    // Status code check
                    if (!res || (res.statusCode !== 200 && res.statusCode !== 206)) {
                        session.markBad();
                        throw new Error(`We got ${res.statusCode}. Retrying`);
                    }
                    session.markGood();
                    return false;
                },
            }).catch((err) => {
                session.markBad();
                throw new Error(err);
            });

            const data = response.body;

            // Add to context
            context.data = data;

            // Redirect to route
            await router(request.userData.label, context);
        },
    });

    log.info('PHASE -- STARTING CRAWLER.');
    await crawler.run();
    log.info('PHASE -- ACTOR FINISHED.');


});
