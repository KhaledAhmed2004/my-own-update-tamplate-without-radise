"use strict";
/**
 * Text Extractor
 * Page থেকে text content extract করে (title, description, body text)
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
exports.TextExtractor = void 0;
exports.TextExtractor = {
    name: 'text',
    /**
     * Extract text content from document
     * Document থেকে text content বের করে
     */
    extract($, _baseUrl, selectors) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const result = {};
            // Extract title
            if (selectors === null || selectors === void 0 ? void 0 : selectors.title) {
                result.title = $(selectors.title).first().text().trim();
            }
            else {
                // Try common title selectors
                result.title =
                    $('h1').first().text().trim() ||
                        $('title').text().trim() ||
                        $('[class*="title"]').first().text().trim() ||
                        $('[class*="heading"]').first().text().trim();
            }
            // Extract description
            result.description =
                ((_a = $('meta[name="description"]').attr('content')) === null || _a === void 0 ? void 0 : _a.trim()) ||
                    ((_b = $('meta[property="og:description"]').attr('content')) === null || _b === void 0 ? void 0 : _b.trim()) ||
                    $('[class*="description"]').first().text().trim().substring(0, 500);
            // Extract body text
            const contentSelector = (selectors === null || selectors === void 0 ? void 0 : selectors.container) ||
                ((_c = selectors === null || selectors === void 0 ? void 0 : selectors.custom) === null || _c === void 0 ? void 0 : _c.content) ||
                'article, main, .content, .main-content, #content, #main, body';
            const $content = $(contentSelector).first().clone();
            // Remove unwanted elements
            $content
                .find('script, style, noscript, iframe, nav, footer, header, aside, .sidebar, .navigation, .menu, .ad, .advertisement, .social-share')
                .remove();
            // Get clean text
            let bodyText = $content.text();
            // Clean up whitespace
            bodyText = bodyText
                .replace(/\s+/g, ' ') // Multiple spaces to single
                .replace(/\n+/g, '\n') // Multiple newlines to single
                .trim();
            // Limit length
            if (bodyText.length > 10000) {
                bodyText = bodyText.substring(0, 10000) + '...';
            }
            result.bodyText = bodyText;
            // Extract headings
            result.headings = [];
            $('h1, h2, h3, h4, h5, h6').each((_, el) => {
                var _a;
                const $heading = $(el);
                const level = parseInt(((_a = el.tagName) === null || _a === void 0 ? void 0 : _a.charAt(1)) || '0');
                const text = $heading.text().trim();
                if (text && text.length > 0 && text.length < 500) {
                    result.headings.push({ level, text });
                }
            });
            // Limit headings
            if (result.headings.length > 50) {
                result.headings = result.headings.slice(0, 50);
            }
            return result;
        });
    },
    /**
     * Check if this extractor should run
     */
    shouldRun(extractors) {
        return extractors.includes('text');
    },
};
