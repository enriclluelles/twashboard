module.exports = function (redis, config) {

  var moment = require('moment')
  , util = require('util')
  , twitter = require('./twitter')(config)
  , follower_retrieval = require('./follower_retrieval')(redis, config)
  , _ = require("underscore");

  /**
   * Add a user id to the list of users stalked by another one
   *
   * @param {User} stalker
   * @param {User} stalked
   * @param {Function} cb
   *
   */
  function startStalking(stalker, stalked_uid, cb) {
    redis.sadd('stalked_by:' + stalker.uid, stalked_uid, function(error, value) {
      cb && cb(!!value);
    });
  }

  /**
   * Ask for the follower history of each stalked user
   *
   * @param {User} stalker
   * @param {Function} cb
   */
  function getStalkedFollowerHistory(stalker, cb) {

    var results = {};

    redis.smembers('stalked_by:' + stalker.uid, function(error, ids) {
      ids.forEach(function(id) {
        getFollowerHistory(id, stalker, function(data) {
          results[id] = data;
          if (_.size(results) === ids.length) {
            cb(results);
          }
        });
      });
    });
  }

  /**
   * Get follower data for each of the stalked users
   */
  function getStalkerUsersFollowerData(stalker, cb) {
    redis.smembers('stalked_by:' + stalker.uid, function(error, ids) {
      ids.forEach(function(id) {
        followerData(id, stalker, function(data) {
          results[id] = data;
          if (_.size(results) === ids.length) {
            cb(results);
          }
        });
      });
    });
  }

  return {
    getStalkerUsersFollowerData: getStalkerUsersFollowerData,
    getStalkedFollowerHistory: getStalkedFollowerHistory,
    startStalking: startStalking
  }
}
