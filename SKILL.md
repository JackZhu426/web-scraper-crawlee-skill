---
name: web-scraper-builder
description: |
  Build production-ready web scrapers using Crawlee and Playwright. This skill guides you through analyzing websites, identifying selectors, and generating crawler code that follows best practices.

  Use when:
  - User wants to "scrape a website", "extract data from a page", or "build a crawler"
  - User provides a URL and asks to extract product/deal/content information
  - User needs help finding CSS selectors for web elements
  - User wants to create an Apify actor for data extraction
  - User asks about "web scraping", "DOM analysis", or "Playwright selectors"

  Triggers: "scrape", "crawler", "extract from website", "web scraping", "find selectors", "Apify actor", "Playwright", "Crawlee"
---

# Web Scraper Builder

Build production-ready Crawlee + Playwright crawlers through guided analysis and code generation.

## Workflow

### Phase 1: Gather Requirements

Ask the user:

1. **Target URL**: "What's the URL of the page you want to scrape?"
2. **Data fields**: "What data do you need to extract? (e.g., product title, price, description, image, availability)"
3. **Page type**: "Is this a listing page (multiple items) or a detail page (single item)?"
4. **Analysis method**: "Would you like me to analyze the page live using browser tools, or would you prefer to provide HTML snippets?"

### Phase 2: Analyze Page Structure

**Option A: Live Analysis (Recommended)**
Use `mcp__claude-in-chrome__*` or `mcp__chrome-devtools__*` tools to:
1. Navigate to the target URL
2. Take a screenshot for visual reference
3. Analyze the DOM structure
4. Identify data-testid attributes, semantic elements, and class patterns

**Option B: User-Provided HTML**
If the user provides HTML snippets:
1. Analyze the provided markup
2. Identify stable selector patterns
3. Suggest multiple fallback strategies

### Phase 3: Build Selectors

Follow these selector priority rules (most stable → least stable):

```typescript
// Priority 1: data-testid (most stable)
page.locator('[data-testid="product-title"]')

// Priority 2: Semantic/ARIA
page.getByRole('button', { name: /add to cart/i })
page.getByLabel('Search')

// Priority 3: Partial class match (resilient to hash suffixes)
page.locator('[class*="product-card"]')
page.locator('div[class*="price"]')

// Priority 4: Attribute selectors
page.locator('img[src*="cdn"]')
page.locator('a[href*="/product/"]')

// Priority 5: Fallback chains using .or()
page.locator('[data-testid="price"]')
  .or(page.locator('[class*="price"]'))
  .or(page.locator('.price'))
```

**Always avoid:**
- Exact class names with hashes: `.product-card-abc123`
- Deep nth-child chains: `div:nth-child(3) > div:nth-child(2)`
- Overly generic selectors: `span`, `div`

See `references/selector-patterns.md` for comprehensive selector strategies.

### Phase 4: Generate Crawler Code

Use the template at `scripts/crawler-template.ts` as a starting point. Customize:

1. **Input interface** - Define expected inputs (URLs, limits, flags)
2. **Router handlers** - Create handlers for listing vs detail pages
3. **Extraction logic** - Implement field extraction with fallbacks
4. **Error handling** - Wrap extractions in try-catch blocks

### Phase 5: Test & Iterate

1. Run the crawler locally: `pnpm start:dev` or `apify run --purge`
2. Check extracted data in `storage/datasets/default/`
3. Refine selectors based on edge cases
4. Add missing fallbacks for failed extractions

## Key Patterns

### Always use `page.locator()`, never `document.querySelector()`

```typescript
// ✅ Correct - Auto-waits, better errors
const title = await page.locator('h1[class*="title"]').textContent();

// ❌ Wrong - No auto-waiting, fragile
const title = await page.evaluate(() =>
  document.querySelector('h1.title')?.textContent
);
```

### Batch extraction (for listing pages)

```typescript
const products = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[data-testid="product-card"]'))
    .map(card => ({
      name: card.querySelector('[data-testid="title"]')?.textContent?.trim(),
      price: card.querySelector('[data-testid="price"]')?.textContent?.trim(),
      url: card.querySelector('a')?.getAttribute('href'),
    }))
    .filter(Boolean);
});
```

### Waiting strategies

```typescript
// Wait for element
await page.locator('[data-testid="products"]').waitFor({ timeout: 30000 });

// Wait for network idle (after clicking "Load More")
await page.waitForLoadState('networkidle', { timeout: 15000 });

// Wait for count to increase
await page.waitForFunction(
  (min) => document.querySelectorAll('.product').length > min,
  currentCount,
  { timeout: 15000 }
);
```

### Handling popups/modals

```typescript
const cookieBtn = page.locator('button:has-text("Accept")').first();
if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  await cookieBtn.click();
}
await page.keyboard.press('Escape'); // Fallback
```

## Resources

- `scripts/crawler-template.ts` - Complete Crawlee + Playwright boilerplate
- `references/selector-patterns.md` - Comprehensive selector strategy guide
- `references/common-ecommerce-patterns.md` - Patterns for product pages, deals, pagination

## Output

Deliver:
1. **Selectors document** - List of identified selectors with confidence ratings
2. **Crawler code** - Complete TypeScript file using Crawlee + Playwright
3. **Testing instructions** - How to run and validate the crawler
