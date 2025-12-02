/**
 * Product Extractor
 * E-commerce product pages থেকে product details extract করে
 * Supports: Amazon, eBay, Generic e-commerce sites
 */

import { CheerioAPI } from 'cheerio';
import {
  IExtractor,
  IExtractedProduct,
  ICustomSelectors,
  ExtractorType,
} from '../scraper.interface';

// Amazon-specific selectors
const AMAZON_SELECTORS = {
  title: '#productTitle, #title, .product-title-word-break',
  price: '.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, .a-price-whole',
  originalPrice: '.a-price[data-a-strike="true"] .a-offscreen, .a-text-price .a-offscreen',
  images: '#imgTagWrapperId img, #landingImage, .imgTagWrapper img, #main-image-container img',
  description: '#productDescription, #feature-bullets, .a-expander-content',
  rating: '.a-icon-star .a-icon-alt, #acrPopover, [data-hook="rating-out-of-text"]',
  reviewCount: '#acrCustomerReviewText, [data-hook="total-review-count"]',
  availability: '#availability, .a-color-success, .a-color-price',
  features: '#feature-bullets li, .a-unordered-list.a-vertical li',
  brand: '#bylineInfo, .po-brand .a-span9',
};

// eBay-specific selectors
const EBAY_SELECTORS = {
  title: '.x-item-title__mainTitle, .x-item-title__mainTitle .ux-textspans--BOLD, h1.it-title, .vim.x-item-title span',
  price: '.x-price-primary .ux-textspans, .x-bin-price__content .ux-textspans, [data-testid="x-price-primary"], .vi-VR-cvipPrice, .x-price-approx__price .ux-textspans',
  originalPrice: '.x-price-primary .ux-textspans--STRIKETHROUGH, .vi-originalPrice',
  images: '.ux-image-carousel-item img, .ux-image-grid img, #icImg, .ux-image-magnify__image--original',
  description: '.x-item-description, #desc_ifr, .d-item-description',
  rating: '.ux-summary__start--rating, .x-star-rating, .reviews-star-rating',
  reviewCount: '.ux-summary__count, .reviews-count, .ux-seller-section__item--seller-rating',
  availability: '.x-quantity__availability, .qtyTxt, .vi-quantity-available, .d-quantity__availability',
  condition: '.x-item-condition .ux-textspans, .x-item-condition-text, .vi-itm-cond',
  features: '.ux-layout-section--features li, .ux-labels-values--features li',
  brand: '.ux-labels-values--brand .ux-textspans--BOLD, .x-item-details-label-brand',
  seller: '.x-sellercard-atf__info__about-seller a, .mbg-nw, .x-sellercard-atf__data-item--seller a',
};

// AliExpress-specific selectors (robust patterns for obfuscated class names)
const ALIEXPRESS_SELECTORS = {
  // Title - working well
  title: '.product-title-text, h1[data-pl="product-title"], .title--wrap--UUHae_g h1, [class*="title--title"], [class*="HazeProductTitle"]',

  // Price - HEAVILY enhanced for AliExpress's dynamic rendering
  // AliExpress renders prices in spans with .notranslate class
  price: [
    // Most reliable: notranslate spans containing currency/numbers (AliExpress 2024)
    '[class*="price--currentPriceText"] .notranslate',
    '[class*="price--current"] .notranslate',
    '[class*="es--wrap--"] .notranslate',
    // Data attributes (most stable)
    '[data-pl="product-price"]',
    '[data-spm="price"]',
    // Fuzzy class patterns for obfuscated names
    '[class*="Price--currentPriceText"]',
    '[class*="price--current"]',
    '[class*="Price--current"]',
    '[class*="snow-price"] .notranslate',
    '[class*="snow-price"]',
    // The actual price wrapper in new AliExpress design
    '[class*="es--wrap"] span.notranslate',
    '[class*="es--wrap"]',
    // Currency specific patterns
    '[class*="price"] .notranslate',
    '.notranslate[class*="price"]',
    // Generic notranslate (price extraction done in JS fallback)
    'span.notranslate',
    // Legacy patterns
    '.uniform-banner-box-price',
    '.product-price-current',
    '[class*="uniform-banner"] [class*="price"]',
    '[class*="product-price"]',
  ].join(', '),

  // Original Price
  originalPrice: [
    '[class*="price--original"] .notranslate',
    '[class*="price--original"]',
    '[class*="price--del"]',
    '[class*="price--originalPrice"]',
    '.product-price-origin',
    '[class*="price"] del',
    '[class*="price"] s',
    '[class*="Price--original"]',
  ].join(', '),

  // Images - with lazy-load support
  images: [
    '[class*="slider--img"] img',
    '[class*="image-view"] img',
    '[class*="gallery"] img',
    '[class*="magnifier--image"] img',
    'img[src*="alicdn"]',
    'img[data-src*="alicdn"]',
    '[class*="thumbnail"] img',
    '[class*="sku-property"] img',
    '[class*="images--imageWindow"] img',
  ].join(', '),

  // Rating - HEAVILY enhanced for AliExpress seller/product ratings
  // AliExpress shows ratings like "5" or "98.1%" in seller section
  rating: [
    // New AliExpress rating patterns (2024)
    '[class*="reviewer--wrap"] [class*="rating"]',
    '[class*="overview-rating"] [class*="rating"]',
    '[class*="rating--wrap--"] span',
    '[class*="rating--average"]',
    '[class*="rating--value"]',
    '[class*="overview-rating"] [class*="average"]',
    '.overview-rating-average',
    // Star-based ratings
    '[class*="star--rating"] [class*="value"]',
    '[class*="Stars--value"]',
    // Review/rating numbers
    '[class*="review--value"]',
    '[class*="Rating--average"]',
    '[class*="review--rating"]',
    '[class*="Reviews--rating"]',
    '[class*="Reviews--score"]',
    // Score indicators
    '[class*="score"]',
    '[class*="rating-value"]',
    // Seller rating percentage
    '[class*="seller--rating"]',
    '[class*="Positive"]',
  ].join(', '),

  // Description - enhanced
  description: '.product-description, #product-description, [class*="description"], .detail--desc--PN1DuaM, [class*="detail--desc"], [class*="Specification"]',

  // Review Count
  reviewCount: '.product-reviewer-reviews, [class*="reviewer--reviews"], [class*="review--count"], [class*="rating--count"], [class*="Reviews--reviewNum"]',

  // Availability
  availability: '.product-quantity-info, [class*="quantity--info"], [class*="stock"], [class*="inventory"], [class*="Quantity--info"]',

  // Features
  features: '.product-specs-list li, [class*="specification"] li, .sku-property-list li, [class*="sku-property"] li, [class*="Specification"] li',

  // Brand/Store
  brand: '.product-store-name, [class*="store--name"], [class*="store-info"], [class*="seller--storeName"], [class*="Store--name"]',

  // Seller - separate from brand
  seller: [
    '[class*="seller--name"]',
    '[class*="store--storeName"]',
    '[class*="store-name"]',
    'a[href*="/store/"]',
    '[class*="Store--storeName"]',
  ].join(', '),

  // Shipping
  shipping: '.product-shipping-info, [class*="shipping--text"], [class*="delivery--info"], .dynamic-shipping, [class*="logistics"], [class*="Shipping--text"]',
};

