# Web Scraper Builder Skill

A Claude Code skill for building production-ready web scrapers using Crawlee and Playwright.

## What This Skill Does

Guides you through the complete web scraping workflow:

1. **Gather Requirements** - Asks about target URL, data fields, and page type
2. **Analyze Page Structure** - Uses browser automation or user-provided HTML
3. **Build Selectors** - Creates resilient CSS selectors with fallback chains
4. **Generate Crawler Code** - Produces complete TypeScript code using Crawlee + Playwright
5. **Test & Iterate** - Guides local testing and refinement

## Features

- **Live DOM Analysis** - Uses Claude in Chrome or Chrome DevTools MCP tools
- **Resilient Selectors** - Priority-based strategy (data-testid → ARIA → class* → attributes)
- **Fallback Chains** - Automatic `.or()` fallback patterns for reliability
- **Production Templates** - Complete Crawlee + Playwright boilerplate
- **E-commerce Patterns** - Pre-built patterns for products, deals, pagination

## Installation

Claude Code discovers skills by scanning for `SKILL.md` files in specific directories.

### Option 1: Clone directly to skills directory (recommended)

```bash
# Personal scope (all your projects)
cd ~/.claude/skills
git clone https://github.com/JackZhu426/web-scraper-crawlee-skill.git

# Or project scope (current project only)
cd your-project/.claude/skills
git clone https://github.com/JackZhu426/web-scraper-crawlee-skill.git
```

### Option 2: Download and copy

```bash
# Download/clone anywhere
git clone https://github.com/JackZhu426/web-scraper-crawlee-skill.git

# Copy to Claude skills directory
cp -r web-scraper-builder-skill ~/.claude/skills/web-scraper-builder
```

### Option 3: Extract from .skill file

Download `web-scraper-builder.skill` from releases, then:

```bash
cd ~/.claude/skills
unzip web-scraper-builder.skill
```

## Verify Installation

The skill should appear when you run `/web-scraper-builder` in Claude Code.

## Usage

Once installed, trigger the skill by asking Claude Code:

- "I want to scrape products from this website"
- "Help me build a crawler for [URL]"
- "Find selectors for extracting prices from this page"
- "Create an Apify actor for data extraction"

Or invoke directly: `/web-scraper-builder`

## Included Resources

| File | Description |
|------|-------------|
| `SKILL.md` | Core skill instructions |
| `scripts/crawler-template.ts` | Complete Crawlee + Playwright boilerplate |
| `references/selector-patterns.md` | Comprehensive selector strategy guide |
| `references/common-ecommerce-patterns.md` | E-commerce extraction patterns |

## Requirements

- Claude Code CLI
- Node.js 18+ (for running generated crawlers)
- pnpm (recommended) or npm

## License

MIT License - see [LICENSE](LICENSE)
