"use strict";
/**
 * Link Extractor
 * Page থেকে links extract করে
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
exports.LinkExtractor = void 0;
exports.LinkExtractor = {
    name: 'links',
    /**
     * Extract links from document
     * Document থেকে সব links বের করে
     */
    extract($, baseUrl, selectors) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const links = [];
            const seenUrls = new Set();
            // Parse base URL
            let baseUrlObj;
            try {
                baseUrlObj = new URL(baseUrl);
            }
            catch (_b) {
                baseUrlObj = new URL('http://localhost');
            }
            // Selector for links
            const linkSelector = ((_a = selectors === null || selectors === void 0 ? void 0 : selectors.custom) === null || _a === void 0 ? void 0 : _a.links) || 'a[href]';
            $(linkSelector).each((_, el) => {
                const $link = $(el);
                let href = $link.attr('href') || '';
                // Skip empty, javascript, and anchor links
                if (!href ||
                    href === '#' ||
                    href.startsWith('javascript:') ||
                    href.startsWith('mailto:') ||
                    href.startsWith('tel:')) {
                    return;
                }
                // Resolve relative URLs
                try {
                    if (href.startsWith('//')) {
                        href = baseUrlObj.protocol + href;
                    }
                    else if (href.startsWith('/')) {
                        href = baseUrlObj.origin + href;
                    }
                    else if (!href.startsWith('http')) {
                        href = new URL(href, baseUrl).href;
                    }
                }
                catch (_a) {
                    // Invalid URL, skip
                    return;
                }
                // Skip duplicates
                if (seenUrls.has(href)) {
                    return;
                }
                seenUrls.add(href);
                // Get link text
                let text = $link.text().trim();
                if (text.length > 200) {
                    text = text.substring(0, 200) + '...';
                }
                // Determine if external
                let isExternal = false;
                try {
                    const linkUrl = new URL(href);
                    isExternal = linkUrl.hostname !== baseUrlObj.hostname;
                }
                catch (_b) {
                    // Invalid URL, assume internal
                }
                const link = {
                    href,
                    text: text || undefined,
                    isExternal,
                };
                // Get rel attribute
                const rel = $link.attr('rel');
                if (rel) {
                    link.rel = rel;
                }
                links.push(link);
            });
            // Limit to 500 links
            return links.slice(0, 500);
        });
    },
    /**
     * Check if this extractor should run
     */
    shouldRun(extractors) {
        return extractors.includes('links');
    },
};
