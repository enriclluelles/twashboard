module.exports = function (redis, config) {

  var moment = require('moment')
  , util = require('util')
  , stalking = require('./stalking')(redis, config)
  , twitter = require('./twitter')(config)
  , _ = require("underscore");

  function User(twitter_metadata) {
    if (twitter_metadata) {
      this.uid = twitter_metadata.id_str;
      this.name = twitter_metadata.name;
      this.avatar = twitter_metadata.profile_image_url;
      this.screen_name = twitter_metadata.screen_name;
      this.followers_count = twitter_metadata.followers_count;
      if (twitter_metadata.lastFollowersRetrieved) {
        this.lastFollowersRetrieved = moment(twitter_metadata.lastFollowersRetrieved);
      }
      this.payload = JSON.stringify(twitter_metadata);
    }
  }


  var follower_retrieval = require('./follower_retrieval')(redis, config, User);


  User.prototype.setAccessToken = function (access_token, access_token_secret) {
    this.oauth_token = access_token;
    this.oauth_token_secret = access_token_secret;
  };

  User.prototype.getTokenPair = function () {
    return {
      oauth_token: this.oauth_token,
      oauth_token_secret: this.oauth_token_secret
    };
  };

  User.prototype.store = function (cb) {
    var key = "users:" + this.uid;
    var self = this;
    for (var p in this) {
      if (this.hasOwnProperty(p) && typeof(this[p]) !== 'function') {
        redis.hset(key, p, this[p]);
      }
    }

    if (self.uid && self.screen_name) {

      redis.set("ids:" + self.screen_name, self.uid, function () {
        redis.set("usernames:" + self.uid, self.screen_name, function() {
          cb && cb();
        });
      });
    }
  };

  User.prototype.areFollowersRecent = function () {
    var cache_period = config.cache_period || 5;
    if (!this.lastFollowersRetrieved) {return false;}
    return moment().subtract('minutes', cache_period) < moment(this.lastFollowersRetrieved);
  };


  User.prototype.getFollowers = function getFollowers(cb) {
    var self = this;

    if ((process.env.NODE_ENV == 'production') && self.areFollowersRecent()) {
      follower_retrieval.followerListFromRedis(self.uid, cb);
    } else {
      follower_retrieval.followerListFromTwitter(self, self, cb);
    }
  };

  User.prototype.followerHistory = function followerHistory(cb) {
    follower_retrieval.getFollowerHistory(this.uid, this, cb);
  };

  User.prototype.stalk = function stalk(who, cb) {
    var self = this;
    twitter.lookupUsers([who], this.getTokenPair(), function (users) {
      users.forEach(function (p) {
        var u = new User(p);
        u.store(function () {
          follower_retrieval.followerListFromTwitter(self, u, function () {
            stalking.startStalking(self, u.uid);
          });
        });
      });
      cb && cb();
    }, true);
  };

  function getAll(cb) {
    var ids;
    redis.keys("users:*", function (err, keys) {
      ids = keys.map(function (key) { return key.replace("users:", ""); });
      getUser(ids, cb);
    });
  }

  function getUser() {
    var args = [].slice.call(arguments)
      , toSearch
      , users = []
      , first = args[0]
      , cb = args[args.length -1] || function(){};

    toSearch = _.isArray(first) ? first : args.slice(0, args.length -1);
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
          users.length === 1 ? cb(users[0]) : cb(users);
        }
      });
    }

    toSearch.map(function (uid) {
      if (Number(uid)) {
        getUsersFromRedis(uid);
      } else {
        //It's the screen_name
        redis.get('ids:'+ uid, function (err, obj) {
          if (err) return console(err);
          getUsersFromRedis(obj);
        });
      }
    });
  }

  return {
    User: User,
    getUser: getUser,
    getAll: getAll
  };

};
