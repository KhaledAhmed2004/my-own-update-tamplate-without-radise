"use strict";
/**
 * Metadata Extractor
 * Page থেকে meta tags এবং SEO data extract করে
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
exports.MetadataExtractor = void 0;
exports.MetadataExtractor = {
    name: 'metadata',
    /**
     * Extract metadata from document
     * Document থেকে meta tags বের করে
     */
    extract($, _baseUrl, _selectors) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const metadata = {};
            // Title
            metadata.title =
                $('title').text().trim() ||
                    ((_a = $('meta[property="og:title"]').attr('content')) === null || _a === void 0 ? void 0 : _a.trim());
            // Description
            metadata.description =
                ((_b = $('meta[name="description"]').attr('content')) === null || _b === void 0 ? void 0 : _b.trim()) ||
                    ((_c = $('meta[property="og:description"]').attr('content')) === null || _c === void 0 ? void 0 : _c.trim());
            // Keywords
            const keywordsStr = (_d = $('meta[name="keywords"]').attr('content')) === null || _d === void 0 ? void 0 : _d.trim();
            if (keywordsStr) {
                metadata.keywords = keywordsStr
                    .split(',')
                    .map(k => k.trim())
                    .filter(k => k.length > 0);
            }
            // Open Graph tags
            metadata.ogTitle = (_e = $('meta[property="og:title"]').attr('content')) === null || _e === void 0 ? void 0 : _e.trim();
            metadata.ogDescription = (_f = $('meta[property="og:description"]')
                .attr('content')) === null || _f === void 0 ? void 0 : _f.trim();
            metadata.ogImage = (_g = $('meta[property="og:image"]').attr('content')) === null || _g === void 0 ? void 0 : _g.trim();
            // Canonical URL
            metadata.canonical = (_h = $('link[rel="canonical"]').attr('href')) === null || _h === void 0 ? void 0 : _h.trim();
            return metadata;
        });
    },
    /**
     * Check if this extractor should run
     */
    shouldRun(extractors) {
        return extractors.includes('metadata');
    },
};
