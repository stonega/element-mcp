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
    fetch('http://localhost:5000/api/elements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        elementId: request.elementId,
        tagName: request.tagName,
        innerHTML: request.innerHTML,
        outerHTML: request.outerHTML,
        xpath: request.xpath,
        cssSelector: request.cssSelector,
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
  
  if (request.action === 'selectElementById') {
    selectElementById(request.id)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, message: error.message }));
    return true; // Indicates async response
  }
  
  return true;
});

// Function to select element by ID
async function selectElementById(id) {
  try {
    const response = await fetch('http://localhost:5000/api/sse/selectElementById', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error selecting element by ID:', error);
    return { success: false, message: error.message };
  }
}

// Make sure any tools or APIs you're using are properly referenced 