var tc = require("./credentials").twitter,
twitter = require("twitter-js")(tc.key, tc.secret),
redis = require("redis").createClient(),
events = require("events")
_ = require("underscore"),
util = require("util");

GLOBAL = {};
GLOBAL._ = _;

function addDiff(key, type, diff) {
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

function followers(screen_name) {
  followerIds(screen_name, function (values) {
    values.forEach(function(value, index) {

    });
  });
}

function storeFollowers(ids, screen_name) {
  var key = "followers:" + screen_name;
  var dodiff = false;
  writeSet(key, ids);
  redis.exists('old' + key, function (error, value) {
    if (!error && value === 1) {
      writeSet(key, ids);

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

    } else {
      //This means it's the first time we store this guy's followers
    }

    redis.rename(key, "old" + key);

  });
}

function writeSet(key, ids) {
  console.log(ids);
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

User.prototype.followerIds = function () {
  var that = this;
  followerIds(this.screen_name, function(values){
    var ff = new FollowerFetcher();
    ff.fetch(values, that.getTokenPair());
  })
}

User.prototype.getFollowers = function() {
  var that = this;
  console.log("getting followers...")
  var followers;
  var id_groups = [];

  //recursively ask for followers
  function askForFollowers(cursor) {
    var nextBatch;
    cursor = cursor || -1;
    twitter.apiCall('GET', '/followers/ids.json', {cursor: cursor, screen_name: that.screen_name, token: that.getTokenPair()},  function (error, d){
      console.log(that.getTokenPair());
      if (error)
        console.log(util.inspect(error));
      if (d) {
        id_groups.push(d['ids']);
        if (d.next_cursor !== 0){
          console.log("asking for more");
          askForFollowers(d.next_cursor);
        }else{
          console.log("storing");
          storeFollowers(_(id_groups).flatten(), that.screen_name);
        }
      }
    });
  }

  if (that.getTokenPair()) {
    askForFollowers();
  }
}

function lookUpUsers(ids, token) {

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

function FollowerFetcher() {
  this.fetch = function (ids, token) {
    var times = ids.length;
    var range;
    var accessToken = this.accessToken || token;
    var that = this;

    for (var i = 0; i < times; i += 99) {
      range = ids.slice(i, i + 99);
      twitter.apiCall('GET', '/users/lookup.json', {user_id: range.join(','), token: accessToken},  function (error, data) {
        console.log('fetch');
        if (error)
          console.log('fetch_error: ' + util.inspect(error));
        that.emit('batchdone', data);
      });
    }

    this.on('batchdone', function(data) {console.log('batchdone: ' + data.length)});
  }
}

FollowerFetcher.prototype = new events.EventEmitter()

module.exports = {
  User: User,
  getUser: getUser,
  lookUpUsers: lookUpUsers
};
