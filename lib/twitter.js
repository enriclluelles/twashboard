var EventEmitter = require('events').EventEmitter
    , tc = require("../conf/credentials").twitter
    , util = require("util")
    , _ = require('underscore')
    , twitter = require("twitter-js")(tc.key, tc.secret);

module.exports = {
  FollowerFetcher: function () {
    this = new EventEmitter;
    this.fetch = function (ids, token) {
      var times = ids.length;
      var range;
      var accessToken = this.accessToken || token;
      var that = this;
      var results = [];

      for (var i = 0; i < times; i += 99) {
        range = ids.slice(i, i + 99);
        twitter.apiCall('GET', '/users/lookup.json', {user_id: range.join(','), token: accessToken},  function (error, data) {
          console.log('fetch');
          if (error)
            console.log('fetch_error: ' + util.inspect(error));
          that.emit('batchdone', data);
        });
      }

      this.on('batchdone', function(data) {
        results = results.concat(data);
        if (results.length === times) {
          that.emit('done', results);
        }
      });
    }
  },

  getFollowers: function (screenName, tokenPair, cb) {
    // Gets called with different cursors until we get all the followers
    var id_groups = [];
    function askForFollowers(cursor) {
      cursor = cursor || -1;
      twitter.apiCall('GET', '/followers/ids.json', {
        cursor: cursor,
        screenName: screenName,
        token: tokenPair
      },  function (error, d){
        if (error)
          console.log(util.inspect(error));
        if (d) {
          id_groups.push(d['ids']);
          if (d.next_cursor !== 0){
            console.log("asking for more");
            askForFollowers(d.next_cursor);
          }else{
            cb(_(id_groups).flatten());
          }
        }
      });
    }

    askForFollowers(); //initial call
  }
}
