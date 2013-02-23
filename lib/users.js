module.exports = function (redis, config) {

  var config = config || {}
  , moment = require('moment')
  , util = require('util')
  , follower_retrieval = require('./follower_retrieval')(redis, config)
  , _ = require("underscore");


  function User(twitter_metadata) {
    if (twitter_metadata) {
      this.uid = twitter_metadata.id_str;
      this.name = twitter_metadata.name;
      this.avatar = twitter_metadata.profile_image_url;
      this.screen_name = twitter_metadata.screen_name;
      this.followers_count = twitter_metadata.followers_count;
      this.payload = JSON.stringify(twitter_metadata);
    }
  }

  User.prototype.setAccessToken = function (access_token, access_token_secret) {
    this.oauth_token = access_token,
    this.oauth_token_secret = access_token_secret
  };

  User.prototype.getTokenPair = function () {
    return {
      oauth_token: this.oauth_token,
      oauth_token_secret: this.oauth_token_secret
    };
  };

  User.prototype.store = function (cb) {
    var key = "users:" + this.screen_name;
    for (var p in this) {
      if (this.hasOwnProperty(p) && typeof(this[p]) !== 'function') {
        redis.hset(key, p, this[p]);
      }
    }

    if (this.uid && this.screen_name) {
      redis.set("ids:" + this.uid, this.screen_name, function () {
        cb && cb();
      });
    }
  };

  User.prototype.isFollowersRecent = function () {
    var cache_period = config.cache_period || 5
    return moment().subtract('minutes', cache_period) < moment(this.lastFollowersRetrieved)
  };


  User.prototype.getFollowersData = function (as_user, cb) {
    follower_retrieval.followerData(this, this, cb);
  };

  User.prototype.getFollowers = function(cb) {
    var self = this;

    function aux() {
      self.getFollowersData(self, cb);
    }

    if ((process.env.NODE_ENV == 'production') && self.isFollowersRecent()) {
      follower_retrieval.followerListFromRedis(self, aux);
    } else {
      follower_retrieval.followerListFromTwitter(self, self, aux);
    }
  };

  User.prototype.followerHistory = function followerHistory(cb) {
    follower_retrieval.getFollowerHistory(this, this, cb);
  }

  function getAll(cb) {
    var usernames;
    redis.keys("users:*", function (err, keys) {
      usernames = keys.map(function (key) { return key.replace("users:", "") });
      getUser(usernames, cb)
    });
  }

  function getUser() {
    var args = [].slice.call(arguments)
      , toSearch
      , users = []
      , first = args[0]
      , cb = args[args.length -1]
      , cb = cb || function(){};

    toSearch = _.isArray(first) ? first : args.slice(0, args.length -1)
    if (!toSearch.length) {
      return cb([]);
    }

    function getUsersFromRedis(key) {
      redis.hgetall('users:' + key, function(err, obj) {
        if (err) return console(err);
        user = _.extend(new User(), obj);
        users.push(user);
        if (users.length === toSearch.length) {
          //return the only object when there's only one
          users.length === 1 ? cb(users[0]) : cb(users)
        }
      });
    }

    toSearch.map(function (username) {
      if (Number(username)) {
        redis.get('ids:'+ username, function (err, obj) {
          if (err) return console(err);
          getUsersFromRedis(obj);
        });
      } else {
        getUsersFromRedis(username);
      }
    });
  }

  return {
    User: User,
    getUser: getUser,
    getAll: getAll
  };

}
