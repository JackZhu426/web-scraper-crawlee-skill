# Selector Patterns Reference

Comprehensive guide to building resilient CSS selectors for web scraping.

## Table of Contents

1. [Selector Priority](#selector-priority)
2. [Playwright Locator Methods](#playwright-locator-methods)
3. [Attribute Selectors](#attribute-selectors)
4. [Fallback Chains](#fallback-chains)
5. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
6. [Real-World Examples](#real-world-examples)

---

## Selector Priority

From most stable to least stable:

### 1. data-testid Attributes (Best)

```typescript
page.locator('[data-testid="product-title"]')
page.locator('[data-testid="price"]')
page.locator('[data-testid="add-to-cart"]')
```

**Why:** Developers add these specifically for testing/automation. They rarely change.

### 2. Semantic/ARIA Selectors

```typescript
page.getByRole('button', { name: /add to cart/i })
page.getByRole('heading', { level: 1 })
page.getByLabel('Email address')
page.getByText('Free shipping')
```

**Why:** Based on accessibility attributes that have semantic meaning.

### 3. Partial Class Match with `*=`

```typescript
page.locator('[class*="product-card"]')     // Contains "product-card"
page.locator('div[class*="price"]')         // Contains "price"
page.locator('span[class*="title"]')        // Contains "title"
page.locator('[class*="product"][class*="image"]')  // Multiple partials
```

**Why:** Resilient to hash suffixes like `.product-card-abc123`.

### 4. Attribute Selectors

```typescript
page.locator('img[src*="cdn"]')             // Image from CDN
page.locator('a[href*="/product/"]')        // Product link
page.locator('[id*="price"]')               // ID containing "price"
page.locator('input[type="email"]')         // Email input
page.locator('[aria-label*="cart"]')        // Accessibility label
```

### 5. Tag + Context Combination

```typescript
page.locator('main').locator('h1')                    // H1 within main
page.locator('[class*="product-card"]').locator('a')  // Link within card
page.locator('article').first().locator('img')        // Image in first article
```

---

## Playwright Locator Methods

### Core Methods

```typescript
// Basic locator
page.locator('selector')

// Role-based (accessibility)
page.getByRole('button', { name: /submit/i })
page.getByRole('link', { name: 'Learn more' })
page.getByRole('textbox', { name: 'Email' })

// Label-based
page.getByLabel('Password')

// Placeholder-based
page.getByPlaceholder('Enter your email')

// Text-based
page.getByText('Add to Cart')
page.getByText(/free shipping/i)  // Case-insensitive regex

// Alt text for images
page.getByAltText('Product photo')

// Test ID
page.getByTestId('submit-button')
```

### Chaining and Filtering

```typescript
// Chain locators for specificity
page.locator('main').locator('[class*="product"]').locator('h2')

// Filter by text
page.locator('button').filter({ hasText: 'Submit' })

// Filter by child element
page.locator('div').filter({ has: page.locator('img') })

// First/last/nth
page.locator('.item').first()
page.locator('.item').last()
page.locator('.item').nth(2)

// Fallback chains
page.locator('selector1').or(page.locator('selector2'))
```

---

## Attribute Selectors

### Operators

```typescript
// Exact match
[attribute="value"]
page.locator('[data-testid="product"]')

// Contains
[attribute*="value"]
page.locator('[class*="price"]')

// Starts with
[attribute^="value"]
page.locator('[href^="/product/"]')

// Ends with
[attribute$="value"]
page.locator('[src$=".png"]')

// Contains word (space-separated)
[attribute~="value"]
page.locator('[class~="active"]')

// Multiple attributes
[attr1="val1"][attr2*="val2"]
page.locator('[type="button"][class*="primary"]')
```

### Common Use Cases

```typescript
// CDN images
page.locator('img[src*="cloudinary"]')
page.locator('img[src*="cdn"]')

// Product links
page.locator('a[href*="/product/"]')
page.locator('a[href*="/p/"]')

// Dynamic IDs (avoid exact match)
page.locator('[id*="product-title"]')  // Better than #product-title-12345

// Form inputs
page.locator('input[name="email"]')
page.locator('input[type="submit"]')
```

---

## Fallback Chains

Build resilient selectors with `.or()`:

```typescript
// Price selector with 5-level fallback
const priceLocator = page
  .locator('[data-testid="price"]')           // Level 1: data-testid
  .or(page.locator('[itemprop="price"]'))     // Level 2: Schema.org
  .or(page.locator('[class*="price"]:not([class*="original"])'))  // Level 3: Class
  .or(page.locator('.price'))                 // Level 4: Simple class
  .or(page.locator('[id*="price"]'));         // Level 5: ID fallback

// Title with semantic fallback
const titleLocator = page
  .locator('[data-testid="product-title"]')
  .or(page.locator('h1[class*="product-title"]'))
  .or(page.locator('h1[class*="title"]'))
  .or(page.locator('h1').first());

// Image with CDN awareness
const imageLocator = page
  .locator('[data-testid="product-image"] img')
  .or(page.locator('img[src*="cloudinary"]'))
  .or(page.locator('img[src*="cdn"]'))
  .or(page.locator('[class*="product"] img').first());
```

---

## Anti-Patterns to Avoid

### ❌ Exact Class Names with Hashes

```typescript
// BAD - Will break when hash changes
page.locator('.product-card-abc123')
page.locator('.styles_price__xyz789')

// GOOD - Partial match
page.locator('[class*="product-card"]')
page.locator('[class*="price"]')
```

### ❌ Deep nth-child Chains

```typescript
// BAD - Extremely fragile
page.locator('div:nth-child(3) > div:nth-child(2) > span:nth-child(1)')

// GOOD - Target by attribute
page.locator('[class*="product-info"] span[class*="price"]')
```

### ❌ Overly Generic Selectors

```typescript
// BAD - Matches too many elements
page.locator('span')
page.locator('div')
page.locator('a')

// GOOD - Add context
page.locator('[class*="product-card"] span[class*="title"]')
page.locator('main').locator('h1')
```

### ❌ Relying on Text Content Alone

```typescript
// BAD - Language/formatting dependent
page.locator('text="$99.99"')

// GOOD - Structure-based
page.locator('[class*="price"]')
```

### ❌ Using document.querySelector in evaluate()

```typescript
// BAD - No auto-waiting, poor error messages
await page.evaluate(() => document.querySelector('h1')?.textContent)

// GOOD - Use page.locator()
await page.locator('h1').textContent()
```

---

## Real-World Examples

### E-commerce Product Card

```typescript
// JB Hi-Fi pattern (data-testid heavy)
const card = page.locator('[data-testid="product-card-content"]');
const title = card.locator('[data-testid="product-card-title"]');
const price = card.locator('[data-testid="ticket-price"]');
const originalPrice = card.locator('[data-testid="floating-header-strikethrough-price"]');
const link = card.locator('[data-testid="product-card-content-link"]');

// Amazon pattern (class-based)
const card = page.locator('[data-component-type="s-search-result"]');
const title = card.locator('h2 a span');
const price = card.locator('[class*="price-whole"]');
const link = card.locator('h2 a');
```

### Deal/Coupon Sites

```typescript
// OzBargain pattern
const dealContainer = page.locator(`#node${dealId}`);
const content = dealContainer.locator('div.content').first();
const couponCode = page.locator('div.couponcode strong');
```

### Pagination

```typescript
// Load More button
const loadMoreBtn = page
  .locator('button.load-more-button')
  .or(page.getByRole('button', { name: /load more/i }))
  .or(page.locator('[class*="load-more"]'));

// Next page link
const nextPageBtn = page
  .locator('[aria-label="Next page"]')
  .or(page.locator('a[rel="next"]'))
  .or(page.locator('[class*="pagination"] a:has-text("Next")'));
```

### Form Inputs

```typescript
// Email input
const emailInput = page
  .locator('input[type="email"]')
  .or(page.locator('input[name="email"]'))
  .or(page.getByLabel('Email'))
  .or(page.getByPlaceholder('Enter email'));

// Submit button
const submitBtn = page
  .locator('button[type="submit"]')
  .or(page.getByRole('button', { name: /submit|sign up/i }))
  .or(page.locator('input[type="submit"]'));
```