// Alibaba.com-specific selectors (B2B platform)
const ALIBABA_SELECTORS = {
  // Title
  title: [
    '.module-pdp-title h1',
    '.product-title h1',
    'h1.product-name',
    '[class*="title"] h1',
    '.ma-title',
    'h1[data-spm]',
    '.detail-title h1',
  ].join(', '),

  // Price - Alibaba shows price ranges like "$0.50 - $2.00"
  price: [
    '.price-item .price',
    '.module-price .price',
    '[class*="price-value"]',
    '.ma-spec-price .price',
    '.ladder-price .price',
    '[class*="price"] .num',
    '.product-price-value',
    '[data-spm-anchor-id*="price"]',
    '.price-range',
    '.ma-ref-price',
  ].join(', '),

  // Original Price
  originalPrice: [
    '.original-price',
    '.reference-price',
    '.ma-ref-price del',
    '[class*="price"] del',
    '[class*="price"] s',
  ].join(', '),

  // Images
  images: [
    '.detail-gallery-turn img',
    '.main-image-wrapper img',
    '.vertical-img-wrap img',
    '.module-pdp-media img',
    'img[src*="alicdn.com"]',
    'img[src*="cbu01.alicdn"]',
    '.image-preview img',
    '.gallery-preview img',
    '[class*="gallery"] img',
    '.detail-image img',
  ].join(', '),

  // Description
  description: [
    '.do-entry-item',
    '.module-pdp-info',
    '.product-description',
    '.detail-description',
    '[class*="description"]',
    '.product-prop-main',
  ].join(', '),

  // Rating
  rating: [
    '.seb-supplier-review__score',
    '.supplier-review-score',
    '[class*="review-score"]',
    '[class*="rating-value"]',
    '.transaction-history .score',
    '[class*="star-rating"]',
  ].join(', '),

  // Review Count
  reviewCount: [
    '.seb-supplier-review__count',
    '.supplier-review-count',
    '[class*="review-count"]',
    '.transaction-count',
  ].join(', '),

  // Availability / MOQ
  availability: [
    '.ma-quantity-range',
    '.moq-value',
    '.min-order',
    '[class*="moq"]',
    '.module-quantity',
    '.step-val',
  ].join(', '),

  // Features / Specifications
  features: [
    '.do-entry-list .do-entry-item',
    '.module-attribute .attribute-item',
    '.product-prop-list li',
    '.product-attrs-item',
    '[class*="attribute"] li',
    '.spec-item',
  ].join(', '),

  // Brand / Supplier
  brand: [
    '.supplier-name a',
    '.module-supplier-info .name',
    '.company-name',
    '[class*="supplier-name"]',
    '.seb-supplier__name',
  ].join(', '),

  // Seller / Supplier info
  seller: [
    '.supplier-name',
    '.module-company-name',
    '.company-info .name',
    '[class*="supplier"] a',
    '.seb-supplier__company',
  ].join(', '),

  // Shipping / Lead Time
  shipping: [
    '.shipping-info',
    '.lead-time',
    '.delivery-time',
    '[class*="shipping"]',
    '.logistics-info',
  ].join(', '),
};

// Walmart-specific selectors (NextJS with __NEXT_DATA__ JSON blob)
const WALMART_SELECTORS = {
  // Title - multiple fallbacks
  title: [
    'h1[itemprop="name"]',
    'h1.prod-ProductTitle',
    '[data-testid="product-title"]',
    'h1.lh-copy',
    'h1[class*="ProductTitle"]',
    '.prod-product-title h1',
  ].join(', '),

  // Price - Walmart uses complex price structures
  price: [
    '[data-testid="price-wrap"] [itemprop="price"]',
    '[itemprop="price"]',
    '.price-characteristic',
    '[data-automation="product-price"]',
    '[class*="price-main"]',
    'span.f1',
    '[data-testid="currentPrice"]',
  ].join(', '),

  // Original Price (strikethrough)
  originalPrice: [
    '[data-testid="list-price"]',
    '.strike-through .price-main-block',
    '[class*="was-price"]',
    'span.strike-through',
  ].join(', '),

  // Images - Walmart has carousel + hero image
  images: [
    '[data-testid="hero-image-container"] img',
    '.prod-hero-image-container img',
    '[class*="carousel"] img',
    'img[data-testid="product-image"]',
    '[class*="ProductImageCarousel"] img',
    'img[itemprop="image"]',
  ].join(', '),

  // Description
  description: [
    '[data-testid="product-description"]',
    '.about-product-content',
    '#product-description',
    '.prod-ProductDescription',
    '[class*="product-description"]',
  ].join(', '),

  // Rating - Walmart shows ratings differently
  rating: [
    '[data-testid="rating-stars"] [itemprop="ratingValue"]',
    '[itemprop="ratingValue"]',
    '[class*="rating"] span[class*="average"]',
    '.stars-reviews-count .average-rating',
  ].join(', '),

  // Review Count
  reviewCount: [
    '[itemprop="reviewCount"]',
    '[data-testid="reviews-count"]',
    '.stars-reviews-count',
    'a[href="#reviews"]',
  ].join(', '),

  // Availability
  availability: [
    '[data-testid="add-to-cart-section"]',
    '[class*="fulfillment-option"]',
    '.prod-fulfillment-header',
    '[data-testid="availability"]',
  ].join(', '),

  // Features
  features: [
    '[data-testid="product-highlights"] li',
    '.product-specifications tr',
    '.prod-AboutThis li',
    '[class*="specification"] li',
  ].join(', '),

  // Brand
  brand: [
    'a[data-testid="brand-link"]',
    '[itemprop="brand"]',
    '.prod-brandName a',
    '[class*="ProductBrand"]',
  ].join(', '),
};

