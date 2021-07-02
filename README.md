# Table of Contents
1. [Description](#description)
2. [Options](#options)
3. [Actor Flow](#actor-flow)
4. [Sample Result](#sample-result)



<a name="description"></a>
## Description
An Apify actor that fetches products from target.com

<a name="options"></a>
## Options
- category => Category ID to search
- search => Search keyword
- maxPages => How many pages to crawl. If the limit is null or 0 or missing then search all pages.
- lat => Latitude for shipping info.
- lng => Longitude for shipping info.
- zip => Zip for shipping info.
- state => State for shipping info.

<a name="actor-flow"></a>
## Actor Flow
1) Actor goes through all pages of the search result
2) Fetches product details from the list
3) Fetches product quantity from product detail endpoint
4) Fetches shipping info from the location endpoint by using the given inputs
5) Pushes data

<a name="sample-result"></a>
## Sample Result
```
{
  "ItemUrl": "https://www.target.com/p/dell-inspiron-15-6-2-in-1-laptop-core-i7-8565u-8gb-ram-512gb-ssd-silver-8th-gen-i7-8565u-in-plane-switching-technology-intel-uhd-graphics-620/-/A-79147628",
  "ItemCode": "A-79147628",
  "ItemTitle": "Dell Inspiron 15.6\" 2-in-1 Laptop Core i7-8565U 8GB RAM 512GB SSD Silver - 8th Gen i7-8565U - In-plane Switching Technology - Intel UHD Graphics 620",
  "BrandName": "Dell",
  "ItemPrice": 734.99,
  "ItemStatus": "reg",
  "StandardImage": "https://target.scene7.com/is/image/Target/GUEST_49eef077-b199-4669-8604-aafb94bf3724",
  "OtherImages": [
    "https://target.scene7.com/is/image/Target/GUEST_5aa8c0f3-f934-4990-912d-022f8bee86b0",
    "https://target.scene7.com/is/image/Target/GUEST_5528f7d4-6b09-4426-9679-0e473f86c27d",
    "https://target.scene7.com/is/image/Target/GUEST_bb956655-0271-4f34-969a-be7101ee5b65",
    "https://target.scene7.com/is/image/Target/GUEST_ecafd5ce-20c4-4c37-84c4-99e80946e0b7",
    "https://target.scene7.com/is/image/Target/GUEST_ad50d3a8-6b1a-4816-b730-caabb6f86a3f"
  ],
  "ItemDescription": "Dell Inspiron 15.6\" 2-in-1 Laptop More than a pretty interface Processor power: With 8th Gen Intel? Core? i7-8565U processor, you have ample power for all your entertainment, projects and more. More memory: 8GB DDR4 memory means larger bandwidth and faster load times. Additionally, switching between applications is a breeze, even while running multiple programs simultaneously. Solid-state drive: 512GB M.2 PCIe NVMe Solid State Drive for a much faster response time, quieter performance and improved shock resistance compared to conventional hard drives and is even faster than regular SATA SSDs.",
  "ItemBulletDescriptions": [
    "<B>Electronics Condition:</B> New",
    "<B>System RAM:</B> 8 gigabyte",
    "<B>Data Storage Drive Capacity:</B> 512GB solid state disk",
    "<B>Memory RAM Type:</B> DDR4",
    "<B>Screen Size:</B> 15.6 inches",
    "<B>Model name:</B> I7586-7502SLV-PUS",
    "<B>Operating System:</B> Windows 10 Home",
    "<B>Battery:</B> 1 Non-universal Lithium ion, Required, included",
    "<B>Warranty:</B> 1 year limited warranty. To obtain a copy of the manufacturer's or supplier's warranty for this item prior to purchasing the item, please call Target Guest Services at 1-800-591-3869"
  ],
  "ItemSoftBullets": [
    "Display: 15.6\" 1920 x 1080",
    "SSD: 512 GB",
    "Memory: 8 GB DDR4",
    "Processor: Intel Core i7 i7-8565U",
    "Graphics: Intel UHD Graphics 620"
  ],
  "ItemWeight": "5.0 POUND",
  "ItemSize": {
    "width": "13.0 INCH",
    "height": "3.0 INCH",
    "depth": "19.0 INCH"
  },
  "ItemElectronicsCondition": "New",
  "ItemSystemRAM": "8 gigabyte",
  "ItemDataStorage Drive Capacity": "512GB solid state disk",
  "ItemMemoryRAM Type": "DDR4",
  "ItemScreenSize": "15.6 inches",
  "ItemModelname": "I7586-7502SLV-PUS",
  "ItemOperatingSystem": "Windows 10 Home",
  "ItemBattery": "1 Non-universal Lithium ion, Required, included",
  "ItemWarranty": "1 year limited warranty. To obtain a copy of the manufacturer's or supplier's warranty for this item prior to purchasing the item, please call Target Guest Services at 1-800-591-3869"
}

```
