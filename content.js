let settings = {
  hourlyRate: 20,
  enabled: true,
  format: 'detailed',
  currency: 'USD',
  displayStyle: 'dark'
};

// Currency conversion rates (approximate)
const conversionRates = {
  USD: 1,      // US Dollar (base currency)
  EUR: 1.09,   // Euro to USD
  CZK: 0.044,  // Czech Koruna to USD
  GBP: 1.28    // British Pound to USD
};

// Function to infer currency from domain
function inferCurrencyFromDomain(hostname) {
  // Extract the top-level domain (TLD)
  const domainParts = hostname.split('.');
  const tld = domainParts[domainParts.length - 1].toLowerCase();
  
  // Country-specific TLDs
  const tldToCurrency = {
    'cz': 'CZK',   // Czech Republic
    'sk': 'EUR',   // Slovakia
    'de': 'EUR',   // Germany
    'at': 'EUR',   // Austria
    'fr': 'EUR',   // France
    'it': 'EUR',   // Italy
    'es': 'EUR',   // Spain
    'pt': 'EUR',   // Portugal
    'gr': 'EUR',   // Greece
    'fi': 'EUR',   // Finland
    'nl': 'EUR',   // Netherlands
    'be': 'EUR',   // Belgium
    'ie': 'EUR',   // Ireland
    'ee': 'EUR',   // Estonia
    'lv': 'EUR',   // Latvia
    'lt': 'EUR',   // Lithuania
    'sk': 'EUR',   // Slovakia
    'si': 'EUR',   // Slovenia
    'uk': 'GBP',   // United Kingdom
    'gb': 'GBP',   // Great Britain
    'us': 'USD',   // United States
    'ca': 'CAD',   // Canada
    'au': 'AUD',   // Australia
    'nz': 'NZD'    // New Zealand
  };
  
  // Check for specific domains
  if (hostname.includes('amazon.co.uk') || hostname.includes('.co.uk')) {
    return 'GBP';
  } else if (hostname.includes('amazon.com')) {
    return 'USD';
  } else if (hostname.includes('.cz')) {
    return 'CZK';
  } else if (hostname.includes('.sk') || hostname.includes('.de') || hostname.includes('.fr') || 
             hostname.includes('.it') || hostname.includes('.es') || hostname.includes('.eu')) {
    return 'EUR';
  }
  
  // Check for specific Czech e-commerce sites (these may use the XX XXX,- format)
  const czechShops = [
    'alza', 'czc', 'mall', 'datart', 'kasa', 'mironet', 'tsbohemia', 
    'electro', 'okay', 'expert', 'euronics', 'electroworld'
  ];
  
  for (const shop of czechShops) {
    if (hostname.includes(shop)) {
      return 'CZK';
    }
  }
  
  // Try to determine by TLD
  const currencyByTld = tldToCurrency[tld];
  if (currencyByTld) {
    return currencyByTld;
  }
  
  // Default to user's currency if we can't determine
  return settings.currency;
}

// Load settings when content script starts
chrome.storage.sync.get(
  { hourlyRate: 20, enabled: true, format: 'detailed', currency: 'USD', displayStyle: 'dark' },
  function(items) {
    settings = items;
    if (settings.enabled) {
      // Add debug information to console
      console.log("TimeLife: Extension loaded with settings:", settings);
      setTimeout(convertPricesToTime, 1000); // Wait for page to fully load
      observePageChanges();
    }
  }
);

// Listen for setting changes from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'updateSettings') {
    console.log("TimeLife: Received settings update", request.settings);
    settings = request.settings;
    
    // If enabled, convert prices and start observing
    // If disabled, remove time labels
    if (settings.enabled) {
      removeTimeLabels(); // Remove existing labels first
      setTimeout(() => {
        convertPricesToTime();
        observePageChanges();
      }, 100);
    } else {
      removeTimeLabels();
    }
    
    // Send response to acknowledge receipt
    if (sendResponse) {
      sendResponse({status: "Settings updated"});
    }
  }
  return true; // Required to use sendResponse asynchronously
});

