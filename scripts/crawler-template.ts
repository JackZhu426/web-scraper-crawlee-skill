/**
 * Crawlee + Playwright Crawler Template
 *
 * This template provides a production-ready starting point for web crawlers.
 * Customize the Input interface, router handlers, and extraction logic.
 *
 * Usage:
 * 1. Copy this template to your crawler's src/main.ts
 * 2. Update the Input interface with your specific options
 * 3. Implement extraction logic in the router handlers
 * 4. Run with: pnpm start:dev or apify run --purge
 */

import { Actor } from 'apify';
import { PlaywrightCrawler, Dataset, createPlaywrightRouter } from 'crawlee';

// ============================================================================
// INPUT CONFIGURATION
// ============================================================================

interface Input {
  /** Starting URLs to crawl */
  startUrls: {
    url: string;
    userData?: Record<string, unknown>;
  }[];
  /** Maximum number of requests to process */
  maxRequestsPerCrawl?: number;
  /** Skip database operations, save to Dataset only */
  dryRun?: boolean;
  /** Maximum number of items to extract (undefined = no limit) */
  maxItems?: number;
}

// ============================================================================
// EXTRACTED DATA INTERFACE
// ============================================================================

interface ExtractedItem {
  /** Item title/name */
  title: string;
  /** Item price (as string, e.g., "$99.99") */
  price: string | null;
  /** Original/strikethrough price if on sale */
  originalPrice: string | null;
  /** Item description */
  description: string | null;
  /** Primary image URL */
  imageUrl: string | null;
  /** Source URL */
  url: string;
  /** Extraction timestamp */
  scrapedAt: string;
}

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router = createPlaywrightRouter();

// Counters for run summary
let processedCount = 0;
let successCount = 0;
let errorCount = 0;

/**
 * Export counters for run summary
 */
export const getCounters = () => ({
  total: processedCount,
  success: successCount,
  failed: errorCount,
});

// ============================================================================
// LISTING PAGE HANDLER
// ============================================================================

