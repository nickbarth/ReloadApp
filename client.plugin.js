(function () {
  if (window.WebSocket === undefined) {
    return alert('Watch App requires a browser with WebSockets.');
  }

  var currentPageId = null;
      watchedPages = {},
      userId = {},
      ws = null;

  function createSocket () {
    ws = new WebSocket('ws://special.io:9000');

    ws.onmessage = function (evt) {
      var data = evt.data.split("|");
      command = data.shift();

      if (command === 'UUID') {
        userId = data.shift();
      } else if (command === 'R') {
        tabId = data.shift();
        chrome.tabs.reload(parseInt(tabId, 10));
        console.log("Reloading tab "+tabId+".");
      }
    }

    ws.onclose = function (evt) {
      // Try to reconnect on close
      ws = null;
      console.log("Disconnected.");
      setTimeout(function () {
        console.log("Trying to reconnect...");
        createSocket();
      }, 2000);
    }

    ws.onopen = function () {
      // Issue Reconnect
      connected = true;
      console.log("Connected.");
      if (Object.keys(watchedPages).length !== 0) {
        Object.keys(watchedPages).forEach(function (tabId) {
          ws.send('WP|'+tabId+'|'+watchedPages[tabId]);
          console.log('WP|'+tabId+'|'+watchedPages[tabId]);
        });
      }
    }
  }

  createSocket();

  iconActions = {
    turnIconOn: function () {
      chrome.browserAction.setIcon({
        "path": "icons/alt/icon48.png",
      });
    },
    turnIconOff: function () {
      chrome.browserAction.setIcon({
        "path": "icons/icon48.png",
      });
    }
  }

  chrome.tabs.onActivated.addListener(function (activateInfo) {
    currentPageId = activateInfo.tabId;
    if (typeof watchedPages[currentPageId] !== 'undefined') {
      iconActions.turnIconOn()
    } else {
      iconActions.turnIconOff()
    }
  });

  chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    if (typeof watchedPages[tabId] !== 'undefined') {
      console.log("No longer watching page "+tabId+" ("+watchedPages[tabId]+")");
      ws.send('SWP|'+tabId+'|'+watchedPages[tabId]);
      console.log('SWP|'+tabId+'|'+watchedPages[tabId]);
      delete watchedPages[tabId];
    }
  });

  chrome.browserAction.onClicked.addListener(function(tab) {
    if (!watchedPages[currentPageId]) {
      // Turn Watch Page On
      iconActions.turnIconOn()
      chrome.tabs.getSelected(null, function(tab) {
        console.log("Now watching page "+tab.id+" ("+tab.url+")");
        watchedPages[tab.id] = tab.url;
        ws.send('WP|'+tab.id+'|'+tab.url);
        console.log('WP|'+tab.id+'|'+tab.url);
      });
      watchPage = true;
    } else {
      // Turn Watch Page Off
      iconActions.turnIconOff()
      chrome.tabs.getSelected(null, function(tab) {
        console.log("No longer watching page "+tab.id+" ("+tab.url+")");
        ws.send('SWP|'+tab.id+'|'+tab.url);
        console.log('SWP|'+tab.id+'|'+tab.url);
        delete watchedPages[tab.id];
      });
    }
  });
})();