// Target-specific selectors (React with data-test attributes)
const TARGET_SELECTORS = {
  // Title
  title: [
    'h1[data-test="product-title"]',
    '[data-test="@web/ProductDetails"] h1',
    'h1[class*="Heading"]',
    'span[itemprop="name"]',
  ].join(', '),

  // Price - Target uses data-test attributes
  price: [
    'span[data-test="product-price"]',
    '[data-test="product-price-current"]',
    '[data-test="@web/ProductPrice"] span',
    '[class*="Price-module"] span',
    'span[itemprop="price"]',
  ].join(', '),

  // Original Price
  originalPrice: [
    '[data-test="product-price-compare"]',
    '[data-test="product-regular-price"]',
    '[class*="Price-module"] del',
    '[class*="strikethrough"]',
  ].join(', '),

  // Images
  images: [
    '[data-test="@web/ProductImage"] img',
    '[data-test="product-carousel"] img',
    '[class*="ProductImages"] img',
    'img[data-test="product-image"]',
    'picture img',
  ].join(', '),

  // Description
  description: [
    '[data-test="productDescription"]',
    '[data-test="@web/ProductDetails"] [class*="Description"]',
    '#description-content',
    '[class*="ProductDescription"]',
  ].join(', '),

  // Rating
  rating: [
    '[data-test="rating"] span',
    '[class*="RatingSummary"] span',
    '[itemprop="ratingValue"]',
    '[data-test="@web/Rating"]',
  ].join(', '),

  // Review Count
  reviewCount: [
    '[data-test="ratings-and-reviews"]',
    '[class*="RatingSummary"] [class*="count"]',
    '[itemprop="reviewCount"]',
    '[data-test="reviewsCount"]',
  ].join(', '),

  // Availability
  availability: [
    '[data-test="fulfillment-section"]',
    '[data-test="shipping-delivery"]',
    '[class*="FulfillmentSection"]',
    '[data-test="@web/Fulfillment"]',
  ].join(', '),

  // Features
  features: [
    '[data-test="specifications"] li',
    '[data-test="product-details"] li',
    '[class*="ProductSpecs"] li',
    '[data-test="@web/ProductSpecifications"] li',
  ].join(', '),

  // Brand
  brand: [
    '[data-test="product-brand"]',
    'a[href*="/b/"]',
    '[class*="BrandName"]',
    '[itemprop="brand"]',
  ].join(', '),
};

// Generic e-commerce selectors
const GENERIC_SELECTORS = {
  title: 'h1, .product-title, .product-name, [itemprop="name"]',
  price: '[itemprop="price"], .price, .product-price, .current-price',
  originalPrice: '.original-price, .was-price, .list-price, .compare-price',
  images: '.product-image img, .gallery img, [itemprop="image"]',
  description: '[itemprop="description"], .product-description, .description',
  rating: '[itemprop="ratingValue"], .rating, .stars',
  reviewCount: '[itemprop="reviewCount"], .review-count',
  availability: '.availability, .stock, [itemprop="availability"]',
  features: '.features li, .specifications li',
  brand: '[itemprop="brand"], .brand',
};

