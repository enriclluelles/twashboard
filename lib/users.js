var twitter = require('./twitter')
  , moment = require('moment')
  , util = require('util')
  , _ = require("underscore");

module.exports = function (redis) {

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
      redis.zadd('diff:' + key, timestamp, type + diff[i] + timestamp);
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

  User.prototype.followersRecent = function () {
    return moment().subtract('days', 1) < moment(this.lastFollowersRetrieved)
  };

  User.prototype.followersDataRecent = function () {
    return moment().subtract('days', 1) < moment(this.lastFollowersDataRetrieved)
  };


  User.prototype.getFollowersData = function (cb) {
    var self = this;
    if ((process.env.NODE_ENV == 'production') && self.followersDataRecent()) {
      console.log("returning stored followers data");
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
    var keys;
    followerIds(this.screen_name, function(fwIds){
      keys = fwIds.map(function (id){ return "ids:" + id});
      redis.mget(keys, function (err, values) {
        //only the unknown users
        values = _.chain(values).map(function (val, index) {
          if (!val) {
            //we rely on redis returning values in the same order it receives the keys
            return fwIds[index];
          }
        }).compact().value(); //filter out the ones we know
        if (!values.length) { cb && cb(); return}
        twitter.lookupUsers(values, self.getTokenPair(), function (followers) {
          var users = _.map(followers, function(f) {
            var u;
            u = new User(f);
            u.store();
            return u;
          });

          self.lastFollowersDataRetrieved = moment();
          self.store(function () {
            cb && cb();
          });
        })

      });
    });
  };

  User.prototype.storedFollowersData = function (cb) {
    followerIds(this.screen_name, function(values){
      getUser(values, cb);
    });
  };

  User.prototype.getFollowers = function(cb) {
    var self = this;
    function aux() {
      self.getFollowersData(cb);
    }

    if ((process.env.NODE_ENV == 'production') && self.followersRecent()) {
      console.log("returning stored followers");
      return self.storedFollowers(aux);
    }
    self.retrieveFollowers(aux);
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
    var self = this;
    redis.zrevrange('diff:' + this.screen_name, 0, -1, 'WITHSCORES', function (err, values) {
      var i, who, ids, id, when, what, indexedUsers;
      var results = [];
      for (i = 0; i < values.length; i = i + 2) {
        timestamp = values[i + 1];
        who = values[i].replace(timestamp,"");
        what = who.slice(0, 1)
        id = who.slice(1, who.length);
        when = moment(Number(timestamp));

        results.push({
          id: id,
          what: what,
          when: when
        });
      }

      ids = results.map(function (r) {return r.id});
      if(!ids.length) {
        return cb([]);
      }
      self.getUserNames(_(ids).uniq(), function (users) {
        results = results.map(function (r) {
          r.who = users[r.id];
          return r;
        });
        cb(results);
      });
    });
  };

  User.prototype.getUserNames = function (ids, cb) {
    var res = {}, keys, not_known = [], self = this;

    keys = ids.map(function(id) {return 'ids:' + id});
    redis.mget(keys, function (err, obj) {
      obj.forEach(function (el, idx) {
        var id = ids[idx];
        el ? res[id] = el : not_known.push(id);
      });
      if (not_known.length > 0) {
        twitter.lookupUsers(not_known, self.getTokenPair(), function (users) {
          users.forEach(function (val) {
            var u;
            if (val) {
              u = new User(val);
              u.store();
              res[u.uid] = u.screen_name;
            } else {
              u = not_known[users.indexOf(val)];
              res[u.toString()] = u.toString();
              addDeleted(u);
            }
            if (_(res).size() === ids.length)
              cb(res);
          });
        })
      } else {
        cb(res);
      }
    });
  }

  function addDeleted(id) {
    redis.set('ids:' + id, '(deleted user)');
  }

  function retrieveUser() {
    var args = [].slice.call(arguments)
      , toSearch
      , users = []
      , first = args[0]
      , cb = args[args.length -1];
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
      , cb = args[args.length -1];

    toSearch = _.isArray(first) ? first : args.slice(0, args.length -1)
    if (!toSearch.length) {
      return cb([]);
    }

    function aux (key) {
      redis.hgetall('users:' + key, function(err,obj) {
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
          aux(obj);
        });
      } else {
        aux(username);
      }
    });
  }

  return {
    User: User,
    getUser: getUser,
    getAll: getAll
  };
}
