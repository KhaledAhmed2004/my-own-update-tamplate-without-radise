/**
 * Browser Fingerprint Spoofing Module
 * Bot detection bypass করতে browser fingerprint randomize করে
 *
 * Features:
 * - Canvas fingerprint noise injection
 * - WebGL vendor/renderer spoofing
 * - Hardware info randomization (CPU cores, memory)
 * - Navigator properties spoofing
 *
 * NOTE: This is SAFE and OPTIONAL - if it fails, existing code continues
 */

import { Page } from 'puppeteer';
import { logger } from '../../../shared/logger';

/**
 * Inject fingerprint spoofing scripts into page
 * Page load হওয়ার আগে browser fingerprint randomize করে
 *
 * @param page - Puppeteer page instance
 */
export async function injectFingerprintSpoofing(page: Page): Promise<void> {
  try {
    await page.evaluateOnNewDocument(() => {
      // =====================================================
      // 1. Canvas Fingerprint Noise
      // Canvas API তে noise inject করে unique fingerprint তৈরি করে
      // =====================================================
      try {
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        // @ts-ignore - Overriding prototype method
        HTMLCanvasElement.prototype.getContext = function (
          type: string,
          attributes?: CanvasRenderingContext2DSettings
        ) {
          const context = originalGetContext.call(this, type, attributes);
          if (context && type === '2d') {
            const ctx = context as CanvasRenderingContext2D;
            const originalGetImageData = ctx.getImageData.bind(ctx);
            ctx.getImageData = function (sx: number, sy: number, sw: number, sh: number) {
              const imageData = originalGetImageData(sx, sy, sw, sh);
              // Add 1% noise to pixel data (imperceptible but changes fingerprint)
              for (let i = 0; i < imageData.data.length; i += 4) {
                if (Math.random() < 0.01) {
                  imageData.data[i] ^= 1; // Red
                  imageData.data[i + 1] ^= 1; // Green
                  imageData.data[i + 2] ^= 1; // Blue
                }
              }
              return imageData;
            };
          }
          return context;
        };
      } catch {
        // Canvas spoofing failed, continue without it
      }

      // =====================================================
      // 2. WebGL Vendor/Renderer Spoofing
      // WebGL info spoof করে GPU fingerprint change করে
      // =====================================================
      try {
        const renderers = [
          'Intel Iris OpenGL Engine',
          'Intel(R) UHD Graphics 630',
          'AMD Radeon Pro 5500M',
          'NVIDIA GeForce GTX 1650',
          'Intel(R) HD Graphics 620',
          'AMD Radeon RX 580',
        ];

        const vendors = ['Intel Inc.', 'AMD', 'NVIDIA Corporation'];

        const selectedRenderer = renderers[Math.floor(Math.random() * renderers.length)];
        const selectedVendor = vendors[Math.floor(Math.random() * vendors.length)];

        const getParameterProxy = new Proxy(WebGLRenderingContext.prototype.getParameter, {
          apply(target, thisArg, args) {
            const param = args[0];
            // UNMASKED_RENDERER_WEBGL
            if (param === 37446) {
              return selectedRenderer;
            }
            // UNMASKED_VENDOR_WEBGL
            if (param === 37445) {
              return selectedVendor;
            }
            return Reflect.apply(target, thisArg, args);
          },
        });

        WebGLRenderingContext.prototype.getParameter = getParameterProxy;

        // Also apply to WebGL2
        if (typeof WebGL2RenderingContext !== 'undefined') {
          const getParameter2Proxy = new Proxy(WebGL2RenderingContext.prototype.getParameter, {
            apply(target, thisArg, args) {
              const param = args[0];
              if (param === 37446) return selectedRenderer;
              if (param === 37445) return selectedVendor;
              return Reflect.apply(target, thisArg, args);
            },
          });
          WebGL2RenderingContext.prototype.getParameter = getParameter2Proxy;
        }
      } catch {
        // WebGL spoofing failed, continue without it
      }

      // =====================================================
      // 3. Hardware Concurrency (CPU Cores) Randomization
      // =====================================================
      try {
        const cores = [4, 6, 8, 12, 16];
        const selectedCores = cores[Math.floor(Math.random() * cores.length)];
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => selectedCores,
          configurable: true,
        });
      } catch {
        // Hardware concurrency spoofing failed
      }

      // =====================================================
      // 4. Device Memory Randomization
      // =====================================================
      try {
        const memory = [4, 8, 16, 32];
        const selectedMemory = memory[Math.floor(Math.random() * memory.length)];
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => selectedMemory,
          configurable: true,
        });
      } catch {
        // Device memory spoofing failed
      }

      // =====================================================
      // 5. Navigator.webdriver Override
      // Bot detection এর primary check - must be undefined/false
      // =====================================================
      try {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
          configurable: true,
        });
      } catch {
        // webdriver spoofing failed
      }

      // =====================================================
      // 6. Chrome Runtime Object (for PerimeterX bypass)
      // Real Chrome browsers have this object
      // =====================================================
      try {
        // @ts-ignore
        if (!window.chrome) {
          // @ts-ignore
          window.chrome = {
            runtime: {},
            loadTimes: function () {
              return {};
            },
            csi: function () {
              return {};
            },
            app: {},
          };
        }
      } catch {
        // Chrome runtime spoofing failed
      }

      // =====================================================
      // 7. Permissions API Override
      // =====================================================
      try {
        const originalQuery = Permissions.prototype.query;
        Permissions.prototype.query = function (parameters: PermissionDescriptor) {
          if (parameters.name === 'notifications') {
            return Promise.resolve({
              state: Notification.permission,
              onchange: null,
            } as PermissionStatus);
          }
          return originalQuery.call(this, parameters);
        };
      } catch {
        // Permissions spoofing failed
      }

      // =====================================================
      // 8. Plugin Array (Non-empty for real browsers)
      // =====================================================
      try {
        Object.defineProperty(navigator, 'plugins', {
          get: () => {
            // Return array-like object with length
            return {
              length: 3,
              0: { name: 'Chrome PDF Plugin' },
              1: { name: 'Chrome PDF Viewer' },
              2: { name: 'Native Client' },
              item: (i: number) => (i < 3 ? { name: 'Plugin' } : null),
              namedItem: () => null,
              refresh: () => {},
            };
          },
          configurable: true,
        });
      } catch {
        // Plugins spoofing failed
      }

      // =====================================================
      // 9. Languages Array
      // =====================================================
      try {
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
          configurable: true,
        });
      } catch {
        // Languages spoofing failed
      }
    });

    logger.debug('[Fingerprint] Spoofing scripts injected successfully');
  } catch (error: any) {
    // Log but don't throw - this is optional enhancement
    logger.debug(`[Fingerprint] Failed to inject spoofing scripts: ${error.message}`);
  }
}

/**
 * Check if fingerprint spoofing is available
 * Optional feature check
 */
export function isFingerprintSpoofingAvailable(): boolean {
  return true;
}
