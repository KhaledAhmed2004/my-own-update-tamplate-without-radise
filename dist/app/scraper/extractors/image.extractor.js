"use strict";
/**
 * Image Extractor
 * Page থেকে image URLs extract করে
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
exports.ImageExtractor = void 0;
exports.ImageExtractor = {
    name: 'images',
    /**
     * Extract images from document
     * Document থেকে সব images বের করে
     */
    extract($, baseUrl, selectors) {
        return __awaiter(this, void 0, void 0, function* () {
            const images = [];
            const seenUrls = new Set();
            // Parse base URL for resolving relative URLs
            let baseUrlObj;
            try {
                baseUrlObj = new URL(baseUrl);
            }
            catch (_a) {
                baseUrlObj = new URL('http://localhost');
            }
            // Selector for images
            const imageSelector = (selectors === null || selectors === void 0 ? void 0 : selectors.images) || 'img';
            $(imageSelector).each((_, el) => {
                var _a, _b;
                const $img = $(el);
                // Get image source (check multiple attributes)
                let src = $img.attr('src') ||
                    $img.attr('data-src') ||
                    $img.attr('data-lazy-src') ||
                    $img.attr('data-original') ||
                    ((_a = $img.attr('data-srcset')) === null || _a === void 0 ? void 0 : _a.split(' ')[0]) ||
                    '';
                // Skip empty, data URIs, and tracking pixels
                if (!src ||
                    src.startsWith('data:') ||
                    src.includes('1x1') ||
                    src.includes('pixel') ||
                    src.includes('tracking')) {
                    return;
                }
                // Resolve relative URLs
                try {
                    if (src.startsWith('//')) {
                        src = baseUrlObj.protocol + src;
                    }
                    else if (src.startsWith('/')) {
                        src = baseUrlObj.origin + src;
                    }
                    else if (!src.startsWith('http')) {
                        src = new URL(src, baseUrl).href;
                    }
                }
                catch (_c) {
                    // Invalid URL, skip
                    return;
                }
                // Skip duplicates
                if (seenUrls.has(src)) {
                    return;
                }
                seenUrls.add(src);
                // Extract image data
                const image = {
                    src,
                    alt: ((_b = $img.attr('alt')) === null || _b === void 0 ? void 0 : _b.trim()) || undefined,
                };
                // Get dimensions
                const width = parseInt($img.attr('width') || '0');
                const height = parseInt($img.attr('height') || '0');
                if (width > 0)
                    image.width = width;
                if (height > 0)
                    image.height = height;
                images.push(image);
            });
            // Also check for background images in style attributes
            $('[style*="background"]').each((_, el) => {
                const style = $(el).attr('style') || '';
                const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
                if (match && match[1]) {
                    let src = match[1];
                    // Skip data URIs
                    if (src.startsWith('data:'))
                        return;
                    // Resolve relative URLs
                    try {
                        if (src.startsWith('//')) {
                            src = baseUrlObj.protocol + src;
                        }
                        else if (src.startsWith('/')) {
                            src = baseUrlObj.origin + src;
                        }
                        else if (!src.startsWith('http')) {
                            src = new URL(src, baseUrl).href;
                        }
                    }
                    catch (_a) {
                        return;
                    }
                    if (!seenUrls.has(src)) {
                        seenUrls.add(src);
                        images.push({ src });
                    }
                }
            });
            // Limit to 100 images
            return images.slice(0, 100);
        });
    },
    /**
     * Check if this extractor should run
     */
    shouldRun(extractors) {
        return extractors.includes('images');
    },
};
