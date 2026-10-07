document.addEventListener('DOMContentLoaded', async () => {
  const globalToggle = document.getElementById('global-toggle');
  const addSiteBtn = document.getElementById('add-site-btn');
  const siteList = document.getElementById('site-list');
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');

  let currentHostname = '';

  // Get current tab hostname
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0 && tabs[0].url && tabs[0].url.startsWith('http')) {
    const urlObj = new URL(tabs[0].url);
    currentHostname = urlObj.hostname;
  } else {
    addSiteBtn.disabled = true;
    addSiteBtn.textContent = 'Not a valid webpage';
  }

  // Initialize state
  chrome.storage.sync.get({ enabled: true, sites: [] }, (data) => {
    globalToggle.checked = data.enabled;
    updateStatus(data.enabled, data.sites);
    renderSites(data.sites);
  });

  // Toggle extension
  globalToggle.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    chrome.storage.sync.set({ enabled: isEnabled }, () => {
      chrome.storage.sync.get({ sites: [] }, (data) => {
        updateStatus(isEnabled, data.sites);
      });
    });
  });

  // Add site
  addSiteBtn.addEventListener('click', () => {
    if (!currentHostname) return;
    
    chrome.storage.sync.get({ sites: [] }, (data) => {
      if (!data.sites.includes(currentHostname)) {
        const newSites = [...data.sites, currentHostname];
        chrome.storage.sync.set({ sites: newSites }, () => {
          renderSites(newSites);
          updateStatus(globalToggle.checked, newSites);
          
          // Re-inject script if we just added it
          if (tabs.length > 0) {
            chrome.scripting.insertCSS({
              target: { tabId: tabs[0].id },
              css: '::highlight(clicklink-urls) { color: #2563eb !important; text-decoration: underline !important; cursor: pointer !important; }'
            }).catch(err => console.log('Error injecting CSS:', err));

            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ['content.js']
            }).catch(err => console.log('Error injecting:', err));
            chrome.action.setBadgeText({ text: 'ON', tabId: tabs[0].id });
            chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: tabs[0].id });
          }
        });
      }
    });
  });

  // Remove site
  siteList.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-btn')) {
      const siteToRemove = e.target.dataset.site;
      chrome.storage.sync.get({ sites: [] }, (data) => {
        const newSites = data.sites.filter(site => site !== siteToRemove);
        chrome.storage.sync.set({ sites: newSites }, () => {
          renderSites(newSites);
          updateStatus(globalToggle.checked, newSites);
          // If we remove the current site, remove badge
          if (siteToRemove === currentHostname && tabs.length > 0) {
            chrome.action.setBadgeText({ text: '', tabId: tabs[0].id });
          }
        });
      });
    }
  });

  function updateStatus(enabled, sites) {
    if (!enabled) {
      statusIndicator.className = 'status-indicator inactive';
      statusText.textContent = 'Extension is globally disabled';
      addSiteBtn.disabled = true;
      return;
    }
    
    if (currentHostname) {
      addSiteBtn.disabled = sites.includes(currentHostname);
      addSiteBtn.textContent = sites.includes(currentHostname) ? 'Site Added' : 'Add Current Site';
      
      if (sites.includes(currentHostname)) {
        statusIndicator.className = 'status-indicator active';
        statusText.textContent = 'Active on this site';
      } else {
        statusIndicator.className = 'status-indicator inactive';
        statusText.textContent = 'Inactive on this site';
      }
    }
  }

  function renderSites(sites) {
    siteList.innerHTML = '';
    if (sites.length === 0) {
      siteList.innerHTML = '<li class="site-item" style="color: var(--text-muted); justify-content: center;">No sites added yet</li>';
      return;
    }
    
    sites.forEach(site => {
      const li = document.createElement('li');
      li.className = 'site-item';
      
      const span = document.createElement('span');
      span.className = 'site-name';
      span.textContent = site;
      
      const btn = document.createElement('button');
      btn.className = 'remove-btn';
      btn.innerHTML = '&times;';
      btn.dataset.site = site;
      
      li.appendChild(span);
      li.appendChild(btn);
      siteList.appendChild(li);
    });
  }
});
