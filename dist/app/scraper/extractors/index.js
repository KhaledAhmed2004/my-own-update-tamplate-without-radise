"use strict";
/**
 * Extractors Registry
 * সব extractors এক জায়গা থেকে manage করা হয়
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataExtractor = exports.TableExtractor = exports.ProductExtractor = exports.PriceExtractor = exports.LinkExtractor = exports.ImageExtractor = exports.TextExtractor = exports.runExtractors = exports.getAvailableExtractors = exports.getExtractor = exports.EXTRACTORS = void 0;
const text_extractor_1 = require("./text.extractor");
const image_extractor_1 = require("./image.extractor");
const link_extractor_1 = require("./link.extractor");
const price_extractor_1 = require("./price.extractor");
const product_extractor_1 = require("./product.extractor");
const table_extractor_1 = require("./table.extractor");
const metadata_extractor_1 = require("./metadata.extractor");
// Extractor registry
exports.EXTRACTORS = {
    text: text_extractor_1.TextExtractor,
    images: image_extractor_1.ImageExtractor,
    links: link_extractor_1.LinkExtractor,
    tables: table_extractor_1.TableExtractor,
    prices: price_extractor_1.PriceExtractor,
    product: product_extractor_1.ProductExtractor,
    metadata: metadata_extractor_1.MetadataExtractor,
    custom: text_extractor_1.TextExtractor, // Fallback for custom - handled specially
};
/**
 * Get extractor by name
 */
const getExtractor = (name) => {
    const extractor = exports.EXTRACTORS[name];
    if (!extractor) {
        throw new Error(`Unknown extractor: ${name}. Available: ${Object.keys(exports.EXTRACTORS).join(', ')}`);
    }
    return extractor;
};
exports.getExtractor = getExtractor;
/**
 * Get all available extractor names
 */
const getAvailableExtractors = () => {
    return Object.keys(exports.EXTRACTORS);
};
exports.getAvailableExtractors = getAvailableExtractors;
/**
 * Run multiple extractors on a document
 * Document এ multiple extractors চালায়
 */
const runExtractors = (extractorNames, document, baseUrl, selectors) => __awaiter(void 0, void 0, void 0, function* () {
    const results = {};
    const errors = [];
    for (const name of extractorNames) {
        const extractor = exports.EXTRACTORS[name];
        if (!extractor) {
            errors.push({
                extractor: name,
                message: `Unknown extractor: ${name}`,
            });
            continue;
        }
        if (!extractor.shouldRun(extractorNames)) {
            continue;
        }
        try {
            results[name] = yield extractor.extract(document, baseUrl, selectors);
        }
        catch (error) {
            errors.push({
                extractor: name,
                message: error.message || 'Extraction failed',
            });
        }
    }
    if (errors.length > 0) {
        results._errors = errors;
    }
    return results;
});
exports.runExtractors = runExtractors;
// Export individual extractors
var text_extractor_2 = require("./text.extractor");
Object.defineProperty(exports, "TextExtractor", { enumerable: true, get: function () { return text_extractor_2.TextExtractor; } });
var image_extractor_2 = require("./image.extractor");
Object.defineProperty(exports, "ImageExtractor", { enumerable: true, get: function () { return image_extractor_2.ImageExtractor; } });
var link_extractor_2 = require("./link.extractor");
Object.defineProperty(exports, "LinkExtractor", { enumerable: true, get: function () { return link_extractor_2.LinkExtractor; } });
var price_extractor_2 = require("./price.extractor");
Object.defineProperty(exports, "PriceExtractor", { enumerable: true, get: function () { return price_extractor_2.PriceExtractor; } });
var product_extractor_2 = require("./product.extractor");
Object.defineProperty(exports, "ProductExtractor", { enumerable: true, get: function () { return product_extractor_2.ProductExtractor; } });
var table_extractor_2 = require("./table.extractor");
Object.defineProperty(exports, "TableExtractor", { enumerable: true, get: function () { return table_extractor_2.TableExtractor; } });
var metadata_extractor_2 = require("./metadata.extractor");
Object.defineProperty(exports, "MetadataExtractor", { enumerable: true, get: function () { return metadata_extractor_2.MetadataExtractor; } });
