(() => {
  if (window.__clickLinkInjected) return;
  window.__clickLinkInjected = true; // Prevents double injection, isolated world prevents detection

  // Robust URL regex that allows query params (?) but ignores trailing punctuation
  const URL_REGEX = /https?:\/\/[^\s<>"']*[^\s<>"'.,;:!?()\[\]{}]/g;

  function isInsideExcludedElement(node) {
    let current = node;
    while (current && current !== document.body) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const tagName = current.tagName.toLowerCase();
        if (['a', 'script', 'style', 'noscript', 'input', 'textarea', 'select', 'code', 'pre'].includes(tagName)) {
          return true;
        }
        if (current.isContentEditable) {
          return true;
        }
      }
      current = current.parentNode;
    }
    return false;
  }

  function getUrlAtOffset(text, offset) {
    URL_REGEX.lastIndex = 0;
    let match;
    while ((match = URL_REGEX.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (offset >= start && offset <= end) {
        return match[0];
      }
    }
    return null;
  }

  function getUrlFromPoint(x, y) {
    let range;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    } else if (document.caretPositionFromPoint) { // Firefox support if needed later
      const pos = document.caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }

    if (!range) return null;

    const textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE) return null;
    if (isInsideExcludedElement(textNode)) return null;

    const text = textNode.textContent;
    const offset = range.startOffset;

    return getUrlAtOffset(text, offset);
  }

  // --- CSS HIGHLIGHTS API (Stealth text coloring) ---
  // Using the CSS Custom Highlight API allows us to color text without wrapping
  // it in HTML elements (like <span> or <a>), avoiding MutationObserver detection.
  const urlHighlight = new Highlight();
  CSS.highlights.set('clicklink-urls', urlHighlight);

  function scanAndHighlight(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (isInsideExcludedElement(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let node;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue;
      URL_REGEX.lastIndex = 0;
      let match;
      while ((match = URL_REGEX.exec(text)) !== null) {
        try {
          const range = new Range();
          range.setStart(node, match.index);
          range.setEnd(node, match.index + match[0].length);
          urlHighlight.add(range);
        } catch (e) {
          // Ignore range errors
        }
      }
    }
  }

  // Initial scan
  scanAndHighlight(document.body);

  // Watch for dynamically added content
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          scanAndHighlight(node);
        } else if (node.nodeType === Node.TEXT_NODE) {
          if (node.parentNode) scanAndHighlight(node.parentNode);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Throttle mousemove for performance
  let ticking = false;
  let lastX = 0, lastY = 0;
  let currentTarget = null;
  let originalCursor = '';

  function handleMouseMove() {
    const url = getUrlFromPoint(lastX, lastY);
    if (url) {
      const elem = document.elementFromPoint(lastX, lastY);
      if (elem && currentTarget !== elem) {
        if (currentTarget) {
          currentTarget.style.cursor = originalCursor;
        }
        currentTarget = elem;
        originalCursor = elem.style.cursor;
        elem.style.cursor = 'pointer';
      }
    } else {
      if (currentTarget) {
        currentTarget.style.cursor = originalCursor;
        currentTarget = null;
      }
    }
    ticking = false;
  }

  document.addEventListener('mousemove', (e) => {
    lastX = e.clientX;
    lastY = e.clientY;
    if (!ticking) {
      window.requestAnimationFrame(handleMouseMove);
      ticking = true;
    }
  }, true); // capture phase

  document.addEventListener('click', (e) => {
    // Only intercept left clicks
    if (e.button !== 0) return;

    const url = getUrlFromPoint(e.clientX, e.clientY);
    if (url) {
      e.preventDefault();
      e.stopPropagation();
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, true); // capture phase
})();
