"use strict";
/**
 * Table Extractor
 * Page থেকে table data extract করে
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
exports.TableExtractor = void 0;
exports.TableExtractor = {
    name: 'tables',
    /**
     * Extract tables from document
     * Document থেকে সব tables বের করে
     */
    extract($, _baseUrl, selectors) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const tables = [];
            // Selector for tables
            const tableSelector = ((_a = selectors === null || selectors === void 0 ? void 0 : selectors.custom) === null || _a === void 0 ? void 0 : _a.tables) || 'table';
            $(tableSelector).each((_, tableEl) => {
                const $table = $(tableEl);
                const headers = [];
                const rows = [];
                // Extract headers from thead or first row
                $table.find('thead th, thead td, tr:first-child th').each((_, th) => {
                    const text = $(th).text().trim();
                    headers.push(text);
                });
                // If no headers in thead, check first row
                if (headers.length === 0) {
                    const $firstRow = $table.find('tr').first();
                    $firstRow.find('th, td').each((_, cell) => {
                        const text = $(cell).text().trim();
                        headers.push(text);
                    });
                }
                // Extract rows
                const rowSelector = headers.length > 0 ? 'tbody tr, tr:not(:first-child)' : 'tr';
                $table.find(rowSelector).each((_, tr) => {
                    const row = [];
                    $(tr)
                        .find('td, th')
                        .each((_, cell) => {
                        let text = $(cell).text().trim();
                        // Limit cell text length
                        if (text.length > 500) {
                            text = text.substring(0, 500) + '...';
                        }
                        row.push(text);
                    });
                    // Only add non-empty rows
                    if (row.length > 0 && row.some(cell => cell.length > 0)) {
                        rows.push(row);
                    }
                });
                // Only add tables with data
                if (headers.length > 0 || rows.length > 0) {
                    tables.push({ headers, rows });
                }
            });
            // Limit to 10 tables
            return tables.slice(0, 10);
        });
    },
    /**
     * Check if this extractor should run
     */
    shouldRun(extractors) {
        return extractors.includes('tables');
    },
};
