// Initialize when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Element Mcp extension installed');
});

// Create context menu when extension is loaded
chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
});

// Create context menu items
function createContextMenu() {
  chrome.contextMenus.create({
    id: 'startSelection',
    title: 'Start Element Selection',
    contexts: ['page']
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'startSelection') {
    chrome.tabs.sendMessage(tab.id, { action: 'startSelection' });
  }
});

// Handle browser action (icon) clicks
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'startSelection' });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'contentScriptLoaded') {
    createContextMenu();
    sendResponse({status: 'Context menu created'});
  }
  
  if (request.action === 'elementSelected') {
    // Send selected element data to local server
    console.log('Sending element data to local server:', {
      elementId: request.elementId,
      tagName: request.tagName,
      outerHTML: request.outerHTML,
      computedStyles: JSON.parse(request.computedStyles)
    });
    fetch('http://localhost:5000/api/elements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        elementId: request.elementId,
        tagName: request.tagName,
        outerHTML: request.outerHTML,
        computedStyles: request.computedStyles,
        timestamp: new Date().toISOString()
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log('Element saved:', data);
    })
    .catch(error => {
      console.error('Error saving element:', error);
    });
    
    sendResponse({status: 'Element data sent to server'});
  }

  // Handle screenshot capture request
  if (request.action === 'captureElementScreenshot') {
    // Adjust padding calculation for the screenshot area
    const padding = 10; // 10px padding on all sides
    const area = {
      x: Math.max(0, request.area.x - padding),
      y: Math.max(0, request.area.y - padding),
      width: Math.max(1, request.area.width + padding * 2),
      height: Math.max(1, request.area.height + padding * 2)
    };
    
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        sendResponse({error: chrome.runtime.lastError});
        return;
      }
      
      // Send the dataUrl and adjusted area to the content script
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'processScreenshot',
        dataUrl: dataUrl,
        area: area
      }, function(response) {
        if (response && response.dataUrl) {
          sendResponse({dataUrl: response.dataUrl});
        } else {
          sendResponse({error: 'Failed to process screenshot'});
        }
      });
    });
    
    return true; // Required for async sendResponse
  }

  return true;
});
