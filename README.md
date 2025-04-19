# TimeLife - Price to Working Time Chrome Extension

TimeLife is a Chrome extension that converts prices on any website into the equivalent working time needed to earn that amount, based on your hourly rate.

## Features

- Automatically detects and converts prices on any website
- Customizable hourly rate
- Multiple time display formats:
  - Detailed (2h 30m 15s)
  - Decimal (2.5h)
  - Both combined (2.5h | 2h 30m)
- Toggle to easily enable/disable conversions
- Works with dynamically loaded content

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the directory containing this extension
5. The extension should now appear in your toolbar

## Usage

1. Click on the TimeLife icon in your Chrome toolbar
2. Enter your hourly rate
3. Choose your preferred time format
4. Toggle the extension on/off as needed
5. Click "Save Settings" to apply changes

## How It Works

TimeLife scans webpages for price patterns (like $29.99) and calculates how long you would need to work to earn that amount based on your specified hourly rate. The working time is displayed next to the original price.

## License

MIT