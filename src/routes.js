/* eslint camelcase: 0 */
// routes.js
const Apify = require('apify');
const cheerio = require('cheerio');
const extractors = require('./extractors');
const tools = require('./tools');


const {
    utils: { log, requestAsBrowser },
} = Apify;


function findTextAndReturnRemainder(target, variable){
    var chopFront = target.substring(target.search(variable)+variable.length,target.length);
    var result = chopFront.substring(0,chopFront.search(";"));
    return result;
}

// Fetches list page
exports.ITEMFIND = async ({ data, request }, { requestQueue }) => {
    log.info(`PHASE: -- Fetching list page: ${request.url}`);

    const $ = cheerio.load(data);
    var product = {};

    $('script').each( function () {
        if( $(this).html().match(/^window\.__TGT_DATA__.*=/) != null ){

            var origin_html = $(this).html().replace(RegExp(/^window\.__TGT_DATA__.*=/, "g"),"var tag_data = ");
            eval (origin_html);

                if( tag_data ){ // 2021-03-15 허웅 ... 이거 뽑을려고 -_- 노가다를 ......
                    
                    var tag_product = tag_data["__PRELOADED_QUERIES__"]["queries"].pop().pop().data.product;
                    var ItemOption = {};

                    if( tag_product.variation_hierarchy ){

                        // 나중에 수정될수 있습니다. 그냥 픽스버전이라 .... 타겟이 업데이트 되면 낭패..
                        for( var DDD in tag_product.variation_hierarchy ) {

                            optionData = tag_product.variation_hierarchy[DDD];
                        
                            // 1차 옵션 ...
                            if( optionData.name && optionData.value ) {
                                var currentColumn = optionData.name;
                                var currentValue = optionData.value;
                        
                                if(!ItemOption[currentColumn]) ItemOption[currentColumn] = [];
                                if(ItemOption[currentColumn].includes( currentValue ) == false )
                                    ItemOption[currentColumn][ItemOption[currentColumn].length] = currentValue;
                            }
                        
                            // 2차 옵션 ...
                            if( typeof optionData.variation_hierarchy == "object" ) {
                        
                                for( var EEE in optionData.variation_hierarchy ){
                        
                                    optionData2 = optionData.variation_hierarchy[EEE];
                        
                                    if( optionData2.name && optionData2.value ) {
                                        var currentColumn = optionData2.name;
                                        var currentValue = optionData2.value;
                                
                                        if(!ItemOption[currentColumn]) ItemOption[currentColumn] = [];
                                        if(ItemOption[currentColumn].includes( currentValue ) == false )
                                            ItemOption[currentColumn][ItemOption[currentColumn].length] = currentValue;
                                    }
                                }
                            }
                        }
                        
                        // 깔맞춤.
                        for( var c in ItemOption ) ItemOption[c] = ItemOption[c].join(",");

                    }

           

                    product = {
                        ItemUrl: decodeURIComponent( tag_product.item.enrichment.buy_url),
                        ItemCode: tag_product.tcin,
                        ItemTitle: tag_product.item.product_description.title.replace(/©|®|&#8482;|&#8482;|℠|™|&#153;/g, ''),
                        BrandName: tag_product.item.primary_brand.name,
                        ItemQty: 200,
                        ItemOption: ItemOption,
                        ItemOrigin: null,
                        ItemSize: ( 
                            tag_product.item.package_dimensions ?
                            ( 
                                tag_product.item.package_dimensions.width + " " + tag_product.item.package_dimensions.dimension_unit_of_measure + " X " 
                                + tag_product.item.package_dimensions.height + " " + tag_product.item.package_dimensions.dimension_unit_of_measure + " X " 
                                + tag_product.item.package_dimensions.depth + " " + tag_product.item.package_dimensions.dimension_unit_of_measure 
                            )
                            : ""
                        ),
                        ItemWeight: tag_product.item.package_dimensions ? tag_product.item.package_dimensions.weight : null,
                        ItemMaterial: tag_product.item.product_description.bullet_descriptions.join(""),
                        // ItemMaterial: tag_product.item.product_description.bullet_descriptions.join("").replace(/<B>|<\/B>|Material:/g, ''),
                        ItemRetailPrice: 0,
                    };



                }

            return;
        }
        // console.log('JS: %s',$(this).html());
    });

    if(product) {

    

        // Fetch product quantity
        await requestQueue.addRequest({
            url: `https://www.target.com/p/x/-/A-${product.ItemCode}`,
            userData: {
                label: 'ITEMDETAIL',
                product,
            },
        }, { forefront: true });
    }
};


// Fetches list page
exports.LIST = async ({ data, request }, { requestQueue }) => {
    
    log.info(`PHASE: -- Fetching list page: ${request.url}`);

    // Get products - Old version
    const items = JSON.parse(data).search_response.items.Item.filter(item => !item.error_message);

    // New version
    // var pdata = JSON.parse(data);
    // const items = pdata.data.search.products.filter(products => !products.error_message);


    // Extract items
    for (const item of items) {
        // Fetch product information
        const product = extractors.getProduct(item);

        // Fetch product quantity
        await requestQueue.addRequest({
            url: `https://www.target.com/p/x/-/A-${product.ItemCode}`,
            userData: {
                label: 'ITEMDETAIL',
                product,
            },
        }, { forefront: true });
    }

  
    log.debug(`PHASE: -- Fetched list page: ${request.url}`);
};

// Fetches item detail
exports.ITEMDETAIL = async ({ data, request }, { requestQueue }) => {
    const { product } = request.userData;
    log.info(`PHASE: -- Fetching item detail: ${product.ItemTitle}`);

    const $ = cheerio.load(data);

    const sourceImages = $('div[data-test="product-image"] picture')
        .filter((i, el) => $(el).find('source:first-child').attr('srcset'))
        .map((i, el) => `https:${$(el).find('source:first-child').attr('srcset').replace(/64x64|600x600/, '1200x1200')}`).get();
    const imgImages = $('div[data-test="product-image"] picture')
        .filter((i, el) => $(el).find('img:first-child').attr('src'))
        .map((i, el) => $(el).find('img:first-child').attr('src').replace(/wid=325&hei=325/, 'wid=1200&hei=1200')).get();


    product.ItemDescription = $('#product-details-tabs').html();
    product.StandardImage = imgImages[0];
    imgImages.splice(0, 1);
    product.OtherImages = sourceImages.concat(imgImages);

    // Get product url
    const productUrl = tools.getProductUrl(product.ItemCode);

    // Fetch product quantity
    await requestQueue.addRequest({
        uniqueKey: productUrl,
        url: productUrl,
        userData: {
            label: 'PRODUCT_DETAIL',
            product,
        },
    }, { forefront: true });


    log.debug(`PHASE: -- Fetched item detail: ${product.ItemTitle}`);
};

// Fetches detail for product
exports.PRODUCT_DETAIL = async ({ data, request }, { requestQueue }) => {
    const { product } = request.userData;
    log.info(`PHASE: -- Fetching detail for ${product.ItemCode}`);

    // Parse data
    const { item } = JSON.parse(data).product;

    // Get partial product detail
    if (item.handling && item.handling.import_designation_description) {
        product.ItemQty = item.attributes.max_order_qty;
        product.ItemOrigin = item.handling.import_designation_description;
    }


    product.UPCCode = item.child_items && item.child_items.length > 0 ? item.child_items[0].upc : item.upc;
    product.ISBNCode = item.child_items && item.child_items.length > 0 ? item.child_items[0].isbn : item.isbn;
    product.ItemModelNo = item.child_items && item.child_items.length > 0 ? item.child_items[0].dpci : item.dpci;

    // Create option data base
    product.ItemOptionData = item.child_items && item.child_items.length > 0 ? item.child_items.map(childItem => ({
        tcin: childItem.tcin,
        ...childItem.variation.flexible_themes,
    })) : [];


    // Add to request queue
    // Find prices
    await requestQueue.addRequest({
        url: `https://redsky.target.com/web/pdp_location/v1/tcin/${product.ItemCode}?pricing_store_id=3991&key=key`,
        userData: {
            label: 'PRODUCT_PRICE',
            product,
        },
    }, { forefront: true });


    log.debug(`PHASE: -- Fetched detail for ${product.ItemCode}`);
};

// Fetches pricing info
// Cross check with ItemOptionData
exports.PRODUCT_PRICE = async ({ data, request }) => {
    const { product } = request.userData;
    log.info(`PHASE: -- Fetching pricing info ${product.ItemCode}`);

    // Parse data
    const { child_items } = JSON.parse(data);
    const currentItemAvailabilities = [];
    const promises = [];


    // Check if shipping information is provided
    // Also check for availability
    const { lat, lng, zip, state } = global.inputData;
    if (product.ItemOptionData && product.ItemOptionData.length > 0) {

        //  안되면 이걸 써야 합니다 .. 오브젝트 중복 제거 .. 
        //   var ItemOption = {};

        // Crosscheck availabilities
        product.ItemOptionData.forEach((optionData) => {

            //  안되면 이걸 써야 합니다 .. 오브젝트 중복 제거 .. 
            //   ItemOptionData.forEach((optionData) => {

            //     var c = Object.keys(optionData).reduce(function(sumObj, currentColumn, currentIndex, array) {
            //         if( currentColumn == "tcin") return;

            //         if(!ItemOption[currentColumn]) ItemOption[currentColumn] = [];

            //         if(ItemOption[currentColumn].includes( optionData[currentColumn] ) == false )
            //             ItemOption[currentColumn][ItemOption[currentColumn].length] = optionData[currentColumn];
                    
            //         return sumObj;
            //     }, {});
            // });



            // Promise mapping
            promises.push(requestAsBrowser({
                url: tools.getProductLocationUrl(optionData.tcin, lat, lng, zip, state),
                method: 'GET',
                //proxyUrl: tools.createProxyUrl(Math.random()),
                proxyUrl:  null ,                
                timeoutSecs: 120,                
                abortFunction: (res) => {
                    return !res || res.statusCode !== 200;
                },
            }).then((response) => {
                const currentProduct = JSON.parse(response.body).product;
                // console.log(currentProduct);
                // const onlineAvailability = currentProduct.available_to_promise_store.products[0].availability_status !== 'OUT_OF_STOCK';
                const storeAvailability = currentProduct.available_to_promise_network.availability !== 'UNAVAILABLE';

                // console.log(onlineAvailability);
                // console.log(storeAvailability);

                // Push empty object
                currentItemAvailabilities.push({ ...optionData, availability: storeAvailability });
            }).catch(() => {
                // Push empty object
                currentItemAvailabilities.push({ ...optionData, availability: false, price: 0 });
            }));
        });


        // Call availabilities in parallel
        await Promise.all(promises);

        product.ItemRetailPrice = 0;

        // Cross check
        product.ItemOptionData = product.ItemOptionData.map((optionData) => {
            // Find if available
            const foundPriceItem = child_items.find(childItem => childItem.tcin === optionData.tcin);
            const foundAvailabilityItem = currentItemAvailabilities.find(childItem => childItem.tcin === optionData.tcin);

            // Map data
            const item = optionData;
            delete item.tcin;

            // Check price & availability
            item.price = foundPriceItem ? foundPriceItem.price.current_retail : 0;
            item.availability = foundAvailabilityItem ? foundAvailabilityItem.availability : false;

            product.ItemRetailPrice = foundPriceItem && product.ItemRetailPrice < foundPriceItem.price.reg_retail
                ? foundPriceItem.price.reg_retail
                : product.ItemRetailPrice;

            return item;
        });
        product.ItemStatus = product.ItemOptionData.map(option => option.availability).includes(true) ? 'On Sale' : 'Sold Out';
        product.ItemPrice = product.ItemOptionData.sort((a, b) => a.price - b.price)[0].price;

    } else {
        await requestAsBrowser({
            url: tools.getProductLocationUrl(product.ItemCode, lat, lng, zip, state),
            method: 'GET',
            //proxyUrl: tools.createProxyUrl(Math.random()),
            proxyUrl: null,
            timeoutSecs: 120,
            abortFunction: (res) => {
                return !res || res.statusCode !== 200;
            },
        }).then((response) => {
            const currentProduct = JSON.parse(response.body).product;
            product.ItemStatus = currentProduct.ship_methods.availability_status !== 'UNAVAILABLE' ? 'On Sale' : 'Sold Out';
        }).catch(() => {
            throw new Error('Retrying');
        });

        product.ItemPrice = JSON.parse(data).price.current_retail;
        product.ItemRetailPrice = JSON.parse(data).price.reg_retail;
    }

    console.log("ItemTitle===>" + product.ItemTitle);


    await Apify.pushData({...product });

    log.debug(`PHASE: -- Fetched pricing info ${product.ItemCode}`);
};
