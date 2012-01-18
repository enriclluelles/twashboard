var tc = require("../conf/credentials").twitter
    , util = require("util")
    , _ = require('underscore')
    , twitter = require("twitter-js")(tc.key, tc.secret);

module.exports = {
  lookupUsers: function (userIds, tokenPair, cb) {
    var results = [];

    function askForUsersInfo(index) {
      index = index || 0;
      var range =  userIds.slice(index, index + 99);
      twitter.apiCall('GET', '/users/lookup.json', {
        user_id: range.join(','), 
        token: tokenPair
      },  function (error, data) {
        console.log('fetch');
        if (error) {
          console.log('fetch_error: ' + util.inspect(error));
        }
        results = results.concat(data);
        if (results.length === userIds.length) {
          cb(results);
        } else {
          askForUsersInfo(index + 100);
        }
      });
    }

    askForUsersInfo(); //initial call
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
