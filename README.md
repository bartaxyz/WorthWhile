# TimeLife - Price to Working Time Chrome Extension

TimeLife is a Chrome extension that converts prices on any website into the equivalent working time needed to earn that amount, based on your hourly rate.

## Features

- Automatically detects and converts prices on any website
- Supports multiple currencies (USD, EUR, CZK, GBP)
- Converts between currencies based on approximate exchange rates
- Detects special price formats (like "206 990,-") common in European e-commerce
- Multiple time display formats:
  - Detailed (2h 30m 15s)
  - Decimal (2.5h)
  - Both combined (2.5h | 2h 30m)
- Four display styles to ensure visibility on any background:
  - Dark (white text on black background)
  - Light (black text on white background)
  - Yellow Highlight (black text on yellow background)
  - Subtle Gray (white text on gray background)
- Toggle to easily enable/disable conversions
- Works with dynamically loaded content

## Installation

### From Chrome Web Store

1. Visit the Chrome Web Store (link to be provided)
2. Click "Add to Chrome" to install the extension
3. The extension will appear in your Chrome toolbar

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the directory containing this extension
5. The extension should now appear in your toolbar

## Usage

1. Click on the TimeLife icon in your Chrome toolbar
2. Enter your hourly rate
3. Choose your income currency (the currency your hourly rate is in)
4. Choose your preferred time format and display style
5. Toggle the extension on/off as needed
6. Click "Save Settings" to apply changes

## How It Works

TimeLife scans webpages for price patterns (like $29.99, €19.99, 15 000 Kč, or 206 990,-) and calculates how long you would need to work to earn that amount based on your specified hourly rate. The working time is displayed next to the original price using your chosen display style.

When the extension encounters a price without an explicit currency symbol (such as "206 990,-"), it intelligently infers the currency based on the website's domain (e.g., .cz domains are assumed to use Czech Koruna).

## Privacy

TimeLife respects your privacy:
- All data is stored locally on your device
- No information is sent to external servers
- The extension doesn't track your browsing history
- See our full [Privacy Policy](PRIVACY_POLICY.md)

## Permissions

- **Storage**: To save your settings locally
- **Tabs**: To apply settings across all tabs
- **ActiveTab**: To access the content of your current tab
- **Scripting**: To detect and convert prices on web pages
- **Host Permissions**: To work on all websites

## License

MIT