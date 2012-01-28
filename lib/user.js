var redisUrl = require('url').parse(process.env.REDISTOGO_URL || 'redis://localhost:6379/')
  , redisPass = redisUrl.auth && redisUrl.auth.split(':')[1]
  , redis = require("redis").createClient(redisUrl.port, redisUrl.hostname)
  , twitter = require('./twitter')
  , moment = require('moment')
  , util = require('util')
  , _ = require("underscore");

if (redisPass) {
  redis.auth(redisPass);
  redis.on('connected', function () {
    redis.auth(redisPass);
  });

  redis.on('reconnected', function () {
    redis.auth(redisPass);
  });

  redis.on('error', function (e) {
    console.log(util.inspect(e));
  });
}


/*
 * Add a diff to a redis sorted set.`type` can be '+' or '-'
 * and `key` should be the user's screen name
 *
 * @param {String} type
 * @param {Array} diff
 * @param {String} key
 */
function addDiff(type, diff, key) {
  var timestamp = new Date().getTime();
  for (i in diff){
    redis.zadd('diff:' + key, timestamp, type + diff[i]);
  }
}


/*
 * Retrieve the user followers from redis
 *
 * @param {String} screen_name
 * @param {Function} cb
 */
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


/*
 * Store a list of followers to redis and make
 * diffs if we had a previous version of the list
 *
 * @param {Array} ids
 * @param {String} screen_name
 */
function storeFollowers(ids, screen_name) {
  var key = "followers:" + screen_name;
  var dodiff = false;
  writeSet(key, ids, function () {

    redis.exists('old' + key, function (error, value) {
      if (!error && value === 1) {

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
  } );
}

//Utility function
function writeSet(key, ids, cb) {
  var counter = 0;
  function aux () {
    counter++;
    (counter == ids.length) && cb()
  }

  for (i in ids){
    redis.sadd(key, ids[i], aux);
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

User.prototype.followersRecent = function () {
  return moment().subtract('days', 1) < moment(this.lastFollowersRetrieved)
};

User.prototype.followersDataRecent = function () {
  return moment().subtract('days', 1) < moment(this.lastFollowersDataRetrieved)
};


User.prototype.getFollowersData = function (cb) {
  var self = this;
  if ((process.env.NODE_ENV == 'production') && self.followersDataRecent()) {
    console.log('recent followers');
    return self.storedFollowersData(cb);
  }
  self.retrieveFollowersData(cb);
};

/*
 * Gets follower data with user's credentials, stores it
 * and executes the callback `cb`
 *
 * @param {Function} cb
 */
User.prototype.retrieveFollowersData = function (cb) {
  var self = this;
  followerIds(this.screen_name, function(values){
    twitter.lookupUsers(values, self.getTokenPair(), function (followers) {
      var users = _.map(followers, function(f) {
        var u;
        u = new User(f);
        u.store();
        return u;
      });

      self.lastFollowersDataRetrieved = moment();
      self.store();

      cb && cb(users);
    });
  });
};

User.prototype.storedFollowersData = function (cb) {
  var self = this;

  followerIds(this.screen_name, function(values){
    var total = [];
    var users;

    function aux (value) {
      total.push(value);
      if (total.length == values.length) {
        cb(total);
      }
    }

    users = values.map(function (e) {
      getUser(e, aux);
    });
  });
};

User.prototype.getFollowers = function(cb) {
  var self = this;
  if ((process.env.NODE_ENV == 'production') && self.followersRecent()) {
    console.log('recent followers');
    return self.storedFollowers(cb);
  }
  self.retrieveFollowers(cb);
};

User.prototype.retrieveFollowers = function (cb) {
  var self = this;
  twitter.getFollowers(this.screen_name, this.getTokenPair(), function (followers) {
    storeFollowers(followers, self.screen_name);
    self.lastFollowersRetrieved = moment();
    self.store();
    cb(followers);
  });
};

User.prototype.storedFollowers = function (cb) {
  followerIds(this.screen_name, cb);
};

User.prototype.followerHistory = function (cb) {
  redis.zrevrange('diff:' + this.screen_name, 0, -1, 'WITHSCORES', function (err, values) {
    var i, who, when, what;
    var results = [];
    for (i = 0; i < values.length; i = i + 2) {
      who = values[i];
      what = who.slice(0, 1)
      who = who.slice(1, who.length);
      when = moment(Number(values[i + 1]));

      results.push({
        who: who,
        what: what,
        when: when
      });
    }

    cb(results);
  });
};

function getUser(username, cb) {
  function aux (key) {
    redis.hgetall('users:' + key, function(err,obj) {
      if (err) {
        console.log(err);
      } else {
        user = _.extend(new User(), obj);
        cb(user);
      }
    });
  }

  if (Number(username)) {
    redis.get('ids:'+ username, function (err, obj) {
      aux(obj);
    });
  } else {
    aux(username);
  }
}

module.exports = {
  User: User,
  getUser: getUser
};
