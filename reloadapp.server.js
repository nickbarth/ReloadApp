var request = require('request'),
// On Disconnect Delete All that Users Urls
  Server = new require('ws').Server,
  uuid = require('node-uuid'),
  wsServer = new Server({port: 9000}),
  Users = {},
  Pages = [];

function WatchPage (url, modifiedDate) {
  this.url = url;
  this.watchers = {};
  this.lastModified = modifiedDate;
}

WatchPage.findPageByUrl = function (url) {
  var found = null;
  Pages.forEach(function (page) {
    if (page.url === url) {
      found = page;
    }
  });
  return found;
}

WatchPage.watchPage = function (userId, tabId, url) {
  var page = WatchPage.findPageByUrl(url);
  console.log("Now watching page "+tabId+" ("+url+")");

  if (page === null) {
    page = new WatchPage(url, null);
    page.updateModified(function () {
      page.addWatcher(userId, tabId);
    });
  } else {
    // Needed to not refresh on first page load.
    page.addWatcher(userId, tabId);
  }

  Pages.push(page);
}

WatchPage.unwatchPage = function (userId, tabId, url) {
  var page = WatchPage.findPageByUrl(url);
  console.log("No longer watching page "+tabId+" ("+url+") for user "+userId+".");
  page.removeWatcher(userId, tabId);
}

WatchPage.removeWatcherFromAll = function (userId) {
  for (var n = Pages.length - 1; n >= 0; n--) {
    var page = Pages[n];
    delete page.watchers[userId];
    if (!page.hasWatchers()) {
      page.remove();
    }
  }
  console.log('User disconnected ('+userId+').');
}

WatchPage.prototype.hasWatchers = function () {
  return Object.keys(this.watchers).length > 0;
}

WatchPage.prototype.remove = function () {
  for (var n = Pages.length - 1; n >= 0; n--) {
    var page = Pages[n];
    if (this.url === page.url) {
      Pages.splice(n, 1);
    }
  }
}

WatchPage.prototype.addWatcher = function (userId, tabId) {
  if (typeof this.watchers[userId] === 'undefined') {
    this.watchers[userId] = [tabId];
  } else {
    this.watchers[userId].push(tabId);
  }
}

WatchPage.prototype.removeWatcher = function (userId, tabId) {
  this.watchers[userId].splice(this.watchers[userId].indexOf(tabId), 1);
  if (!this.watchers[userId].length) {
    delete this.watchers[userId];
    if (!this.hasWatchers()) {
      this.remove();
    }
  }
}

WatchPage.prototype.setLastModified = function (modifiedDate) {
  this.lastModified = modifiedDate;
}

WatchPage.prototype.getModifiedDate = function (callback) {
  request.head(this.url, function (err, response, body) {
    console.log("Now checking "+this.url+"...");

    if (err || response.statusCode != 200) {
      callback(err, null);
    }

    callback(null, response['headers']['last-modified']);
  }.bind(this));
}

WatchPage.prototype.updateModified = function (callback) {
  this.getModifiedDate(function (err, modifiedDate) {
    console.log("Last Modified "+modifiedDate+".");

    if (this.lastModified !== modifiedDate) {
      this.lastModified = modifiedDate;
      callback(null, true);
    } else {
      callback(null, false);
    }
  }.bind(this));
}

WatchPage.prototype.updateUsers = function () {
  Object.keys(this.watchers).forEach(function (userId) {
    this.watchers[userId].forEach(function (tabId) {
      Users[userId].send('R|'+tabId);
    });
  }.bind(this));
}

wsServer.on('connection', function (ws) {
  // Give User New Id
  userId = uuid.v1();
  Users[userId] = ws;
  Users[userId].send('UUID|'+userId);

  console.log('User connected ('+userId+').');

  // Watch for User Commands
  ws.on('message', function (data) {
    data = data.split('|');
    command = data.shift();
    tabId = data.shift();
    url = data.shift();

    if (command === 'WP') {
      WatchPage.watchPage(userId, tabId, url);
    } else if (command === 'SWP') {
      WatchPage.unwatchPage(userId, tabId, url);
    }
  });

  // Remove use on disconnect
  ws.on('close', function () {
    WatchPage.removeWatcherFromAll(userId);
  });
});

function updatePages () {
  // Update to ASync
  Pages.forEach(function (page) {
    page.updateModified(function (err, wasModified) {
      if (wasModified) {
        console.log("Page "+tabId+" ("+url+") was modified.");
        page.updateUsers();
      }
    });
  });

  setTimeout(updatePages, 1000);
}

updatePages();
