let hoveredElement = null;
let selectedElement = null;
let isSelectionMode = false;

// Start selection mode
function startSelectionMode() {
  isSelectionMode = true;
  document.body.style.cursor = 'crosshair';
  
  // Create a notification to indicate selection mode is active
  const notification = document.createElement('div');
  notification.textContent = 'Element selection mode active. Click on an element to select it.';
  notification.style.position = 'fixed';
  notification.style.top = '10px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.backgroundColor = '#333';
  notification.style.color = 'white';
  notification.style.padding = '10px 15px';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '10000';
  notification.id = 'element-mcp-notification';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Handle mouseover event
function handleMouseOver(event) {
  if (!isSelectionMode) return;
  
  // Prevent highlighting the extension's own elements
  if (event.target.id === 'element-mcp-notification' || 
      event.target.classList.contains('element-mcp-context-menu')) {
    return;
  }
  
  // Remove previous hover highlight
  if (hoveredElement && hoveredElement !== selectedElement) {
    hoveredElement.classList.remove('element-mcp-hover');
  }
  
  // Add hover highlight to current element
  hoveredElement = event.target;
  if (hoveredElement !== selectedElement) {
    hoveredElement.classList.add('element-mcp-hover');
  }
  
  event.stopPropagation();
}

// Handle click event for selecting an element
function handleClick(event) {
  if (!isSelectionMode) return;
  
  // Prevent selecting the extension's own elements
  if (event.target.id === 'element-mcp-notification' || 
      event.target.classList.contains('element-mcp-context-menu')) {
    return;
  }
  
  // Remove previous selection highlight
  if (selectedElement) {
    selectedElement.classList.remove('element-mcp-selected');
  }
  
  // Remove hover highlight
  if (hoveredElement) {
    hoveredElement.classList.remove('element-mcp-hover');
  }
  
  // Add selection highlight to current element
  selectedElement = event.target;
  selectedElement.classList.add('element-mcp-selected');
  
  // End selection mode
  isSelectionMode = false;
  document.body.style.cursor = 'default';
  
  // Generate a unique ID for the element if it doesn't have one
  if (!selectedElement.id) {
    selectedElement.id = randomUUID();
  }
  
  // Copy UUID to clipboard
  navigator.clipboard.writeText(`element://${selectedElement.id}`)
    .then(() => {
      console.log('Element id copied to clipboard:', `element://${selectedElement.id}`);
    })
    .catch(err => {
      console.error('Failed to copy element id:', err);
    });
  
  // Send selected element data to background script
  chrome.runtime.sendMessage({
    action: 'elementSelected',
    elementId: selectedElement.id,
    tagName: selectedElement.tagName,
    innerHTML: selectedElement.innerHTML,
    outerHTML: selectedElement.outerHTML,
    xpath: getXPath(selectedElement),
    cssSelector: getCssSelector(selectedElement)
  });
  
  // Show selection confirmation toast
  const toast = document.createElement('div');
  toast.textContent = `${selectedElement.id} copied to clipboard`;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = '#4CAF50';
  toast.style.color = 'white';
  toast.style.padding = '10px 15px';
  toast.style.borderRadius = '5px';
  toast.style.zIndex = '10000';
  toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  toast.id = 'element-mcp-toast';
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
  
  event.preventDefault();
  event.stopPropagation();
}

// Handle context menu (right-click)
function handleContextMenu(event) {
  if (!selectedElement) return;
  
  // Create context menu
  const contextMenu = document.createElement('div');
  contextMenu.classList.add('element-mcp-context-menu');
  contextMenu.style.position = 'absolute';
  contextMenu.style.left = event.pageX + 'px';
  contextMenu.style.top = event.pageY + 'px';
  contextMenu.style.backgroundColor = 'white';
  contextMenu.style.border = '1px solid #ccc';
  contextMenu.style.borderRadius = '4px';
  contextMenu.style.padding = '5px 0';
  contextMenu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  contextMenu.style.zIndex = '10000';
  
  // Create menu items
  const selectChildOption = document.createElement('div');
  selectChildOption.textContent = 'Select Child';
  selectChildOption.style.padding = '8px 12px';
  selectChildOption.style.cursor = 'pointer';
  selectChildOption.style.hover = 'background-color: #f0f0f0';
  selectChildOption.addEventListener('click', () => {
    if (selectedElement.children.length > 0) {
      selectedElement.classList.remove('element-mcp-selected');
      selectedElement = selectedElement.children[0];
      selectedElement.classList.add('element-mcp-selected');
    }
    contextMenu.remove();
  });
  
  const selectParentOption = document.createElement('div');
  selectParentOption.textContent = 'Select Parent';
  selectParentOption.style.padding = '8px 12px';
  selectParentOption.style.cursor = 'pointer';
  selectParentOption.addEventListener('click', () => {
    if (selectedElement.parentElement) {
      selectedElement.classList.remove('element-mcp-selected');
      selectedElement = selectedElement.parentElement;
      selectedElement.classList.add('element-mcp-selected');
    }
    contextMenu.remove();
  });
  
  // Add menu items to context menu
  contextMenu.appendChild(selectChildOption);
  contextMenu.appendChild(selectParentOption);
  
  // Add context menu to document
  document.body.appendChild(contextMenu);
  
  // Close context menu when clicking outside
  document.addEventListener('click', function closeMenu() {
    contextMenu.remove();
    document.removeEventListener('click', closeMenu);
  });
  
  event.preventDefault();
}

// Get XPath for element
function getXPath(element) {
  if (!element) return '';
  
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  if (element === document.body) {
    return '/html/body';
  }
  
  let ix = 0;
  const siblings = element.parentNode.childNodes;
  
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    
    if (sibling === element) {
      return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
    }
    
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      ix++;
    }
  }
}