// Function to convert prices to time
function convertPricesToTime() {
  // Regular expressions for different currency formats
  // $ (USD), € (EUR), Kč/CZK (Czech Koruna), £ (GBP), etc.
  const priceRegexes = [
    // Special price formats first (more specific)
    { regex: /([\d\s\u00A0\u2002\u2003\u2009]+),-/g, currencyCode: 'INFER' },   // XX XXX,- (Czech-style pricing)
    
    // Standard currency formats
    { regex: /\$\s*([\d,]+(?:\.\d{1,2})?)/g, currencyCode: 'USD' },            // $XX.XX
    { regex: /([\d,]+(?:\.\d{1,2})?)\s*\$/g, currencyCode: 'USD' },            // XX.XX$
    { regex: /€\s*([\d,.]+(?:[,.]\d{1,2})?)/g, currencyCode: 'EUR' },          // €XX.XX
    { regex: /([\d,.]+(?:[,.]\d{1,2})?)\s*€/g, currencyCode: 'EUR' },          // XX.XX€
    { regex: /([\d\s\u00A0\u2002\u2003\u2009]+(?:[,.]\d{1,2})?)\s*Kč/g, currencyCode: 'CZK' },  // XX XXXKč
    { regex: /([\d\s\u00A0\u2002\u2003\u2009]+(?:[,.]\d{1,2})?)\s*CZK/g, currencyCode: 'CZK' }, // XX XXXCZK
    { regex: /£\s*([\d,]+(?:\.\d{1,2})?)/g, currencyCode: 'GBP' },             // £XX.XX
    { regex: /([\d,]+(?:\.\d{1,2})?)\s*£/g, currencyCode: 'GBP' },             // XX.XX£
    
    // General currency indicators
    { regex: /([\d,.]+(?:[,.]\d{1,2})?)\s*EUR/g, currencyCode: 'EUR' }         // XXEUR
  ];
  
  // Wait for page to be fully loaded
  if (!document.body) return;
  
  // Walk through all text nodes in the document
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const nodesToProcess = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node || !node.parentNode) continue;
    
    const parent = node.parentNode;
    
    // Skip if parent is a time-label, script, style, or is a processed node
    if ((parent.classList && parent.classList.contains('time-label')) ||
        parent.tagName === 'SCRIPT' || 
        parent.tagName === 'STYLE' ||
        parent.tagName === 'INPUT' || 
        parent.tagName === 'TEXTAREA' ||
        parent.tagName === 'NOSCRIPT' ||
        (parent.hasAttribute && parent.hasAttribute('data-timelife-processed'))) {
      continue;
    }
    
    // Skip if any ancestor has been processed already
    let hasProcessedAncestor = false;
    let ancestor = parent;
    while (ancestor) {
      if (ancestor.hasAttribute && ancestor.hasAttribute('data-timelife-processed')) {
        hasProcessedAncestor = true;
        break;
      }
      ancestor = ancestor.parentNode;
    }
    if (hasProcessedAncestor) {
      continue;
    }
    
    // Skip nodes with very short text (likely not containing prices)
    if (!node.textContent || node.textContent.trim().length < 2) {
      continue;
    }
    
    // Check if node contains price text using any of our regexes
    let containsPrice = false;
    for (const { regex } of priceRegexes) {
      regex.lastIndex = 0; // Reset regex index
      if (regex.test(node.textContent)) {
        containsPrice = true;
        break;
      }
    }
    
    if (containsPrice) {
      nodesToProcess.push(node);
    }
  }
  
  // Process collected nodes
  nodesToProcess.forEach(processNode);
  
  console.log("TimeLife: Processed " + nodesToProcess.length + " nodes");
}