router.addDefaultHandler(async ({ log, page, enqueueLinks }) => {
  log.info('Processing listing page', { url: page.url() });

  try {
    // Step 1: Wait for page to load
    await page.waitForLoadState('domcontentloaded', { timeout: 60000 });

    // Step 2: Close any popups/modals
    await closePopups(page, log);

    // Step 3: Wait for content to appear
    // TODO: Update selector for your target site
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 30000 });

    // Step 4: Handle pagination (Load More button or infinite scroll)
    await handlePagination(page, log);

    // Step 5: Extract item URLs and enqueue for detail processing
    const itemUrls = await page.evaluate(() => {
      // TODO: Update selector for your target site
      const links = Array.from(document.querySelectorAll('[data-testid="product-card"] a'));
      return links
        .map(link => link.getAttribute('href'))
        .filter((href): href is string => !!href);
    });

    log.info(`Found ${itemUrls.length} items to process`);

    // Enqueue detail pages
    await enqueueLinks({
      urls: itemUrls.map(url =>
        url.startsWith('http') ? url : `https://example.com${url}` // TODO: Update base URL
      ),
      label: 'detail',
    });

  } catch (error) {
    log.error('Failed to process listing page', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// DETAIL PAGE HANDLER
// ============================================================================

router.addHandler('detail', async ({ request, page, log }) => {
  log.info('Processing detail page', { url: request.loadedUrl });
  processedCount++;

  try {
    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Extract data using resilient selectors
    const item = await extractItem(page, request.loadedUrl || request.url, log);

    if (!item) {
      errorCount++;
      return;
    }

    // Save to dataset
    await Dataset.pushData(item);
    successCount++;

    log.info('Successfully extracted item', {
      title: item.title,
      price: item.price,
    });

  } catch (error) {
    errorCount++;
    log.error('Failed to extract item', {
      url: request.loadedUrl,
      error: error instanceof Error ? error.message : String(error),
    });

    // Save error record
    await Dataset.pushData({
      type: 'error',
      url: request.loadedUrl,
      error: error instanceof Error ? error.message : String(error),
      scrapedAt: new Date().toISOString(),
    });
  }
});

// ============================================================================
// EXTRACTION HELPERS
// ============================================================================

/**
 * Extract item data from detail page
 * TODO: Customize selectors for your target site
 */
async function extractItem(
  page: import('playwright').Page,
  url: string,
  log: import('crawlee').Log
): Promise<ExtractedItem | null> {

  // Title - with fallback chain
  const titleLocator = page
    .locator('[data-testid="product-title"]')
    .or(page.locator('h1[class*="title"]'))
    .or(page.locator('h1'));

  const title = await titleLocator.textContent().catch(() => null);

  if (!title) {
    log.error('Could not extract title');
    return null;
  }

  // Price - with fallback chain
  const priceLocator = page
    .locator('[data-testid="price"]')
    .or(page.locator('[class*="price"]:not([class*="original"])'))
    .or(page.locator('.price'));

  const price = await priceLocator.first().textContent().catch(() => null);

  // Original price (if on sale)
  const originalPriceLocator = page
    .locator('[data-testid="original-price"]')
    .or(page.locator('[class*="strikethrough"]'))
    .or(page.locator('[class*="was-price"]'));

  const originalPrice = await originalPriceLocator.first().textContent().catch(() => null);

  // Description
  const descriptionLocator = page
    .locator('[data-testid="description"]')
    .or(page.locator('[class*="description"]'))
    .or(page.locator('.description'));

  const description = await descriptionLocator.first().textContent().catch(() => null);

  // Image
  const imageLocator = page
    .locator('[data-testid="product-image"] img')
    .or(page.locator('img[src*="cdn"]'))
    .or(page.locator('[class*="product"] img'));

  let imageUrl = await imageLocator.first().getAttribute('src').catch(() => null);

  // Normalize image URL
  if (imageUrl) {
    if (imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    } else if (imageUrl.startsWith('/')) {
      imageUrl = 'https://example.com' + imageUrl; // TODO: Update base URL
    }
  }

  return {
    title: title.trim(),
    price: price?.trim() || null,
    originalPrice: originalPrice?.trim() || null,
    description: description?.trim() || null,
    imageUrl,
    url,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Close common popups and modals
 */
async function closePopups(
  page: import('playwright').Page,
  log: import('crawlee').Log
): Promise<void> {
  // Cookie consent
  try {
    const cookieBtn = page
      .locator('button:has-text("Accept")')
      .or(page.locator('button:has-text("OK")'))
      .or(page.locator('button:has-text("Close")'))
      .first();

    if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cookieBtn.click();
      log.debug('Closed cookie popup');
      await page.waitForTimeout(500);
    }
  } catch {
    // No popup found
  }

  // Marketing popup
  try {
    const closeBtn = page
      .locator('[aria-label="Close"]')
      .or(page.locator('[data-testid="modal-close"]'))
      .or(page.locator('.modal-close'))
      .first();

    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
      log.debug('Closed marketing popup');
      await page.waitForTimeout(500);
    }
  } catch {
    // No popup found
  }

  // Escape key fallback
  await page.keyboard.press('Escape');
}

/**
 * Handle pagination (Load More button or scroll)
 */
async function handlePagination(
  page: import('playwright').Page,
  log: import('crawlee').Log
): Promise<void> {
  const MAX_CLICKS = 50; // Safety limit
  let clickCount = 0;

  while (clickCount < MAX_CLICKS) {
    // Look for Load More button
    const loadMoreBtn = page
      .locator('button:has-text("Load More")')
      .or(page.locator('button:has-text("Show More")')
      .or(page.locator('[class*="load-more"]')));

    const isVisible = await loadMoreBtn.isVisible().catch(() => false);

    if (!isVisible) {
      log.debug('No more Load More buttons found');
      break;
    }

    const currentCount = await page.locator('[data-testid="product-card"]').count();

    try {
      await loadMoreBtn.click({ timeout: 10000 });
      log.debug(`Clicked Load More (${clickCount + 1})`);

      // Wait for new items to load
      await page.waitForFunction(
        (min) => document.querySelectorAll('[data-testid="product-card"]').length > min,
        currentCount,
        { timeout: 15000 }
      );

      clickCount++;
    } catch {
      log.debug('Load More click failed or timed out');
      break;
    }
  }

  log.info(`Pagination complete after ${clickCount} clicks`);
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

await Actor.init();

const input = (await Actor.getInput<Input>()) ?? ({} as Input);

const {
  startUrls = [{ url: 'https://example.com/products' }], // TODO: Update default URL
  maxRequestsPerCrawl = 1000,
  dryRun = true,
  maxItems = undefined,
} = input;

// Store configuration in global context for handlers
(globalThis as any).crawlerConfig = { dryRun, maxItems };

if (dryRun) {
  console.log('🧪 DRY RUN MODE: Database operations will be skipped');
}

const crawler = new PlaywrightCrawler({
  maxRequestsPerCrawl,
  requestHandler: router,

  // Concurrency settings
  minConcurrency: 5,
  maxConcurrency: 10,
  maxRequestRetries: 3,

  // Browser settings
  launchContext: {
    launchOptions: {
      headless: true,
      args: [
        '--disable-gpu',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    },
  },

  // Timeout settings
  navigationTimeoutSecs: 60,
  requestHandlerTimeoutSecs: 120,

  // Session/fingerprint settings
  browserPoolOptions: {
    useFingerprints: true,
    maxOpenPagesPerBrowser: 1,
  },
  sessionPoolOptions: {
    maxPoolSize: 3,
    sessionOptions: {
      maxUsageCount: 50,
    },
  },
});

console.log(`🚀 Starting crawler...`);
console.log(`🎯 Target URLs: ${startUrls.length}`);

await crawler.run(startUrls);

// Output run summary
const counters = getCounters();
console.log('\n📊 Run Summary:');
console.log(`   Total Processed: ${counters.total}`);
console.log(`   ✅ Success: ${counters.success}`);
console.log(`   ❌ Failed: ${counters.failed}`);

await Dataset.pushData({
  type: 'run_summary',
  counters,
  finishedAt: new Date().toISOString(),
  dryRun,
});

console.log('✅ Crawler completed');

await Actor.exit();
