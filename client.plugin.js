(function ($) {
  if (window.WebSocket === undefined) {
    return alert('Watch App requires a browser with WebSockets.');
  }

  var currentPageId = null;
      watchedPages = {},
      userId = {},
      ws = new WebSocket('ws://special.io:9000');

  ws.onmessage = function (evt) {
    var data = evt.data.split("|");
    command = data.shift();

    if (command === 'UUID') {
      userId = data.shift();
    } else if (command === 'R') {
      tabId = data.shift();
      chrome.tabs.reload(parseInt(tabId, 10));
    }
  };

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
    if (watchedPages[currentPageId]) {
      iconActions.turnIconOn()
    } else {
      iconActions.turnIconOff()
    }
  });

  chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    delete watchedPages[tabId];
    // Also Delete From Server Watch
  });

  chrome.browserAction.onClicked.addListener(function(tab) {
    if (!watchedPages[currentPageId]) {
      // Turn Watch Page On
      iconActions.turnIconOn()
      chrome.tabs.getSelected(null, function(tab) {
        console.log("Now watching page "+tab.id+" ("+tab.url+")");
        watchedPages[tab.id] = true;
        ws.send('WP|'+tab.id+'|'+tab.url);
      });
      watchPage = true;
    } else {
      // Turn Watch Page Off
      iconActions.turnIconOff()
      chrome.tabs.getSelected(null, function(tab) {
        console.log("No longer watching page "+tab.id+" ("+tab.url+")");
        watchedPages[tab.id] = false;
        ws.send('SWP|'+tab.id+'|'+tab.url);
      });
    }
  });
})(jQuery);

/*
function WebSocketTest()
{
  if ("WebSocket" in window)
  {
     alert("WebSocket is supported by your Browser!");
     // Let us open a web socket
     var ws = new WebSocket("ws://localhost:9998/echo");
     ws.onopen = function()
     {
        // Web Socket is connected, send data using send()
        ws.send("Message to send");
        alert("Message is sent...");
     };
     ws.onmessage = function (evt) 
     { 
        var received_msg = evt.data;
        alert("Message is received...");
     };
     ws.onclose = function()
     { 
        // websocket is closed.
        alert("Connection is closed..."); 
     };
  }
  else
  {
     // The browser doesn't support WebSocket
     alert("WebSocket NOT supported by your Browser!");
  }
}
*/