// Process a single text node containing price
function processNode(node) {
  // Array of regexes for different currency formats with their respective currency code
  const priceRegexes = [
    // Dollar formats
    { regex: /\$\s*([\d,]+(?:\.\d{1,2})?)/g, currencyCode: 'USD' },            // $XX.XX
    { regex: /([\d,]+(?:\.\d{1,2})?)\s*\$/g, currencyCode: 'USD' },            // XX.XX$
    
    // Euro formats
    { regex: /€\s*([\d,.]+(?:[,.]\d{1,2})?)/g, currencyCode: 'EUR' },          // €XX.XX or €XX,XX
    { regex: /([\d,.]+(?:[,.]\d{1,2})?)\s*€/g, currencyCode: 'EUR' },          // XX.XX€ or XX,XX€
    { regex: /([\d,.]+(?:[,.]\d{1,2})?)\s*EUR/g, currencyCode: 'EUR' },        // XXEUR
    
    // Czech koruna formats - with spaces for thousands (including non-breaking spaces)
    { regex: /([\d\s\u00A0\u2002\u2003\u2009]+(?:[,.]\d{1,2})?)\s*Kč/g, currencyCode: 'CZK' },  // XX XXXKč or XX XXX,XXKč
    { regex: /([\d\s\u00A0\u2002\u2003\u2009]+(?:[,.]\d{1,2})?)\s*CZK/g, currencyCode: 'CZK' }, // XX XXXCZK or XX XXX,XXCZK
    
    // British Pound formats
    { regex: /£\s*([\d,]+(?:\.\d{1,2})?)/g, currencyCode: 'GBP' },             // £XX.XX
    { regex: /([\d,]+(?:\.\d{1,2})?)\s*£/g, currencyCode: 'GBP' },             // XX.XX£
    
    // Special format with ",- " (common in Czechia, parts of Europe)
    // This regex handles regular spaces, non-breaking spaces, and other whitespace characters
    { regex: /([\d\s\u00A0\u2002\u2003\u2009]+),-/g, currencyCode: 'INFER' }      // XX XXX,-
  ];
  
  // Replace HTML entities with their actual characters
  // The browser generally handles this, but sometimes text nodes may contain entity references
  // This specifically helps with &nbsp; which is common in price formatting
  let text = node.textContent;
  
  // Check for the specific price format we're trying to match
  if (text.includes('990,-') || text.includes('206')) {
    console.log("TimeLife: Found potential price text:", text);
  }
  
  // Try to decipher HTML entities that might not be properly parsed in the DOM
  if (text.includes('&nbsp;')) {
    console.log("TimeLife: Found text with &nbsp;", text);
    text = text.replace(/&nbsp;/g, ' ');
  }
  
  // Remove any characters that might interfere with regex matching
  text = text.replace(/\u00A0/g, ' '); // Replace non-breaking spaces with regular spaces
  
  let fragments = [];
  let processedText = text;
  let hasMatches = false;
  
  // Try each regex pattern
  for (const { regex, currencyCode } of priceRegexes) {
    regex.lastIndex = 0; // Reset regex index
    processedText = text; // Reset to original text
    fragments = [];
    let match;
    let lastIndex = 0;
    hasMatches = false;
    
    // For each price match in the text
    while ((match = regex.exec(processedText)) !== null) {
      hasMatches = true;
      // Add text before the match
      if (match.index > lastIndex) {
        fragments.push(document.createTextNode(processedText.substring(lastIndex, match.index)));
      }
      
      // Extract the amount from the match
      let amount = match[1] || match[0];
      
      // Handle number formatting based on currency
      const detectedCurrency = priceRegexes[priceRegexes.indexOf(priceRegexes.find(p => p.regex === regex))].currencyCode;
      
      // Special handling for different number formats
      if (detectedCurrency === 'CZK' || detectedCurrency === 'INFER') {
        // Czech format: typically uses spaces (including non-breaking spaces) as thousand separators and commas as decimal
        // Remove all types of spaces (used as thousand separators in Czech)
        amount = amount.replace(/[\s\u00A0\u2002\u2003\u2009]/g, '');
        // Handle decimal comma if present
        amount = amount.replace(/,/g, '.');
      } else {
        // General handling for other currencies
        // First, handle European/international format (1.234,56)
        if (amount.indexOf(',') > 0 && amount.indexOf('.') > 0 && amount.indexOf('.') < amount.indexOf(',')) {
          // European format with dot as thousand separator and comma as decimal
          amount = amount.replace(/\./g, ''); // Remove dots (thousand separators)
          amount = amount.replace(/,/g, '.'); // Replace comma with dot for decimal
        } else {
          // Handle US/UK format or simple formats
          amount = amount.replace(/,/g, ''); // Remove commas (thousand separators)
        }
      }
      
      // Final cleanup - remove all non-digit characters except decimal point
      amount = amount.replace(/[^\d.]/g, '');
      amount = parseFloat(amount);
      
      if (!isNaN(amount)) {
        // Get the detected currency code for this price
        let detectedCurrency = priceRegexes[priceRegexes.indexOf(priceRegexes.find(p => p.regex === regex))].currencyCode;
        
        // If currency needs to be inferred from domain
        if (detectedCurrency === 'INFER') {
          detectedCurrency = inferCurrencyFromDomain(window.location.hostname);
          console.log("TimeLife: Inferred currency", detectedCurrency, "from domain", window.location.hostname);
        }
        
        console.log("TimeLife: Detected currency", detectedCurrency, "for", match[0]);
        
        // Convert from detected currency to user's currency
        const userCurrencyRate = conversionRates[settings.currency];
        const detectedCurrencyRate = conversionRates[detectedCurrency];
        
        // Skip if we couldn't determine the currency rate
        if (!detectedCurrencyRate) {
          console.log("TimeLife: Unknown currency rate for", detectedCurrency);
          fragments.push(document.createTextNode(match[0]));
          lastIndex = match.index + match[0].length;
          continue;
        }
        
        // Convert to a common base (USD) and then to user's currency
        let convertedAmount = amount;
        if (detectedCurrency !== settings.currency) {
          // Convert to USD first
          convertedAmount = amount * detectedCurrencyRate;
          // Then convert to user's currency
          convertedAmount = convertedAmount / userCurrencyRate;
        }
        
        // Calculate work time in hours
        const workHours = convertedAmount / settings.hourlyRate;
        
        // Format the time display
        const timeDisplay = formatTime(workHours);
        
        // Create the original price span
        const priceSpan = document.createElement('span');
        priceSpan.textContent = match[0];
        fragments.push(priceSpan);
        
        // Create time label with styling based on user preference
        const timeLabel = document.createElement('span');
        timeLabel.className = 'time-label';
        
        // Apply styling based on displayStyle setting
        switch(settings.displayStyle) {
          case 'light':
            timeLabel.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            timeLabel.style.color = 'black';
            timeLabel.style.border = '1px solid #ddd';
            break;
          case 'highlight':
            timeLabel.style.backgroundColor = 'rgba(255, 255, 0, 0.8)';
            timeLabel.style.color = 'black';
            break;
          case 'subtle':
            timeLabel.style.backgroundColor = 'rgba(100, 100, 100, 0.8)';
            timeLabel.style.color = 'white';
            break;
          case 'dark':
          default:
            timeLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            timeLabel.style.color = 'white';
            break;
        }
        
        // Common styling
        timeLabel.style.padding = '2px 5px';
        timeLabel.style.borderRadius = '3px';
        timeLabel.style.marginLeft = '5px';
        timeLabel.style.fontSize = '0.9em';
        timeLabel.style.display = 'inline-block';
        timeLabel.textContent = `${timeDisplay}`;
        fragments.push(timeLabel);
      } else {
        // If parsing failed, just add the original text
        fragments.push(document.createTextNode(match[0]));
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text
    if (lastIndex < processedText.length) {
      fragments.push(document.createTextNode(processedText.substring(lastIndex)));
    }
    
    // If we found matches with this regex, break out of the loop
    if (hasMatches) {
      break;
    }
  }
  
  // Replace the original node with our fragments
  if (hasMatches && fragments.length > 0) {
    // Create a container span to hold all fragments
    const container = document.createElement('span');
    container.setAttribute('data-timelife-processed', 'true');
    container.setAttribute('data-original-text', text);
    
    // Add all fragments to the container
    fragments.forEach(fragment => container.appendChild(fragment));
    
    // Replace the original node with our container
    if (node.parentNode) {
      node.parentNode.replaceChild(container, node);
    }
  }
}

// Format time based on selected format
function formatTime(hours) {
  if (settings.format === 'decimal') {
    return `${hours.toFixed(2)}h`;
  }
  
  // Calculate hours, minutes, and seconds
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.floor(((hours - h) * 60 - m) * 60);
  
  if (settings.format === 'both') {
    const detailed = [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : '', h === 0 && m === 0 && s > 0 ? `${s}s` : ''].filter(Boolean).join(' ');
    return `${hours.toFixed(2)}h | ${detailed}`;
  }
  
  // Default: detailed format
  if (h === 0 && m === 0) {
    return `${s}s`;
  } else if (h === 0) {
    return `${m}m${s > 0 ? ` ${s}s` : ''}`;
  } else {
    return `${h}h${m > 0 ? ` ${m}m` : ''}${s > 0 && h < 10 ? ` ${s}s` : ''}`;
  }
}

// Remove all time labels from the page and reset processed nodes
function removeTimeLabels() {
  // Find all elements with the time-label class
  const timeLabels = document.querySelectorAll('.time-label');
  timeLabels.forEach(label => {
    if (label && label.parentNode) {
      label.parentNode.removeChild(label);
    }
  });
  
  // Find all elements with the processed-node attribute and restore their original content
  const processedNodes = document.querySelectorAll('[data-timelife-processed="true"]');
  processedNodes.forEach(node => {
    if (node.dataset.originalText) {
      // Create a text node with the original content
      const originalTextNode = document.createTextNode(node.dataset.originalText);
      // Replace the processed node with the original text
      if (node.parentNode) {
        node.parentNode.replaceChild(originalTextNode, node);
      }
    }
  });
}

// Variable to track if processing is in progress
let processingChanges = false;

// Observe page for dynamic content changes
function observePageChanges() {
  // Clean up observer if it exists
  if (window.timeLifeObserver) {
    window.timeLifeObserver.disconnect();
  }
  
  // Create new observer
  const observer = new MutationObserver(mutations => {
    // Skip if already processing or extension is disabled
    if (processingChanges || !settings.enabled) return;
    
    let shouldProcess = false;
    
    // Check if any mutation includes text nodes or added nodes
    for (const mutation of mutations) {
      // Skip mutations on our own elements
      if (mutation.target && 
          ((mutation.target.hasAttribute && mutation.target.hasAttribute('data-timelife-processed')) ||
           (mutation.target.classList && mutation.target.classList.contains('time-label')))) {
        continue;
      }
      
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        let hasRelevantNodes = false;
        // Check if added nodes are relevant (not our own elements)
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (!node.hasAttribute || !node.hasAttribute('data-timelife-processed')) {
              hasRelevantNodes = true;
              break;
            }
          } else if (node.nodeType === Node.TEXT_NODE) {
            hasRelevantNodes = true;
            break;
          }
        }
        if (hasRelevantNodes) {
          shouldProcess = true;
          break;
        }
      }
      if (mutation.type === 'characterData' && 
          mutation.target.nodeType === Node.TEXT_NODE &&
          (!mutation.target.parentNode || 
           !mutation.target.parentNode.hasAttribute('data-timelife-processed'))) {
        shouldProcess = true;
        break;
      }
    }
    
    if (shouldProcess && settings.enabled) {
      // Set flag to prevent duplicate processing
      processingChanges = true;
      
      // Small timeout to batch potential multiple rapid changes
      setTimeout(() => {
        convertPricesToTime();
        processingChanges = false;
      }, 500);
    }
  });
  
  // Observe the entire document for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  // Store observer for future cleanup
  window.timeLifeObserver = observer;
}

// Initialize a clean slate and run conversion
function initializeExtension() {
  // Clean up first
  removeTimeLabels();
  
  // Reset processing flag
  processingChanges = false;
  
  // Start conversion if enabled
  if (settings.enabled) {
    setTimeout(() => {
      convertPricesToTime();
      observePageChanges();
      console.log("TimeLife: Extension initialized with settings:", settings);
    }, 500);
  }
}

// Run when the page loads
window.addEventListener('load', initializeExtension);

// Also run immediately in case we're on an already-loaded page
if (document.readyState === 'complete') {
  initializeExtension();
}