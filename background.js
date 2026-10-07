chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    const urlObj = new URL(tab.url);
    const hostname = urlObj.hostname;

    chrome.storage.sync.get({ enabled: true, sites: [] }, (data) => {
      if (data.enabled && data.sites.includes(hostname)) {
        chrome.scripting.insertCSS({
          target: { tabId: tabId },
          css: '::highlight(clicklink-urls) { color: #2563eb !important; text-decoration: underline !important; cursor: pointer !important; }'
        }).catch(err => console.log('Error injecting CSS:', err));

        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        }).catch(err => console.log('Error injecting script:', err));
        
        chrome.action.setBadgeText({ text: 'ON', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: tabId });
      } else {
        chrome.action.setBadgeText({ text: '', tabId: tabId });
      }
    });
  }
});
