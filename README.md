# Web Scraper Builder Skill

A Claude Code skill for building production-ready web scrapers using Crawlee and Playwright.

## What This Skill Does

This skill guides you through the complete web scraping workflow:

1. **Gather Requirements** - Asks about target URL, data fields, and page type
2. **Analyze Page Structure** - Uses browser automation or user-provided HTML
3. **Build Selectors** - Creates resilient CSS selectors with fallback chains
4. **Generate Crawler Code** - Produces complete TypeScript code using Crawlee + Playwright
5. **Test & Iterate** - Guides local testing and refinement

## Features

- **Live DOM Analysis** - Uses Claude in Chrome or Chrome DevTools MCP tools
- **Resilient Selectors** - Priority-based selector strategy (data-testid → ARIA → class* → attributes)
- **Fallback Chains** - Automatic `.or()` fallback patterns for reliability
- **Production Templates** - Complete Crawlee + Playwright boilerplate
- **E-commerce Patterns** - Pre-built patterns for products, deals, pagination

## Installation

### Option 1: Install from .skill file

```bash
# Download the .skill file from releases
claude skill install web-scraper-builder.skill
```

### Option 2: Clone and link

```bash
git clone https://github.com/YOUR_USERNAME/web-scraper-builder-skill.git
cd web-scraper-builder-skill
# Copy to your Claude skills directory
cp -r . ~/.claude/skills/web-scraper-builder/
```

## Usage

Once installed, trigger the skill by asking Claude Code:

- "I want to scrape products from this website"
- "Help me build a crawler for [URL]"
- "Find selectors for extracting prices from this page"
- "Create an Apify actor for data extraction"

## Included Resources

### scripts/crawler-template.ts

Complete Crawlee + Playwright boilerplate with:
- Listing page handler (Load More, infinite scroll)
- Detail page handler (field extraction with fallbacks)
- Popup/modal handling
- Error tracking and run summaries

### references/selector-patterns.md

Comprehensive selector guide covering:
- Selector priority (data-testid → ARIA → class* → attributes)
- Playwright locator methods
- Fallback chains with `.or()`
- Anti-patterns to avoid
- Real-world examples

### references/common-ecommerce-patterns.md

E-commerce extraction patterns for:
- Product listing pages (grids, infinite scroll)
- Product detail pages (JSON-LD, structured data)
- Pagination (Load More, page numbers)
- Price extraction and parsing
- Deal/coupon pages

## Example Output

When you ask to scrape a website, the skill produces:

1. **Selectors Document** - List of identified selectors with confidence ratings
2. **Crawler Code** - Complete TypeScript file ready to run
3. **Testing Instructions** - How to run and validate locally

## Requirements

- Claude Code CLI
- Node.js 18+ (for running generated crawlers)
- pnpm (recommended) or npm

## License

MIT License - see [LICENSE](LICENSE)

## Contributing

Issues and PRs welcome! Please follow the existing code style.
