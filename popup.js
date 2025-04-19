document.addEventListener('DOMContentLoaded', function() {
  // Load saved settings
  chrome.storage.sync.get(
    { hourlyRate: 20, enabled: true, format: 'detailed', currency: 'USD', displayStyle: 'dark' },
    function(items) {
      document.getElementById('hourlyRate').value = items.hourlyRate;
      document.getElementById('enableToggle').checked = items.enabled;
      document.getElementById('format').value = items.format;
      
      // Set currency if it exists
      if (items.currency && document.getElementById('currency')) {
        document.getElementById('currency').value = items.currency;
      }
      
      // Set display style if it exists
      if (items.displayStyle && document.getElementById('displayStyle')) {
        document.getElementById('displayStyle').value = items.displayStyle;
      }
    }
  );

  // Save settings when button is clicked
  document.getElementById('saveButton').addEventListener('click', function() {
    const hourlyRate = parseFloat(document.getElementById('hourlyRate').value);
    const enabled = document.getElementById('enableToggle').checked;
    const format = document.getElementById('format').value;
    const currency = document.getElementById('currency').value;
    const displayStyle = document.getElementById('displayStyle').value;
    
    if (isNaN(hourlyRate) || hourlyRate <= 0) {
      document.getElementById('status').textContent = 'Please enter a valid hourly rate';
      return;
    }
    
    chrome.storage.sync.set(
      { hourlyRate: hourlyRate, enabled: enabled, format: format, currency: currency, displayStyle: displayStyle },
      function() {
        // Update status to let user know settings were saved
        const status = document.getElementById('status');
        status.textContent = 'Settings saved!';
        
        // Send message to active tab to refresh conversion
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'updateSettings',
              settings: { hourlyRate, enabled, format, currency, displayStyle }
            });
          }
        });
        
        // Apply settings to all tabs
        chrome.tabs.query({}, function(tabs) {
          tabs.forEach(tab => {
            if (tab.url && tab.url.startsWith('http')) {
              chrome.tabs.sendMessage(tab.id, {
                action: 'updateSettings',
                settings: { hourlyRate, enabled, format, currency, displayStyle }
              }, function(response) {
                // Handle potential error when the content script is not yet loaded
                if (chrome.runtime.lastError) {
                  console.log('Message not sent to tab: ' + tab.id);
                }
              });
            }
          });
        });
        
        // Clear status message after 1.5 seconds
        setTimeout(function() {
          status.textContent = '';
        }, 1500);
      }
    );
  });
});