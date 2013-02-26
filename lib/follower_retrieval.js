module.exports = function(redis, config, User) {

  var _ = require('underscore')
  , moment = require("moment")
  , twitter = require('./twitter')(config);

  /**
   * Ask the twitter API for the followers of an user using the credentials and API request of another
   *
   * @param {User} as_user The user whoser credentials are user
   * @param {User} from_user
   * @param {Function} cb
   */
  function followerListFromTwitter(as_user, from_user, cb) {
    twitter.getFollowers(from_user.uid, as_user.getTokenPair(), function (followers) {
      storeFollowers(followers, from_user.uid);
      from_user.lastFollowersRetrieved = moment();
      from_user.store(function(){
        cb && cb(followers);
      });
    });
  }


  /**
   * Gets follower data with user's credentials, stores it
   * and executes the callback `cb`
   *
   * @param {String} as_user Perform the fetching as another user
   * @param {String} from_user
   * @param {Function} cb
   */



  /**
   * Retrieve the user followers from redis
   *
   * @param {String} uid
   * @param {Function} cb
   */
  function followerListFromRedis(uid, cb) {
    var key = 'oldfollowers:' + uid;
    redis.exists(key, function (error, value) {
      if (error) {return cb(null, 'Follower not found')}
      redis.smembers(key, function (error, values) {
        cb(values);
      });
    });
  }


  /**
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

  /**
   * Store a list of followers to redis and store a diff in a sorted set if
   * we had a previous list
   *
   * @param {Array} ids
   * @param {String} uid
   */
  function storeFollowers(ids, uid) {
    var key = "followers:" + uid;
    var flagDiff1 = flagDiff2 = flagNoDiff = false;

    function renameToOld() {
      //if all the operations using the set finished
      //we rename it to oldfollowers
      if (flagNoDiff || (flagDiff1 && flagDiff2)) {
        redis.rename(key, "old" + key);
      }
    }

    redis.sadd(key, ids, function (error, value) {
      if (error) return console.log('Error adding to set: ' + error);

      redis.exists('old' + key, function (error, value) {
        if (error) return;
        if (value !== 1) {
          flagNoDiff = true
          return renameToOld();
        }

        //If we already got this guy's followers we do the diffs with the redis
        //set diff operation
        redis.sdiff(key, "old" + key, function (error, values) {
          if (!error && values.length > 0) { addDiff('+', values, uid) }
          flagDiff1 = true;
          renameToOld();
        });

        redis.sdiff("old" + key, key, function (error, values) {
          if (!error && values.length > 0) { addDiff('-', values, uid) }
          flagDiff2 = true;
          renameToOld();
        });
      });

    });
  }

  /**
   * Gets the usernames for a list of ids
   *
   * @param {Array} ids
   * @param {User} as_user
   * @param {Funciton} cb
   */
  function getUserNames(ids, as_user, cb) {
    var res = {}, keys, not_known = [];

    keys = ids.map(function(id) {return 'usernames:' + id});

    redis.mget(keys, function (err, obj) {

      //Take into account the users that we coulnd't find
      //and populate the res object with the others
      obj.forEach(function (el, index) {
        var id = ids[index];
        el ? res[id] = el : not_known.push(id);
      });

      if (not_known.length > 0) {
        twitter.lookupUsers(not_known, as_user.getTokenPair(), function (users) {
          not_known.forEach(function(userNotKnown) {
            res[userNotKnown] = '(deleted user)';
          });
          users.forEach(function (val) {
            var u;
            if (val) {
              u = new User(val);
              u.store();
              res[u.uid] = u.screen_name;
            }
          });
          cb(res);
        });
      } else {
        cb(res);
      }
    });
  }

  /**
   * Returns the follower history of a user in the form of an array of objects
   * with the id, a string ('+' or '-') and a timestamp
   *
   * @param {String} uid
   * @param {User} as_user
   * @param {Function} cb
   */
  function getFollowerHistory(uid, as_user, cb) {

    redis.zrevrange('diff:' + uid, 0, -1, 'WITHSCORES', function (err, values) {
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

      getUserNames(_(ids).uniq(), as_user, function (users) {
        results = results.map(function (r) {
          r.who = users[r.id];
          return r;
        });
        cb(results);
      });
    });
  }

  return {
    followerListFromTwitter: followerListFromTwitter,
    followerListFromRedis: followerListFromRedis,
    getFollowerHistory: getFollowerHistory
  };

};