// Get CSS selector for element
function getCssSelector(element) {
  if (!element) return '';
  
  if (element.id) {
    return '#' + element.id;
  }
  
  if (element === document.body) {
    return 'body';
  }
  
  let path = '';
  while (element.nodeType === Node.ELEMENT_NODE) {
    let selector = element.nodeName.toLowerCase();
    
    if (element.id) {
      selector = '#' + element.id;
      path = selector + ' ' + path;
      break;
    } else if (element.className) {
      selector += '.' + element.className.replace(/\s+/g, '.');
    }
    
    path = selector + ' ' + path;
    element = element.parentNode;
  }
  
  return path.trim();
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'startSelection') {
    startSelectionMode();
    sendResponse({status: 'Selection mode started'});
  }
});

// Add event listeners
document.addEventListener('mouseover', handleMouseOver, true);
document.addEventListener('click', handleClick, true);
document.addEventListener('contextmenu', handleContextMenu, true);

// Set up SSE connection
function setupSSEConnection() {
  const eventSource = new EventSource('http://localhost:5000/api/sse/events');
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('SSE event received:', data);
    
    // Handle different event types
    switch (data.type) {
      case 'elementSelected':
        highlightElement(data.element);
        break;
      // Handle other event types as needed
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    eventSource.close();
    // Attempt to reconnect after a delay
    setTimeout(setupSSEConnection, 5000);
  };
  
  return eventSource;
}

function highlightElement(elementData) {
  const element = document.getElementById(elementData.id);
  if (element) {
    // Add highlight class
    element.classList.add('mcp-highlighted');
    
    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Remove highlight after a delay
    setTimeout(() => {
      element.classList.remove('mcp-highlighted');
    }, 3000);
  }
}

// Initialize SSE connection when content script loads
const sseConnection = setupSSEConnection();

// Initialize
chrome.runtime.sendMessage({action: 'contentScriptLoaded'});

// Add a function to generate a random UUID if not already defined
function randomUUID() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
} 