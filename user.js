var tc = require("./credentials").twitter;
twitter = require("twitter-js")(tc.key, tc.secret),
redis = require("redis").createClient(),
_ = require("underscore")._,
util = require("util");

module.exports = {


  getUsersByIds: function (ids, token) {
    var times = ids.length;
    var range;
    var accessToken = this.accessToken || token;

    for (var i = 0; i < times; i += 99) {
      range = ids.slice(i, i + 99);
      twitter.apiCall('GET', '/users/lookup', {screen_name: range, token: accessToken},  function (error, data) {
        //TODO: implement
      });
    }
  },

  /**
   * Creates a user object from twitter API data
   * @param {Object} twitter_metada
   * @return user
   */
  createUser: function createUser(twitter_metadata) {
    var that;

    /**
    * Store user info in a redis hash
    */
    function store() {
      var key = "users:" + that.screen_name;
      for (var p in that) {
        if (that.hasOwnProperty(p) && typeof(that[p]) !== 'function') {
          redis.hset(key, p, that[p]);
        }
      }
    }

    function setAccessToken(access_token, access_token_secret) {
      that.accessToken = {
        oauth_token: access_token,
        oauth_token_secret: access_token_secret
      };
    }

    function addDiff(type, diff) {
      var timeStamp = new Date().getTime();
      for (i in diff){
        redis.zadd('diff:' + that.screen_name, timeStamp, type + diff[i]);
      }
    }

    /**
    * Adds or updates all the elements in ids to a redis set with key "key"
    * @param {String} key
    * @param {Array} ids
    */
    function writeSet(key, ids) {
      for (i in ids){
        redis.sadd(key, ids[i]);
      }
    }

    function storeFollowers(followers) {
      var key = "followers:" + that.screen_name;
      var dodiff = false;
      writeSet(key, ids);
      redis.exists('old' + key, function (error, value) {
        if (!error && value === 1) {
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

        } else {

          //This means it's the first time we store this guy's followers
        }

        redis.rename(key, "old" + key);

      });
    };


    function getFollowers() {
      var followers;
      var id_groups = [];

      function askForFollowers(cursor) {
        var nextBatch;
        cursor = cursor || -1;
        twitter.apiCall('GET', '/followers/ids.json', {cursor: cursor, screen_name: that.screen_name, token: that.accessToken},  function (error, data){
          if (error)
            console.log(util.inspect(error));
          if (data) {
            id_groups.push(data.ids);
            if (data.next_cursor !== 0){
              askForFollowers(data.next_cursor);
            }else{
              storeFollowers(_(id_groups).flatten());
            }
          }
        });
      }

      if (that.accessToken) {
        askForFollowers();
      }
    }

    that = {
      uid: twitter_metadata.id_str,
      name: twitter_metadata.name,
      screen_name: twitter_metadata.screen_name,
      followers_count: twitter_metadata.followers_count,
      payload: JSON.stringify(twitter_metadata),
      setAccessToken: setAccessToken,
      getFollowers: getFollowers,
      getUsersByIds: this.getUsersByIds;
      store: store
    };

    return that;
  },


  /**
  * Retrieves a user from redis
  * @param {String} screen_name
  * @param {Function} callback
  */
  retrieveUser: function (screen_name, callback) {
    var that = this;
    redis.hgetall("users:" + screen_name, function (error, value) {
      if (!error && value) {
        callback(that.createUser(value));
      }
    });
  }

};