export const ProductExtractor: IExtractor<IExtractedProduct> = {
  name: 'product',

  /**
   * Extract product details from document
   * E-commerce page থেকে product data বের করে
   */
  async extract(
    $: CheerioAPI,
    baseUrl: string,
    selectors?: ICustomSelectors
  ): Promise<IExtractedProduct> {
    const product: IExtractedProduct = {};

    // Detect site type
    const urlLower = baseUrl.toLowerCase();
    const isAmazon = urlLower.includes('amazon.');
    const isEbay = urlLower.includes('ebay.');
    const isAliExpress = urlLower.includes('aliexpress.');
    const isAlibaba = urlLower.includes('alibaba.com');
    const isWalmart = urlLower.includes('walmart.');
    const isTarget = urlLower.includes('target.');

    // Select appropriate selectors based on site
    let defaultSelectors;
    if (isAmazon) {
      defaultSelectors = AMAZON_SELECTORS;
    } else if (isEbay) {
      defaultSelectors = EBAY_SELECTORS;
    } else if (isAliExpress) {
      defaultSelectors = ALIEXPRESS_SELECTORS;
    } else if (isAlibaba) {
      defaultSelectors = ALIBABA_SELECTORS;
    } else if (isWalmart) {
      defaultSelectors = WALMART_SELECTORS;
    } else if (isTarget) {
      defaultSelectors = TARGET_SELECTORS;
    } else {
      defaultSelectors = GENERIC_SELECTORS;
    }

    // Extract title
    const titleSelector = selectors?.title || defaultSelectors.title;
    product.title = $(titleSelector).first().text().trim();

    // Clean title
    if (product.title) {
      product.title = product.title
        .replace(/\s+/g, ' ')
        .replace(/\n/g, ' ')
        .trim();

      // Limit length
      if (product.title.length > 500) {
        product.title = product.title.substring(0, 500) + '...';
      }
    }

    // Extract price
    const priceSelector = selectors?.price || defaultSelectors.price;
    let priceText = $(priceSelector).first().text().trim();
    let currentPrice = parsePrice(priceText);

    // AliExpress special handling: price might be in notranslate spans
    // Try multiple fallback methods if primary selector fails
    if (isAliExpress && currentPrice === null) {
      // Method 1: Find all notranslate spans and look for price patterns
      const notranslateElements = $('span.notranslate');
      notranslateElements.each((_, el) => {
        if (currentPrice !== null) return; // Already found
        const text = $(el).text().trim();
        // Look for currency patterns like "$9.99", "€12.34", "US $9.99"
        if (/^(US\s*)?\$[\d,.]+$|^€[\d,.]+$|^£[\d,.]+$|^[\d,.]+$/.test(text) ||
            /^\d+[.,]\d{2}$/.test(text)) {
          const parsed = parsePrice(text);
          if (parsed !== null && parsed > 0 && parsed < 100000) {
            currentPrice = parsed;
            priceText = text;
          }
        }
      });

      // Method 2: Look in price wrapper containers
      if (currentPrice === null) {
        const priceContainers = $('[class*="price"], [class*="Price"]');
        priceContainers.each((_, container) => {
          if (currentPrice !== null) return;
          const text = $(container).text().trim();
          // Extract price pattern from potentially noisy text
          const priceMatch = text.match(/(US\s*)?\$\s*[\d,.]+|€\s*[\d,.]+|£\s*[\d,.]+/);
          if (priceMatch) {
            const parsed = parsePrice(priceMatch[0]);
            if (parsed !== null && parsed > 0) {
              currentPrice = parsed;
              priceText = priceMatch[0];
            }
          }
        });
      }

      // Method 3: Search in page for price pattern near product info
      if (currentPrice === null) {
        const bodyText = $('body').text();
        // Look for AliExpress price patterns
        const pricePatterns = bodyText.match(/US\s*\$\s*[\d,.]+|€\s*[\d,.]+|£\s*[\d,.]+/g);
        if (pricePatterns && pricePatterns.length > 0) {
          // Take the first reasonable price (usually the current price)
          for (const pattern of pricePatterns) {
            const parsed = parsePrice(pattern);
            if (parsed !== null && parsed > 0 && parsed < 10000) {
              currentPrice = parsed;
              priceText = pattern;
              break;
            }
          }
        }
      }

      // Method 4: Extract price from URL parameters
      // AliExpress URLs contain price in pdp_npi parameter like: pdp_npi=EUR%2122.20%219.99
      // This decodes to: EUR!22.20!9.99 (currency, original price, current price)
      if (currentPrice === null) {
        try {
          const urlObj = new URL(baseUrl);
          const pdpNpi = urlObj.searchParams.get('pdp_npi');
          if (pdpNpi) {
            const decoded = decodeURIComponent(pdpNpi);
            // Pattern: CURRENCY!originalPrice!currentPrice!... or CURRENCY%21originalPrice%21currentPrice
            const priceMatch = decoded.match(/([A-Z]{3})[!%]*([\d.]+)[!%]*([\d.]+)/);
            if (priceMatch) {
              const currency = priceMatch[1];
              const originalPriceFromUrl = parseFloat(priceMatch[2]);
              const currentPriceFromUrl = parseFloat(priceMatch[3]);

              if (!isNaN(currentPriceFromUrl) && currentPriceFromUrl > 0 && currentPriceFromUrl < 100000) {
                currentPrice = currentPriceFromUrl;
                priceText = `${currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}${currentPriceFromUrl}`;
              }
            }
          }
        } catch {
          // URL parsing failed, continue
        }
      }

      // Method 5: Look for JSON-LD structured data (schema.org)
      if (currentPrice === null) {
        $('script[type="application/ld+json"]').each((_, script) => {
          if (currentPrice !== null) return;
          try {
            const jsonText = $(script).html();
            if (jsonText) {
              const data = JSON.parse(jsonText);
              // Handle array or single object
              const items = Array.isArray(data) ? data : [data];
              for (const item of items) {
                if (item['@type'] === 'Product' || item['@type'] === 'product') {
                  const offers = item.offers || item.Offers;
                  if (offers) {
                    const offer = Array.isArray(offers) ? offers[0] : offers;
                    const price = offer.price || offer.lowPrice;
                    if (price) {
                      const parsed = parseFloat(String(price));
                      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
                        currentPrice = parsed;
                        priceText = `$${parsed}`;
                      }
                    }
                  }
                }
              }
            }
          } catch {
            // JSON parse failed, continue
          }
        });
      }

      // Method 6: Look for data attributes with price info
      if (currentPrice === null) {
        const dataElements = $('[data-price], [data-value], [data-product-price], [data-spm-anchor-id*="price"]');
        dataElements.each((_, el) => {
          if (currentPrice !== null) return;
          const $el = $(el);
          const dataPrice = $el.attr('data-price') || $el.attr('data-value') || $el.attr('data-product-price');
          if (dataPrice) {
            const parsed = parseFloat(dataPrice);
            if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
              currentPrice = parsed;
              priceText = `$${parsed}`;
            }
          }
        });
      }

      // Method 7: Look for price in meta tags
      if (currentPrice === null) {
        const metaPrice = $('meta[property="product:price:amount"], meta[itemprop="price"], meta[name="twitter:data1"]').attr('content');
        if (metaPrice) {
          const parsed = parseFloat(metaPrice);
          if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
            currentPrice = parsed;
            const currency = $('meta[property="product:price:currency"]').attr('content') || 'USD';
            priceText = `${currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency}${parsed}`;
          }
        }
      }

      // Method 8: Look for specific AliExpress price patterns in data-spm elements
      if (currentPrice === null) {
        // AliExpress often has price info in elements with data-spm="price" or similar
        const spmElements = $('[data-spm*="price"], [data-spm-anchor-id*="price"], [class*="es--wrap"], [class*="snow-price"]');
        spmElements.each((_, el) => {
          if (currentPrice !== null) return;
          const text = $(el).text();
          // Match patterns like "US $9.99" or "$9.99" or "9.99"
          const priceMatch = text.match(/(US\s*)?\$\s*([\d,.]+)|€\s*([\d,.]+)|£\s*([\d,.]+)|([\d]+[.,][\d]{2})/);
          if (priceMatch) {
            const priceStr = priceMatch[2] || priceMatch[3] || priceMatch[4] || priceMatch[5] || '';
            if (priceStr) {
              const parsed = parsePrice(priceStr);
              if (parsed !== null && parsed > 0 && parsed < 100000) {
                currentPrice = parsed;
                priceText = priceMatch[0];
              }
            }
          }
        });
      }

      // Method 9: Extract from script tags containing price data
      if (currentPrice === null) {
        $('script').each((_, script) => {
          if (currentPrice !== null) return;
          const scriptText = $(script).html() || '';
          // Look for patterns like "price":9.99 or "currentPrice":"9.99" or skuVal: {price: 9.99}
          const pricePatterns = [
            /"(?:current)?[Pp]rice"?\s*[:=]\s*"?([\d.]+)"?/,
            /"formatedPrice"?\s*:\s*"[^"]*\$\s*([\d.]+)"/,
            /price['"]\s*:\s*['"]?([\d.]+)/i,
            /"actSkuCalPrice"?\s*:\s*"?([\d.]+)/,
            /skuVal[^}]*price['"]\s*:\s*([\d.]+)/i,
          ];

          for (const pattern of pricePatterns) {
            const match = scriptText.match(pattern);
            if (match && match[1]) {
              const parsed = parseFloat(match[1]);
              if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
                currentPrice = parsed;
                priceText = `$${parsed}`;
                break;
              }
            }
          }
        });
      }
    }

    // Alibaba.com special handling: B2B platform with price ranges
    // Try multiple fallback methods if primary selector fails
    if (isAlibaba && currentPrice === null) {
      // Method 1: Look for price in various container patterns
      const priceContainers = $('[class*="price"], [class*="Price"], .ma-spec-price, .ladder-price');
      priceContainers.each((_, container) => {
        if (currentPrice !== null) return;
        const text = $(container).text().trim();
        // Extract price pattern - Alibaba often shows ranges like "$0.50 - $2.00" or "US$ 1.00"
        const priceMatch = text.match(/(US\s*)?\$\s*([\d,.]+)/);
        if (priceMatch && priceMatch[2]) {
          const parsed = parsePrice(priceMatch[2]);
          if (parsed !== null && parsed > 0 && parsed < 100000) {
            currentPrice = parsed;
            priceText = priceMatch[0];
          }
        }
      });

      // Method 2: Look for JSON-LD structured data
      if (currentPrice === null) {
        $('script[type="application/ld+json"]').each((_, script) => {
          if (currentPrice !== null) return;
          try {
            const jsonText = $(script).html();
            if (jsonText) {
              const data = JSON.parse(jsonText);
              const items = Array.isArray(data) ? data : [data];
              for (const item of items) {
                if (item['@type'] === 'Product' || item['@type'] === 'product') {
                  const offers = item.offers || item.Offers;
                  if (offers) {
                    const offer = Array.isArray(offers) ? offers[0] : offers;
                    const price = offer.price || offer.lowPrice;
                    if (price) {
                      const parsed = parseFloat(String(price));
                      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
                        currentPrice = parsed;
                        priceText = `$${parsed}`;
                      }
                    }
                  }
                }
              }
            }
          } catch {
            // JSON parse failed, continue
          }
        });
      }

      // Method 3: Look for meta tags with price info
      if (currentPrice === null) {
        const metaPrice = $('meta[property="product:price:amount"], meta[itemprop="price"], meta[name="price"]').attr('content');
        if (metaPrice) {
          const parsed = parseFloat(metaPrice);
          if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
            currentPrice = parsed;
            const currency = $('meta[property="product:price:currency"]').attr('content') || 'USD';
            priceText = `${currency === 'USD' ? '$' : currency}${parsed}`;
          }
        }
      }

      // Method 4: Extract from script tags containing price data
      if (currentPrice === null) {
        $('script').each((_, script) => {
          if (currentPrice !== null) return;
          const scriptText = $(script).html() || '';
          // Look for patterns specific to Alibaba
          const pricePatterns = [
            /"(?:min)?[Pp]rice"?\s*[:=]\s*"?([\d.]+)"?/,
            /"(?:display)?[Pp]rice"?\s*:\s*"[^"]*\$?\s*([\d.]+)"/,
            /price['"]\s*:\s*['"]?([\d.]+)/i,
            /"salePrice"?\s*:\s*"?([\d.]+)/,
            /"priceRangeMin"?\s*:\s*"?([\d.]+)/,
          ];

          for (const pattern of pricePatterns) {
            const match = scriptText.match(pattern);
            if (match && match[1]) {
              const parsed = parseFloat(match[1]);
              if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
                currentPrice = parsed;
                priceText = `$${parsed}`;
                break;
              }
            }
          }
        });
      }

      // Method 5: Look for data attributes with price info
      if (currentPrice === null) {
        const dataElements = $('[data-price], [data-value], [data-product-price], [data-spm*="price"]');
        dataElements.each((_, el) => {
          if (currentPrice !== null) return;
          const $el = $(el);
          const dataPrice = $el.attr('data-price') || $el.attr('data-value') || $el.attr('data-product-price');
          if (dataPrice) {
            const parsed = parseFloat(dataPrice);
            if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
              currentPrice = parsed;
              priceText = `$${parsed}`;
            }
          }
        });
      }

      // Method 6: Parse price from text containing ranges (take the minimum)
      if (currentPrice === null) {
        const bodyText = $('body').text();
        // Alibaba price range patterns: "$0.50 - $2.00", "US $1.00 - US $5.00"
        const rangeMatch = bodyText.match(/(US\s*)?\$\s*([\d,.]+)\s*[-–]\s*(US\s*)?\$\s*([\d,.]+)/);
        if (rangeMatch) {
          const minPrice = parsePrice(rangeMatch[2]);
          if (minPrice !== null && minPrice > 0 && minPrice < 100000) {
            currentPrice = minPrice;
            priceText = `$${minPrice}`;
          }
        }
      }
    }

    // Extract original price
    const originalPriceSelector =
      selectors?.originalPrice || defaultSelectors.originalPrice;
    const originalPriceText = $(originalPriceSelector).first().text().trim();
    const originalPrice = parsePrice(originalPriceText);

    if (currentPrice !== null) {
      product.price = {
        current: currentPrice,
        currency: detectCurrency(priceText) || 'USD',
      };

      if (originalPrice !== null && originalPrice > currentPrice) {
        product.price.original = originalPrice;

        // Calculate discount
        const discountPercent = Math.round(
          ((originalPrice - currentPrice) / originalPrice) * 100
        );
        if (discountPercent > 0) {
          product.price.discount = `${discountPercent}%`;
        }
      }
    }

    // Extract images
    const imageSelector = selectors?.images || defaultSelectors.images;
    const images: string[] = [];
    const seenImages = new Set<string>();

    $(imageSelector).each((_, el) => {
      const $img = $(el);
      let src =
        $img.attr('data-old-hires') || // Amazon high-res
        $img.attr('data-a-dynamic-image') || // Amazon dynamic
        $img.attr('src') ||
        $img.attr('data-src') || // Lazy-load attribute
        $img.attr('data-lazy-src') || // Alternative lazy-load
        $img.attr('data-original') || // Original size
        '';

      // Parse Amazon dynamic image JSON
      if (src.startsWith('{')) {
        try {
          const imageObj = JSON.parse(src);
          // Get the largest image
          const urls = Object.keys(imageObj);
          if (urls.length > 0) {
            src = urls[0];
          }
        } catch {
          // Not valid JSON
        }
      }

      // Skip placeholder and loading images
      if (src.includes('placeholder') || src.includes('loading') || src.includes('spinner')) {
        return;
      }

      // Clean and validate URL
      if (src && !src.startsWith('data:') && !seenImages.has(src)) {
        // Resolve relative URLs
        if (src.startsWith('//')) {
          src = 'https:' + src;
        } else if (src.startsWith('/')) {
          try {
            src = new URL(src, baseUrl).href;
          } catch {
            return;
          }
        }

        // AliExpress: Upgrade thumbnail to larger size
        if (isAliExpress && src.includes('alicdn.com')) {
          // Convert _50x50.jpg → _800x800.jpg or remove size suffix for original
          src = src.replace(/_\d+x\d+\./, '_800x800.');
        }

        // Alibaba: Upgrade thumbnail to larger size
        if (isAlibaba && (src.includes('alicdn.com') || src.includes('cbu01.alicdn'))) {
          // Alibaba uses similar CDN - upgrade small images to larger versions
          src = src.replace(/_\d+x\d+\./, '_800x800.');
          src = src.replace(/\.(\d+x\d+)\./, '.');  // Remove middle size indicator
        }

        seenImages.add(src);
        images.push(src);
      }
    });

    if (images.length > 0) {
      product.images = images.slice(0, 20); // Limit to 20 images
    }

    // Extract description
    const descSelector = selectors?.description || defaultSelectors.description;
    let description = '';

    $(descSelector).each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > description.length) {
        description = text;
      }
    });

    if (description) {
      product.description = description
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 2000);
    }

    // Extract rating
    const ratingSelector = selectors?.rating || defaultSelectors.rating;
    let ratingText = $(ratingSelector).first().text().trim();
    let ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);

    if (ratingMatch) {
      const rating = parseFloat(ratingMatch[1]);
      if (rating > 0 && rating <= 5) {
        product.rating = rating;
      }
    }

    // AliExpress special handling for rating
    // AliExpress shows ratings in seller section like "5" or "4.9"
    // Also shows positive feedback percentage like "98.1%"
    if (isAliExpress && !product.rating) {
      // Method 1: Look for star ratings (usually 5 stars system)
      const ratingContainers = $('[class*="rating"], [class*="Rating"], [class*="review"], [class*="Review"]');
      ratingContainers.each((_, el) => {
        if (product.rating) return; // Already found
        const text = $(el).text().trim();
        // Look for patterns like "5", "4.9", "4.8 out of 5"
        const match = text.match(/^(\d+(?:\.\d+)?)\s*(?:out of 5)?$/i) ||
                      text.match(/(\d+(?:\.\d+)?)\s*\/\s*5/) ||
                      text.match(/^(\d+(?:\.\d+)?)$/);
        if (match) {
          const rating = parseFloat(match[1]);
          if (rating > 0 && rating <= 5) {
            product.rating = rating;
          }
        }
      });

      // Method 2: Extract from seller info (shows as "5" next to stars)
      if (!product.rating) {
        const sellerSection = $('[class*="seller"], [class*="store"], [class*="Seller"], [class*="Store"]');
        sellerSection.each((_, el) => {
          if (product.rating) return;
          const text = $(el).text();
          // Look for standalone rating number near "star" or "rating"
          const match = text.match(/(\d+(?:\.\d+)?)\s*(?:stars?|rating|out of)/i) ||
                        text.match(/rating[:\s]*(\d+(?:\.\d+)?)/i);
          if (match) {
            const rating = parseFloat(match[1]);
            if (rating > 0 && rating <= 5) {
              product.rating = rating;
            }
          }
        });
      }

      // Method 3: Look for the positive feedback percentage and convert to rating
      // e.g., "98.1% Positive Feedback" → 4.9 rating (scaled from percentage)
      if (!product.rating) {
        const feedbackMatch = $('body').text().match(/(\d+(?:\.\d+)?)\s*%\s*(?:positive|feedback)/i);
        if (feedbackMatch) {
          const percentage = parseFloat(feedbackMatch[1]);
          if (percentage >= 80 && percentage <= 100) {
            // Convert percentage to 5-star scale (80% = 4.0, 100% = 5.0)
            product.rating = Math.round((percentage / 20) * 10) / 10;
          }
        }
      }

      // Method 4: Look in the already extracted brand/seller text for rating info
      if (!product.rating && product.brand) {
        const brandMatch = product.brand.match(/(\d+(?:\.\d+)?)\s*%/);
        if (brandMatch) {
          const percentage = parseFloat(brandMatch[1]);
          if (percentage >= 80 && percentage <= 100) {
            product.rating = Math.round((percentage / 20) * 10) / 10;
          }
        }
      }
    }

    // Extract review count
    const reviewSelector = selectors?.reviewCount || defaultSelectors.reviewCount;
    const reviewText = $(reviewSelector).first().text().trim();
    const reviewMatch = reviewText.match(/(\d[\d,]*)/);
    if (reviewMatch) {
      product.reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''));
    }

    // Extract availability
    const availSelector = selectors?.availability || defaultSelectors.availability;
    const availText = $(availSelector).first().text().trim().toLowerCase();

    if (
      availText.includes('in stock') ||
      availText.includes('available') ||
      availText.includes('ships')
    ) {
      product.availability = 'In Stock';
    } else if (
      availText.includes('out of stock') ||
      availText.includes('unavailable')
    ) {
      product.availability = 'Out of Stock';
    } else if (availText.length > 0 && availText.length < 100) {
      product.availability = availText;
    }

    // Extract condition (eBay-specific)
    if (isEbay && 'condition' in defaultSelectors) {
      const conditionSelector = (defaultSelectors as typeof EBAY_SELECTORS).condition;
      const conditionText = $(conditionSelector).first().text().trim();
      if (conditionText && conditionText.length < 100) {
        product.condition = conditionText;
      }
    }

    // Extract seller (eBay-specific)
    if (isEbay && 'seller' in defaultSelectors) {
      const sellerSelector = (defaultSelectors as typeof EBAY_SELECTORS).seller;
      const sellerText = $(sellerSelector).first().text().trim();
      if (sellerText && sellerText.length < 100) {
        product.seller = sellerText;
      }
    }

    // Extract seller (AliExpress-specific)
    if (isAliExpress && 'seller' in defaultSelectors) {
      const sellerSelector = (defaultSelectors as typeof ALIEXPRESS_SELECTORS).seller;
      const sellerText = $(sellerSelector).first().text().trim();
      if (sellerText && sellerText.length < 100) {
        product.seller = sellerText;
      }
    }

    // Extract shipping (AliExpress-specific)
    if (isAliExpress && 'shipping' in defaultSelectors) {
      const shippingSelector = (defaultSelectors as typeof ALIEXPRESS_SELECTORS).shipping;
      const shippingText = $(shippingSelector).first().text().trim();
      if (shippingText && shippingText.length < 200) {
        product.shipping = shippingText;
      }
    }

    // Alibaba.com special handling for rating
    // Alibaba shows supplier ratings/scores or transaction history
    if (isAlibaba && !product.rating) {
      // Method 1: Look for supplier review scores
      const ratingContainers = $('[class*="review-score"], [class*="rating"], [class*="score"], .seb-supplier-review__score');
      ratingContainers.each((_, el) => {
        if (product.rating) return;
        const text = $(el).text().trim();
        // Look for patterns like "4.9", "5.0 out of 5", "4.8/5"
        const match = text.match(/(\d+(?:\.\d+)?)\s*(?:out of 5|\/\s*5)?/i);
        if (match) {
          const rating = parseFloat(match[1]);
          if (rating > 0 && rating <= 5) {
            product.rating = rating;
          }
        }
      });

      // Method 2: Look for transaction ratings in supplier info
      if (!product.rating) {
        const supplierSection = $('[class*="supplier"], [class*="company"], .module-supplier-info');
        supplierSection.each((_, el) => {
          if (product.rating) return;
          const text = $(el).text();
          const match = text.match(/(\d+(?:\.\d+)?)\s*(?:stars?|rating|score)/i) ||
                        text.match(/rating[:\s]*(\d+(?:\.\d+)?)/i);
          if (match) {
            const rating = parseFloat(match[1]);
            if (rating > 0 && rating <= 5) {
              product.rating = rating;
            }
          }
        });
      }

      // Method 3: Look for positive feedback percentage
      if (!product.rating) {
        const feedbackMatch = $('body').text().match(/(\d+(?:\.\d+)?)\s*%\s*(?:positive|response|on-time)/i);
        if (feedbackMatch) {
          const percentage = parseFloat(feedbackMatch[1]);
          if (percentage >= 80 && percentage <= 100) {
            // Convert percentage to 5-star scale
            product.rating = Math.round((percentage / 20) * 10) / 10;
          }
        }
      }
    }

    // Extract seller (Alibaba-specific)
    if (isAlibaba && 'seller' in defaultSelectors) {
      const sellerSelector = (defaultSelectors as typeof ALIBABA_SELECTORS).seller;
      const sellerText = $(sellerSelector).first().text().trim();
      if (sellerText && sellerText.length < 100) {
        product.seller = sellerText;
      }
    }

    // Extract shipping/lead time (Alibaba-specific)
    if (isAlibaba && 'shipping' in defaultSelectors) {
      const shippingSelector = (defaultSelectors as typeof ALIBABA_SELECTORS).shipping;
      const shippingText = $(shippingSelector).first().text().trim();
      if (shippingText && shippingText.length < 200) {
        product.shipping = shippingText;
      }
    }

    // Walmart special handling: Extract from __NEXT_DATA__ JSON (most reliable)
    // Walmart uses NextJS and embeds all product data in a JSON blob
    // IMPORTANT: __NEXT_DATA__ has accurate price, selectors often pick wrong elements
    if (isWalmart) {
      // Method 1: __NEXT_DATA__ JSON extraction (most reliable for Walmart)
      // This OVERRIDES selector-extracted price because Walmart selectors are unreliable
      try {
        const nextDataScript = $('script#__NEXT_DATA__').html();
        if (nextDataScript) {
          const nextData = JSON.parse(nextDataScript);
          const productData = nextData?.props?.pageProps?.initialData?.data?.product
                           || nextData?.props?.pageProps?.product
                           || {};

          // Extract from JSON - ALWAYS prefer __NEXT_DATA__ for Walmart
          if (!product.title && productData.name) {
            product.title = productData.name;
          }
          // For price: OVERRIDE selector price with __NEXT_DATA__ price (more reliable)
          // Walmart's page has many price-like elements (shipping costs, etc.) that confuse selectors
          if (productData.priceInfo?.currentPrice?.price) {
            currentPrice = productData.priceInfo.currentPrice.price;
            priceText = `$${currentPrice}`;
            product.price = {
              current: currentPrice as number,
              currency: 'USD',
            };
          }
          if (!product.images?.length && productData.imageInfo?.allImages) {
            product.images = productData.imageInfo.allImages
              .map((img: any) => img.url)
              .filter((url: string) => url && !url.includes('placeholder'))
              .slice(0, 20);
          }
          if (!product.rating && productData.averageRating) {
            product.rating = parseFloat(productData.averageRating);
          }
          if (!product.reviewCount && productData.numberOfReviews) {
            product.reviewCount = parseInt(productData.numberOfReviews);
          }
          if (!product.brand && productData.brand) {
            product.brand = productData.brand;
          }
          if (!product.description && productData.shortDescription) {
            product.description = productData.shortDescription;
          }
          if (!product.availability) {
            product.availability = productData.availabilityStatus || 'Unknown';
          }
        }
      } catch {
        // __NEXT_DATA__ parsing failed, continue with selector extraction
      }

      // Method 2: JSON-LD extraction for Walmart
      if (currentPrice === null || !product.images?.length) {
        $('script[type="application/ld+json"]').each((_: number, script: any) => {
          try {
            const jsonText = $(script).html();
            if (jsonText) {
              const data = JSON.parse(jsonText);
              const items = Array.isArray(data) ? data : [data];
              for (const item of items) {
                if (item['@type'] === 'Product') {
                  if (!product.title && item.name) product.title = item.name;
                  if (currentPrice === null && item.offers?.price) {
                    currentPrice = parseFloat(item.offers.price);
                    priceText = `$${currentPrice}`;
                    product.price = {
                      current: currentPrice as number,
                      currency: 'USD',
                    };
                  }
                  if (!product.images?.length && item.image) {
                    product.images = Array.isArray(item.image) ? item.image.slice(0, 20) : [item.image];
                  }
                  if (!product.rating && item.aggregateRating?.ratingValue) {
                    product.rating = parseFloat(item.aggregateRating.ratingValue);
                  }
                  if (!product.brand && item.brand?.name) {
                    product.brand = item.brand.name;
                  }
                }
              }
            }
          } catch {
            // JSON-LD parsing failed
          }
        });
      }
    }

    // Target special handling: JSON-LD and React state extraction
    // Target uses React with data-test attributes and __TGT_PRELOAD_STATE__
    if (isTarget) {
      // Method 1: JSON-LD extraction
      if (currentPrice === null || !product.images?.length) {
        $('script[type="application/ld+json"]').each((_: number, script: any) => {
          try {
            const jsonText = $(script).html();
            if (jsonText) {
              const data = JSON.parse(jsonText);
              const items = Array.isArray(data) ? data : [data];
              for (const item of items) {
                if (item['@type'] === 'Product') {
                  if (!product.title && item.name) product.title = item.name;
                  if (currentPrice === null && item.offers?.price) {
                    currentPrice = parseFloat(item.offers.price);
                    priceText = `$${currentPrice}`;
                    product.price = {
                      current: currentPrice as number,
                      currency: 'USD',
                    };
                  }
                  if (!product.images?.length && item.image) {
                    product.images = Array.isArray(item.image) ? item.image.slice(0, 20) : [item.image];
                  }
                  if (!product.rating && item.aggregateRating?.ratingValue) {
                    product.rating = parseFloat(item.aggregateRating.ratingValue);
                  }
                  if (!product.brand && item.brand?.name) {
                    product.brand = item.brand.name;
                  }
                }
              }
            }
          } catch {
            // JSON-LD parsing failed
          }
        });
      }

      // Method 2: __TGT_PRELOAD_STATE__ extraction (Target's React state)
      if (currentPrice === null || !product.images?.length) {
        try {
          const tgtStateScript = $('script:contains("__TGT_PRELOAD_STATE__")').html();
          if (tgtStateScript) {
            // Use RegExp constructor to avoid /s flag compatibility issues
            const stateMatch = tgtStateScript.match(new RegExp('__TGT_PRELOAD_STATE__\\s*=\\s*({.+?});', 's'));
            if (stateMatch) {
              const tgtState = JSON.parse(stateMatch[1]);
              // Navigate through Target's state structure
              const productDetails = tgtState?.product?.details || {};
              if (!product.title && productDetails.title) {
                product.title = productDetails.title;
              }
              if (currentPrice === null && productDetails.price?.current_retail) {
                currentPrice = productDetails.price.current_retail;
                priceText = `$${currentPrice}`;
                product.price = {
                  current: currentPrice as number,
                  currency: 'USD',
                };
              }
            }
          }
        } catch {
          // State parsing failed
        }
      }
    }

    // Extract features
    const featuresSelector = selectors?.features || defaultSelectors.features;
    const features: string[] = [];

    $(featuresSelector).each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 0 && text.length < 500) {
        features.push(text.replace(/\s+/g, ' '));
      }
    });

    if (features.length > 0) {
      product.features = features.slice(0, 20); // Limit to 20 features
    }

    // Extract brand
    const brandSelector = selectors?.custom?.brand || defaultSelectors.brand;
    let brand = $(brandSelector).first().text().trim();

    // Clean Amazon brand text
    if (brand.startsWith('Visit the')) {
      brand = brand.replace('Visit the', '').replace('Store', '').trim();
    }
    if (brand.startsWith('Brand:')) {
      brand = brand.replace('Brand:', '').trim();
    }

    if (brand && brand.length < 100) {
      product.brand = brand;
    }

    // Add URL
    product.url = baseUrl;

    return product;
  },

  /**
   * Check if this extractor should run
   */
  shouldRun(extractors: ExtractorType[]): boolean {
    return extractors.includes('product');
  },
};

