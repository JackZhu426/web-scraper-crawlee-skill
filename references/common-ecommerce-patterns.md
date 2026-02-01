# Common E-commerce Patterns

Extraction patterns for common e-commerce site structures.

## Table of Contents

1. [Product Listing Pages](#product-listing-pages)
2. [Product Detail Pages](#product-detail-pages)
3. [Pagination Patterns](#pagination-patterns)
4. [Price Extraction](#price-extraction)
5. [Image Extraction](#image-extraction)
6. [Deal/Coupon Pages](#dealcoupon-pages)

---

## Product Listing Pages

### Grid Layout Pattern

Most e-commerce sites use a grid of product cards:

```typescript
// Extract all products from listing
const products = await page.evaluate(() => {
  // Common selectors for product containers
  const cardSelectors = [
    '[data-testid="product-card"]',
    '[class*="product-card"]',
    '[class*="product-tile"]',
    '[data-component-type="s-search-result"]', // Amazon
    '.product-item',
    'article[class*="product"]',
  ];

  // Find which selector works
  let cards: Element[] = [];
  for (const selector of cardSelectors) {
    cards = Array.from(document.querySelectorAll(selector));
    if (cards.length > 0) break;
  }

  return cards.map(card => {
    const link = card.querySelector('a[href*="/product"], a[href*="/p/"]');
    const title = card.querySelector('h2, h3, [class*="title"], [class*="name"]');
    const price = card.querySelector('[class*="price"]:not([class*="original"])');

    return {
      url: link?.getAttribute('href'),
      title: title?.textContent?.trim(),
      price: price?.textContent?.trim(),
    };
  }).filter(p => p.url);
});
```

### Infinite Scroll Pattern

```typescript
async function scrollToLoadAll(page: Page, maxScrolls = 20) {
  let previousHeight = 0;
  let scrollCount = 0;

  while (scrollCount < maxScrolls) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);

    if (currentHeight === previousHeight) {
      break; // No new content loaded
    }

    previousHeight = currentHeight;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000); // Wait for content to load
    scrollCount++;
  }
}
```

---

## Product Detail Pages

### Standard Product Structure

```typescript
interface ProductData {
  title: string;
  price: string | null;
  originalPrice: string | null;
  description: string | null;
  brand: string | null;
  model: string | null;
  images: string[];
  availability: string | null;
  rating: { score: number; count: number } | null;
  specifications: Record<string, string>;
}

async function extractProductDetail(page: Page): Promise<ProductData> {
  // Title
  const title = await page
    .locator('h1[class*="product-title"]')
    .or(page.locator('h1[class*="title"]'))
    .or(page.locator('h1'))
    .first()
    .textContent();

  // Price
  const price = await page
    .locator('[data-testid="price"]')
    .or(page.locator('[class*="price"]:not([class*="was"]):not([class*="original"])'))
    .or(page.locator('[itemprop="price"]'))
    .first()
    .textContent()
    .catch(() => null);

  // Original price (sale items)
  const originalPrice = await page
    .locator('[class*="was-price"]')
    .or(page.locator('[class*="strikethrough"]'))
    .or(page.locator('[class*="original-price"]'))
    .first()
    .textContent()
    .catch(() => null);

  // Brand
  const brand = await page
    .locator('[data-testid="brand"]')
    .or(page.locator('[class*="brand"]'))
    .or(page.locator('[itemprop="brand"]'))
    .first()
    .textContent()
    .catch(() => null);

  // Description
  const description = await page
    .locator('[data-testid="description"]')
    .or(page.locator('[class*="description"]'))
    .or(page.locator('[itemprop="description"]'))
    .first()
    .textContent()
    .catch(() => null);

  // Images
  const images = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll(
      '[class*="product-image"] img, [class*="gallery"] img, [data-testid*="image"] img'
    ));
    return imgs
      .map(img => img.getAttribute('src') || img.getAttribute('data-src'))
      .filter((src): src is string => !!src && !src.includes('placeholder'));
  });

  // Availability
  const availability = await page
    .locator('[class*="availability"]')
    .or(page.locator('[class*="stock"]'))
    .or(page.locator('[itemprop="availability"]'))
    .first()
    .textContent()
    .catch(() => null);

  return {
    title: title?.trim() || '',
    price: price?.trim() || null,
    originalPrice: originalPrice?.trim() || null,
    description: description?.trim() || null,
    brand: brand?.trim() || null,
    model: null, // Often in title or specs
    images,
    availability: availability?.trim() || null,
    rating: null,
    specifications: {},
  };
}
```

### JSON-LD Structured Data

Many sites include structured data that's easier to parse:

```typescript
async function extractJsonLd(page: Page) {
  return await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        // Look for Product type
        if (data['@type'] === 'Product' || data.mainEntity?.['@type'] === 'Product') {
          return data['@type'] === 'Product' ? data : data.mainEntity;
        }
      } catch {
        continue;
      }
    }
    return null;
  });
}

// Usage
const jsonLd = await extractJsonLd(page);
if (jsonLd) {
  const product = {
    title: jsonLd.name,
    price: jsonLd.offers?.price,
    currency: jsonLd.offers?.priceCurrency,
    brand: jsonLd.brand?.name,
    description: jsonLd.description,
    image: jsonLd.image,
    sku: jsonLd.sku,
  };
}
```

---

## Pagination Patterns

### Load More Button

```typescript
async function clickLoadMoreUntilDone(
  page: Page,
  maxClicks = 50,
  itemSelector: string
) {
  let clickCount = 0;

  while (clickCount < maxClicks) {
    const loadMoreBtn = page
      .locator('button:has-text("Load More")')
      .or(page.locator('button:has-text("Show More")')
      .or(page.locator('[class*="load-more"]')));

    if (!await loadMoreBtn.isVisible().catch(() => false)) {
      break;
    }

    const beforeCount = await page.locator(itemSelector).count();

    try {
      await loadMoreBtn.click({ timeout: 10000 });

      // Wait for new items
      await page.waitForFunction(
        ({ selector, minCount }) =>
          document.querySelectorAll(selector).length > minCount,
        { selector: itemSelector, minCount: beforeCount },
        { timeout: 15000 }
      );

      clickCount++;
    } catch {
      break;
    }
  }

  return clickCount;
}
```

### Page Number Navigation

```typescript
async function getAllPaginatedItems(page: Page, itemSelector: string) {
  const allItems: any[] = [];

  while (true) {
    // Extract items from current page
    const items = await extractItemsFromPage(page, itemSelector);
    allItems.push(...items);

    // Look for next page
    const nextBtn = page
      .locator('[aria-label="Next page"]')
      .or(page.locator('a[rel="next"]'))
      .or(page.locator('[class*="pagination"] a:has-text("Next")'))
      .or(page.locator('[class*="pagination"] [class*="next"]'));

    const isDisabled = await nextBtn.getAttribute('disabled').catch(() => null);
    const hasNextPage = await nextBtn.isVisible().catch(() => false) && !isDisabled;

    if (!hasNextPage) break;

    await nextBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  }

  return allItems;
}
```

---

## Price Extraction

### Parsing Price Strings

```typescript
function parsePrice(priceString: string | null | undefined): number | null {
  if (!priceString) return null;

  // Remove currency symbols and whitespace
  const cleaned = priceString
    .replace(/[^0-9.,]/g, '')  // Keep only digits, dots, commas
    .replace(/,(\d{3})/g, '$1') // Remove thousand separators
    .replace(/,/g, '.');        // Convert European decimal

  const price = parseFloat(cleaned);
  return isNaN(price) ? null : price;
}

// Examples:
// "$1,234.56" → 1234.56
// "€ 99,99" → 99.99
// "AU$49.95" → 49.95
// "1.234,56 €" → 1234.56
```

### Handling Sale Prices

```typescript
async function extractPrices(page: Page) {
  // Current/sale price
  const currentPriceText = await page
    .locator('[class*="sale-price"]')
    .or(page.locator('[class*="current-price"]'))
    .or(page.locator('[class*="price"]:not([class*="was"]):not([class*="original"])'))
    .first()
    .textContent()
    .catch(() => null);

  // Original price
  const originalPriceText = await page
    .locator('[class*="was-price"]')
    .or(page.locator('[class*="original-price"]'))
    .or(page.locator('[class*="strikethrough"]'))
    .or(page.locator('s[class*="price"], del[class*="price"]'))
    .first()
    .textContent()
    .catch(() => null);

  const currentPrice = parsePrice(currentPriceText);
  const originalPrice = parsePrice(originalPriceText);

  // Validate: original should be higher than current
  const validOriginal = originalPrice && currentPrice && originalPrice > currentPrice
    ? originalPrice
    : null;

  return {
    currentPrice,
    originalPrice: validOriginal,
    discount: validOriginal ? Math.round((1 - currentPrice! / validOriginal) * 100) : null,
  };
}
```

---

## Image Extraction

### Getting High-Resolution Images

```typescript
async function extractImages(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const images: string[] = [];

    // Product gallery images
    const galleryImgs = document.querySelectorAll(
      '[class*="gallery"] img, [class*="product-image"] img, [data-testid*="image"] img'
    );

    for (const img of galleryImgs) {
      // Prefer srcset highest resolution
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        const sources = srcset.split(',').map(s => s.trim().split(' '));
        // Get highest resolution (usually last)
        const highRes = sources[sources.length - 1]?.[0];
        if (highRes) {
          images.push(highRes);
          continue;
        }
      }

      // Fallback to data-src (lazy loading) or src
      const src = img.getAttribute('data-src') || img.getAttribute('src');
      if (src && !src.includes('placeholder') && !src.includes('loading')) {
        images.push(src);
      }
    }

    return [...new Set(images)]; // Deduplicate
  });
}

// Normalize image URLs
function normalizeImageUrl(url: string, baseUrl: string): string {
  if (url.startsWith('//')) {
    return 'https:' + url;
  }
  if (url.startsWith('/')) {
    return new URL(url, baseUrl).href;
  }
  return url;
}
```

---

## Deal/Coupon Pages

### Extracting Deal Information

```typescript
interface DealData {
  title: string;
  description: string | null;
  couponCode: string | null;
  discountAmount: string | null;
  expiryDate: string | null;
  merchant: string | null;
  url: string;
}

async function extractDeal(page: Page, url: string): Promise<DealData> {
  // Title
  const title = await page
    .locator('h1[class*="deal-title"]')
    .or(page.locator('h1'))
    .first()
    .textContent();

  // Description/content
  const description = await page
    .locator('[class*="deal-content"]')
    .or(page.locator('[class*="description"]'))
    .or(page.locator('article'))
    .first()
    .textContent()
    .catch(() => null);

  // Coupon code (often in a special box)
  const couponCode = await page
    .locator('[class*="coupon-code"] strong')
    .or(page.locator('[class*="promo-code"]'))
    .or(page.locator('[data-testid="coupon"]'))
    .first()
    .textContent()
    .catch(() => null);

  // Discount amount
  const discountAmount = await page
    .locator('[class*="discount"]')
    .or(page.locator('[class*="savings"]'))
    .first()
    .textContent()
    .catch(() => null);

  // Expiry date
  const expiryDate = await page
    .locator('[class*="expir"]')
    .or(page.locator('[class*="valid-until"]'))
    .first()
    .textContent()
    .catch(() => null);

  // Merchant/store
  const merchant = await page
    .locator('[class*="merchant"]')
    .or(page.locator('[class*="store-name"]'))
    .first()
    .textContent()
    .catch(() => null);

  return {
    title: title?.trim() || '',
    description: description?.trim() || null,
    couponCode: couponCode?.trim() || null,
    discountAmount: discountAmount?.trim() || null,
    expiryDate: expiryDate?.trim() || null,
    merchant: merchant?.trim() || null,
    url,
  };
}
```

### OzBargain-Style Deal Extraction

```typescript
// Pattern for deal aggregator sites
async function extractAggregatorDeal(page: Page, dealId: string) {
  // Target specific deal container by ID
  const container = page.locator(`#node${dealId}`);
  await container.waitFor({ timeout: 10000 });

  // Content within the deal (not comments)
  const content = await container.locator('div.content').first().innerHTML();

  // Look for coupon code in specific format
  const pageHtml = await page.content();
  const couponMatch = /<div[^>]*class="couponcode"[^>]*>.*?<strong>([^<]+)<\/strong>/i.exec(pageHtml);
  const couponCode = couponMatch?.[1]?.trim() || null;

  return { content, couponCode };
}
```
