// Background Service Worker for Tyquill Extension

chrome.runtime.onInstalled.addListener(() => {
  // console.log('Tyquill Extension installed');
});

// Handle extension icon click to open side panel
chrome.action.onClicked.addListener(async (tab) => {
  // console.log('Extension icon clicked');
  
  // Open side panel
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
    // console.log('Side panel opened');
  } catch (error) {
    // console.error('Failed to open side panel:', error);
  }
});

chrome.runtime.onMessage.addListener((request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  // Handle messages from content script or popup
  // console.log('Message received:', request);
  sendResponse({ success: true });
});

export {}; 