function removeTag( html ) {
    return html.replace(/(<([^>]+)>)/gi, "");
}

/* eslint camelcase: 0 */
const Entities = require('html-entities').XmlEntities;

const entities = new Entities();

// Gets current product & map data into a certain format
const getProduct = (item) => {
    const ItemSize = item.package_dimensions
        ? `${item.package_dimensions.width} ${item.package_dimensions.dimension_unit_of_measure} X ${item.package_dimensions.height} ${item.package_dimensions.dimension_unit_of_measure} X ${item.package_dimensions.depth} ${item.package_dimensions.dimension_unit_of_measure}`
        : null;

    const ItemOption = item.variation_attributes ? Object.keys(item.variation_attributes).reduce((sumObj, variationKey) => {
        sumObj[variationKey] = item.variation_attributes[variationKey].join(', ');
        return sumObj;
    }, {}) : [];

    item.title = item.title.replace(/&#153;/g, '');

    const product = {
        ItemUrl: `https://www.target.com${item.url}`,
        ItemCode: item.tcin,
        ItemTitle: entities.decode(item.title).replace(/©|®|&#8482;|&#8482;|℠|™|&#153;/g, ''),
        BrandName: item.brand,
        ItemQty: 200,
        ItemOption,
        ItemOrigin: null,
        ItemWeight: item.package_dimensions ? `${item.package_dimensions.weight} ${item.package_dimensions.weight_unit_of_measure}` : null,
        ItemSize,
        ItemMaterial: item.bullet_description.filter(desc => desc.toLowerCase().includes('material')).length > 0
            ? item.bullet_description.filter(desc => desc.toLowerCase().includes('material'))[0].replace(/<B>|<\/B>|Material:/g, '')
            : null,
        ItemRetailPrice: item.price.reg_retail_max,
    };
    return product;
};


// 2021-04-24 New Version
// Gets current product & map data into a certain format
const getProduct2 = (item) => {

    // type 1
    const ritem = item.parent ? item.parent.item : item.item;
    const ItemUrl = ritem.enrichment ? ritem.enrichment.buy_url : '';

    var ItemSize = null;
    var ItemWeight = null;
    var ItemMaterial = null;
    var ItemOption = {};

    var ItemTitle = ritem.product_description ? ritem.product_description.title.replace(/&#153;/g, '') : '';

    const dimensions = new RegExp(/dimensions.*:/, "gi");
    const weight = new RegExp(/weight.*:/, "gi");
    const material = new RegExp(/material.*:/, "gi");

    var tmp = ritem.product_description ? ritem.product_description.bullet_descriptions : [];
    tmp.forEach(function(element){

            if( element.match(dimensions)){
                var r = removeTag(element);
                var ra = r.split(":");
                ItemSize = ra.pop().trim();
            }

            if( element.match(weight)){
                var r = removeTag(element);
                var ra = r.split(":");
                ItemWeight = ra.pop().trim();
            }

            if( element.match(material)){
                var r = removeTag(element);
                var ra = r.split(":");
                ItemMaterial = ra.pop().trim();
            }
    });

    // type 2
    const ItemCode = item.parent ? item.parent.tcin : item.tcin;
    const variation_attributes = item.parent ? item.parent.variation_summary : item.variation_summary;
    const price = item.parent ? item.parent.price : item.price;
    const ItemPrice = price.formatted_current_price ? price.formatted_current_price.replace(/\$/gi,"") : 0;
    const ItemRetailPrice = price.formatted_comparison_price ? price.formatted_comparison_price.replace(/\$/gi,"") : ItemPrice;

    // 옵션...
    if(variation_attributes && variation_attributes.themes) {
        variation_attributes.themes.forEach(function(element){

            var opt = element.swatches.reduce((sumObj, variationKey) => {
                sumObj.push(variationKey.value);
                return sumObj;
            }, []);

            ItemOption[element.name] = opt.join(",");
        });
    }

    const product = {
        ItemUrl: ItemUrl,
        ItemCode: ItemCode,
        ItemTitle: entities.decode(ItemTitle).replace(/©|®|&#8482;|&#8482;|℠|™|&#153;/g, ''),
        BrandName: ritem.primary_brand ? ritem.primary_brand.name : '',
        ItemQty: 200,
        ItemOption: ItemOption,
        ItemOrigin: null,
        ItemWeight: ItemWeight,
        ItemSize: ItemSize,
        ItemMaterial: ItemMaterial,
        ItemPrice : ItemPrice,
        ItemRetailPrice: ItemRetailPrice,
    };
    return product;
};

module.exports = {
    getProduct,
    getProduct2
};
