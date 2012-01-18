var redis = require("redis").createClient()
  , twitter = require('./twitter')
  , _ = require("underscore");

GLOBAL = {};
GLOBAL._ = _;

function addDiff(type, diff, key) {
  var timeStamp = new Date().getTime();
  for (i in diff){
    redis.zadd('diff:' + key, timeStamp, type + diff[i]);
  }
}

function followerIds(screen_name, cb) {
  var key = 'oldfollowers:' + screen_name;
  redis.exists(key, function (error, value) {
    if (!error) {
      redis.smembers(key, function (error, values) {
        cb(values);
      });
    }
  });
}

function storeFollowers(ids, screen_name) {
  var key = "followers:" + screen_name;
  var dodiff = false;
  writeSet(key, ids);
  redis.exists('old' + key, function (error, value) {
    if (!error && value === 1) {
      writeSet(key, ids);

      //If we already got this guy's followers we do the diffs with redis
      redis.sdiff(key, "old" + key, function (error, values) {
        if (!error && values.length > 0){
          addDiff('+', values, screen_name);
        }
      });

      redis.sdiff("old" + key, key, function (error, values) {
        if (!error && values.length > 0){
          addDiff('-', values, screen_name);
        }
      });
    }

    redis.rename(key, "old" + key); //we rename it to oldfollowers
  });
}

//Utility function
function writeSet(key, ids) {
  for (i in ids){
    redis.sadd(key, ids[i]);
  }
}

function User(twitter_metadata) {
  if (twitter_metadata) {
    this.uid = twitter_metadata.id_str;
    this.name = twitter_metadata.name;
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
}

User.prototype.store = function () {
  var key = "users:" + this.screen_name;
  for (var p in this) {
    if (this.hasOwnProperty(p) && typeof(this[p]) !== 'function') {
      redis.hset(key, p, this[p]);
    }
  }
  if (this.uid && this.screen_name) {
    redis.set("ids:" + this.uid, this.screen_name);
  }
};

User.prototype.followersData = function () {
  var that = this;
  var ff = new twitter.FollowerFetcher();
  var u;
  followerIds(this.screen_name, function(values){
    ff.fetch(values, that.getTokenPair());
  })
  ff.on('done', function (followers) {
    followers.forEach(function(f) {
      u = new User(f);
      u.store();
    });
  });
}

User.prototype.getFollowers = function() {
  twitter.getFollowers(this.screen_name, this.getTokenPair(), function (followers) {
    storeFollowers(followers, this.screen_name);
  });
}

function getUser(username, cb) {
  var user;
  redis.hgetall('users:' + username, function(err,obj) {
    if (err) {
      console.log(err);
    } else {
      user = GLOBAL._.extend(new User(), obj);
      cb(user);
    }
  });
}

module.exports = {
  User: User,
  getUser: getUser
};