/**
 * Parse price from text
 */
function parsePrice(text: string): number | null {
  if (!text) return null;

  // Remove currency symbols and clean text
  const cleanText = text
    .replace(/[^\d.,\s]/g, '')
    .replace(/\s/g, '')
    .trim();

  if (!cleanText) return null;

  // Handle different formats
  let numStr = cleanText;

  // Handle European format (comma as decimal)
  if (numStr.includes(',') && numStr.includes('.')) {
    // 1,234.56 or 1.234,56
    if (numStr.lastIndexOf(',') > numStr.lastIndexOf('.')) {
      // European: 1.234,56
      numStr = numStr.replace(/\./g, '').replace(',', '.');
    } else {
      // US: 1,234.56
      numStr = numStr.replace(/,/g, '');
    }
  } else if (numStr.includes(',')) {
    // Check if comma is decimal separator
    const parts = numStr.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // European decimal: 99,99
      numStr = numStr.replace(',', '.');
    } else {
      // Thousand separator: 1,234
      numStr = numStr.replace(/,/g, '');
    }
  }

  const value = parseFloat(numStr);
  if (!isNaN(value) && value > 0 && value < 1000000) {
    return value;
  }

  return null;
}

/**
 * Detect currency from text
 */
function detectCurrency(text: string): string | undefined {
  if (!text) return undefined;

  const currencyMap: Record<string, string> = {
    $: 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₹': 'INR',
    '৳': 'BDT',
  };

  for (const [symbol, code] of Object.entries(currencyMap)) {
    if (text.includes(symbol)) {
      return code;
    }
  }

  return undefined;
}
