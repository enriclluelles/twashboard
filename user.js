var tc = require("./credentials").twitter;
twitter = require("twitter-js")(tc.key, tc.secret),
redis = require("redis").createClient(),
_ = require("underscore")._,
util = require("util");

module.exports = User;

User = {

  retrieveUser: function(id) {

  }

  createUser: function(twitter_metadata) {
    var that;

    function setAccessToken (access_token, access_token_secret) {
      that.accessToken = {
        oauth_token: access_token,
        oauth_token_secret: access_token_secret
      };
    };

    function addDiff(type, diff) {
      var timeStamp = new Date().getTime();
      for (i in diff){
        redis.zadd('diff:' + that.screen_name, timeStamp, type + diff[i]);
      }
    }

    function writeSet(key, ids) {
      for (i in ids){
        redis.sadd(key, ids[i]);
      }
    }

    function getFollowers() {
      var followers;
      var id_groups = [];

      function storeFollowers() {
        var ids = _(id_groups).flatten();
        var key = "followers:" + that.screen_name;
        var dodiff = false;
        redis.exists(key, function (error, value) {
          if (!error && value === 1) {
            redis.renamenx(key, "old" + key);
            writeSet(key, ids);
            redis.sdiff(key, "old" + key, function (error, values) {
              if (!error && values.length > 0){
                addDiff('+', values);
              }
            });
            redis.sdiff("old" + key, key, function (error, values) {
              if (!error && values.length > 0){
                addDiff('-', values);
              }
            });
            redis.del("old" + key);
          }
        });
        writeSet(key, ids);
      }

      function askForFollowers(cursor) {
        var nextBatch;
        cursor = cursor || -1;
        twitter.apiCall('GET', '/followers/ids.json', {cursor: cursor, screen_name: that.screen_name, token: that.accessToken},  function (error, data){
          if (error)
            console.log(util.inspect(error));
          id_groups.push(data.ids);
          if (data.next_cursor !== 0){
            askForFollowers(data.next_cursor);
          }else{
            storeFollowers();
          }
        });
      }

      if (that.accessToken) {
        askForFollowers();
      }
    };

    that = {
      name: twitter_metadata.name,
      screen_name: twitter_metadata.screen_name,
      followers_count: twitter_metadata.followers_count,
      payload: JSON.stringify(twitter_metadata),
      setAccessToken: setAccessToken,
      getFollowers: getFollowers
    }

    return that;
  }
}
