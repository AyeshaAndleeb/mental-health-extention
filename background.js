chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'analysisComplete') {
    chrome.storage.local.set({ lastAnalysis: message.data });
  }
}); 