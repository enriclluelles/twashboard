module.exports = function(conf) {

  var tc = conf.twitter
      , util = require("util")
      , _ = require('underscore')
      , Twit = require("twit");

  function getClient(app_credentials, user_credentials) {
    return new Twit({
      consumer_key: tc.key,
      consumer_secret: tc.secret,
      access_token: user_credentials.oauth_token,
      access_token_secret: user_credentials.oauth_token_secret
    });
  };

  return {
    lookupUsers: function (userIds, tokenPair, cb) {


      var results = [];
      var tclient = getClient(tc, tokenPair);

      function askForUsersInfo(index) {
        var range =  userIds.slice(index, index + 99);

        if (index > userIds.length) return cb(results);

        tclient.get('users/lookup', {
          user_id: range.join(','),
          token: tokenPair
        },  function (error, data) {

          if (error) {
            if (error.statusCode === 404) {
              results = results.concat(new Array(range.length));
            } else {
              return console.log('fetch_error: ' + util.inspect(error));
            }
          }
          results = results.concat(data);
          askForUsersInfo(index + 100);
        });
      }

      askForUsersInfo(0); //initial call
    },

    getFollowers: function (screenName, tokenPair, cb) {
      var followerIds = [];

      var tclient = getClient(tc, tokenPair);
      // Gets called with different cursors until we get all the followers
      function askForFollowers(cursor) {

        if (cursor === 0) return cb(followerIds);

        tclient.get('followers/ids', {
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
