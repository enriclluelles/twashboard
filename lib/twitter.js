module.exports = function(conf) {

  var tc = conf.twitter
      , util = require("util")
      , _ = require('underscore')
      , twitter = require("twitter-js")(tc.key, tc.secret);

  return {
    lookupUsers: function (userIds, tokenPair, cb) {
      var results = [];

      function askForUsersInfo(index) {
        var range =  userIds.slice(index, index + 99);

        if (results.length === userIds.length) return cb(results);

        twitter.apiCall('GET', '/users/lookup.json', {
          user_id: range.join(','),
          token: tokenPair
        },  function (error, data) {

          if (error) return console.log('fetch_error: ' + util.inspect(error));

          results = results.concat(data);
          askForUsersInfo(index + 100);

        });
      }

      askForUsersInfo(0); //initial call
    },

    getFollowers: function (screenName, tokenPair, cb) {
      var followerIds = [];

      // Gets called with different cursors until we get all the followers
      function askForFollowers(cursor) {

        if (cursor === 0) return cb(followerIds);

        twitter.apiCall('GET', '/followers/ids.json', {
          cursor: cursor,
          screenName: screenName,
          token: tokenPair
        },  function (error, d){

          if (error) return console.log(util.inspect(error));

          followerIds = followerIds.concat(d.ids);
          askForFollowers(d.next_cursor);

        });
      }

      askForFollowers(-1); //initial call
    }
  };
}
