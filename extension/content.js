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
      event.target.classList.contains('element-mcp-context-menu') ||
      event.target.id === 'element-mcp-toast' ||
      event.target.id === 'element-mcp-tooltip' ||
      event.target.id === 'element-mcp-overlay') {
    return;
  }
  
  // Remove previous hover highlight
  if (hoveredElement && hoveredElement !== selectedElement) {
    hoveredElement.classList.remove('element-mcp-hover');
    // Remove any existing overlay
    const existingOverlay = document.getElementById('element-mcp-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
  }
  
  // Add hover highlight to current element
  hoveredElement = event.target;
  if (hoveredElement !== selectedElement) {
    hoveredElement.classList.add('element-mcp-hover');
    
    // Create overlay for the hovered element
    const rect = hoveredElement.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.id = 'element-mcp-overlay';
    overlay.style.position = 'absolute';
    overlay.style.left = `${window.scrollX + rect.left}px`;
    overlay.style.top = `${window.scrollY + rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.backgroundColor = 'rgba(33, 150, 243, 0.3)'; // Semi-transparent blue
    overlay.style.pointerEvents = 'none'; // Allow clicks to pass through
    overlay.style.zIndex = '9999';
    document.body.appendChild(overlay);
    
    // Show element tag name tooltip
    const tooltip = document.createElement('div');
    tooltip.textContent = hoveredElement.tagName.toLowerCase();
    if (hoveredElement.id) {
      tooltip.textContent += ` #${hoveredElement.id}`;
    } else if (hoveredElement.className) {
      tooltip.textContent += ` .${hoveredElement.className.split(' ')[0]}`;
    }
    
    tooltip.style.position = 'fixed';
    tooltip.style.backgroundColor = '#2196F3';
    tooltip.style.color = 'white';
    tooltip.style.padding = '4px 8px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.zIndex = '10001';
    tooltip.style.pointerEvents = 'none';
    tooltip.id = 'element-mcp-tooltip';
    
    // Position the tooltip near the cursor
    tooltip.style.left = (event.clientX + 10) + 'px';
    tooltip.style.top = (event.clientY + 10) + 'px';
    
    // Remove any existing tooltip
    const existingTooltip = document.getElementById('element-mcp-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
    
    document.body.appendChild(tooltip);
  }
  
  event.stopPropagation();
}

// Add a mousemove event listener to update tooltip position and overlay
document.addEventListener('mousemove', function(event) {
  if (!isSelectionMode) return;
  
  const tooltip = document.getElementById('element-mcp-tooltip');
  if (tooltip) {
    tooltip.style.left = (event.clientX + 10) + 'px';
    tooltip.style.top = (event.clientY + 10) + 'px';
  }
  
  // Update overlay position if element size/position changes
  if (hoveredElement) {
    const overlay = document.getElementById('element-mcp-overlay');
    if (overlay) {
      const rect = hoveredElement.getBoundingClientRect();
      overlay.style.left = `${window.scrollX + rect.left}px`;
      overlay.style.top = `${window.scrollY + rect.top}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
    }
  }
}, true);

// Handle click event for selecting an element
function handleClick(event) {
  if (!isSelectionMode) return;
  
  // Remove tooltip if it exists
  const tooltip = document.getElementById('element-mcp-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
  
  // Remove overlay if it exists
  const overlay = document.getElementById('element-mcp-overlay');
  if (overlay) {
    overlay.remove();
  }
  
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
  
  // Remove the element-mcp-selected class immediately before saving
  selectedElement.classList.remove('element-mcp-selected');
  
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
    outerHTML: compressHTML(selectedElement.outerHTML),
    computedStyles: getElementStyles(selectedElement)
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
  selectParentOption.style.backgroundColor = '#f8f8f8';
  selectParentOption.addEventListener('mouseenter', () => {
    selectParentOption.style.backgroundColor = '#f0f0f0';
  });
  selectParentOption.addEventListener('mouseleave', () => {
    selectParentOption.style.backgroundColor = '#f8f8f8';
  });
  selectParentOption.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selectedElement.parentElement) {
      selectedElement.classList.remove('element-mcp-selected');
      selectedElement = selectedElement.parentElement;
      selectedElement.classList.add('element-mcp-selected');
      
      if (!selectedElement.id) {
        selectedElement.id = randomUUID();
      }
      
      navigator.clipboard.writeText(`element://${selectedElement.id}`)
        .then(() => {
          console.log('Parent element id copied to clipboard:', `element://${selectedElement.id}`);
        })
        .catch(err => {
          console.error('Failed to copy parent element id:', err);
        });
    }
    contextMenu.remove();
  });
  
  // Add menu items to context menu
  contextMenu.appendChild(selectChildOption);
  contextMenu.appendChild(selectParentOption);
  
  // Add context menu to document
  document.body.appendChild(contextMenu);
  
  // Close context menu when clicking outside
  document.addEventListener('click', function closeMenu(e) {
    if (!contextMenu.contains(e.target)) {
      contextMenu.remove();
      document.removeEventListener('click', closeMenu);
    }
  });
  
  event.preventDefault();
  event.stopPropagation();
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

// Function to compress/truncate HTML content
function compressHTML(html) {
  if (!html) return '';
  
  // Remove excessive whitespace
  let compressed = html.replace(/\s+/g, ' ').trim();
  
  // Set maximum length (adjust as needed)
  const maxLength = 5000;
  
  if (compressed.length > maxLength) {
    // Truncate and add indicator
    compressed = compressed.substring(0, maxLength) + '... [content truncated]';
  }
  
  return compressed;
}

// Function to get computed styles of an element
function getElementStyles(element) {
  const computedStyle = window.getComputedStyle(element);
  const importantStyles = {
    // Layout
    position: computedStyle.position,
    display: computedStyle.display,
    width: computedStyle.width,
    height: computedStyle.height,
    margin: computedStyle.margin,
    padding: computedStyle.padding,
    
    // Visual
    backgroundColor: computedStyle.backgroundColor,
    color: computedStyle.color,
    fontSize: computedStyle.fontSize,
    fontFamily: computedStyle.fontFamily,
    fontWeight: computedStyle.fontWeight,
    
    // Box model
    border: computedStyle.border,
    borderRadius: computedStyle.borderRadius,
    boxShadow: computedStyle.boxShadow,
    
    // Flexbox (if applicable)
    flexDirection: computedStyle.flexDirection,
    justifyContent: computedStyle.justifyContent,
    alignItems: computedStyle.alignItems,
    
    // Grid (if applicable)
    gridTemplateColumns: computedStyle.gridTemplateColumns,
    gridTemplateRows: computedStyle.gridTemplateRows,
    
    // Positioning
    top: computedStyle.top,
    left: computedStyle.left,
    right: computedStyle.right,
    bottom: computedStyle.bottom,
    zIndex: computedStyle.zIndex,
    
    // Transform
    transform: computedStyle.transform,
    
    // Transition
    transition: computedStyle.transition,
    
    // Visibility
    opacity: computedStyle.opacity,
    visibility: computedStyle.visibility,
    
    // Overflow
    overflow: computedStyle.overflow
  };

  // Filter out 'initial' or default values to reduce data size
  return Object.fromEntries(
    Object.entries(importantStyles).filter(([_, value]) => {
      return value !== 'initial' && value !== 'none' && value !== 'normal' && value !== '0px' && value !== 'auto';
    })
  );
} 