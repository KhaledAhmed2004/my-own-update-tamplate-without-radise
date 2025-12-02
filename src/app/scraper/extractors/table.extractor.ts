/**
 * Table Extractor
 * Page থেকে table data extract করে
 */

import { CheerioAPI } from 'cheerio';
import {
  IExtractor,
  IExtractedTable,
  ICustomSelectors,
  ExtractorType,
} from '../scraper.interface';

export const TableExtractor: IExtractor<IExtractedTable[]> = {
  name: 'tables',

  /**
   * Extract tables from document
   * Document থেকে সব tables বের করে
   */
  async extract(
    $: CheerioAPI,
    _baseUrl: string,
    selectors?: ICustomSelectors
  ): Promise<IExtractedTable[]> {
    const tables: IExtractedTable[] = [];

    // Selector for tables
    const tableSelector = selectors?.custom?.tables || 'table';

    $(tableSelector).each((_, tableEl) => {
      const $table = $(tableEl);
      const headers: string[] = [];
      const rows: string[][] = [];

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
      const rowSelector =
        headers.length > 0 ? 'tbody tr, tr:not(:first-child)' : 'tr';

      $table.find(rowSelector).each((_, tr) => {
        const row: string[] = [];

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
  },

  /**
   * Check if this extractor should run
   */
  shouldRun(extractors: ExtractorType[]): boolean {
    return extractors.includes('tables');
  },
};
