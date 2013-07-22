var request = require('request'),
  Server = new require('ws').Server,
  uuid = require('node-uuid'),
  wsServer = new Server({port: 9000}),
  users = {},
  pages = [];

function WatchPage (url, modifiedDate) {
  this.url = url;
  this.users = {};
  this.lastModified = modifiedDate;
}

WatchPage.findPageByUrl = function (url) {
  pages.forEach(function (page) {
    if (page.url === url) {
      return page;
    }
  });
  return null;
}

WatchPage.prototype.addUser = function (userId, tabId) {
  this.users[userId] = tabId;
}

WatchPage.prototype.removeUser = function (userId) {
  delete this.users[userId];
}

watchPage.prototype.setLastModified = function (modifiedDate) {
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
  Object.keys(this.users).forEach(function (userId) {
    users[userId].send('R|'+this.users[userId]);
  }.bind(this));
}

function updatePages () {
  // Change to ASync or something
  console.log('Page Watcher Running'+JSON.stringify(pages));
  pages.forEach(function (page) {
    page.updateModified(function (err, wasModified) {
      if (wasModified) {
        console.log("Page "+tabId+" ("+url+") was modified.");
        page.updateUsers();
      }
    });
  });

  setTimeout(updatePages, 1000);
}

function watchPage (userId, tabId, url) {
  var page = WatchPage.findPageByUrl(url);
  console.log("Now watching page "+tabId+" ("+url+")");

  if (page === null) {
    page = new WatchPage(url, null);
    page.updateModified(function () {
      page.addUser(userId, tabId);
    });
  } else {
    page.addUser(userId, tabId);
  }

  pages.push(page);
}

function unwatchPage (userId, tabId, url) {
  var page = WatchPage.findPageByUrl(url);
  console.log("No longer watching page "+tabId+" ("+url+") for user "+userId+".");

  page.removeUser(userId);
}

wsServer.on('connection', function (ws) {
  console.log('User connected.');

  // Give User New Id
  userId = uuid.v1();
  users[userId] = ws;
  users[userId].send('UUID|'+userId);

  // Watch for User Commands
  ws.on('message', function (data) {
    data = data.split('|');
    command = data.shift();
    tabId = data.shift();
    url = data.shift();

    if (command === 'WP') {
      watchPage(userId, tabId, url);
    } else if (command === 'SWP') {
      unwatchPage(userId, tabId, url);
    }
  });
});

updatePages();

// On Disconnect Delete All that Users Urls
// Fix for one user multiple tabs with same url
// Automatic Reconnect that sends all currently watched tabs
