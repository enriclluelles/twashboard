module.exports = function (redis, config) {

  var moment = require('moment')
  , util = require('util')
  , twitter = require('./twitter')(config);
  , follower_retrieval = require('./follower_retrieval')(redis, config);
  , _ = require("underscore");

  /**
   * Add a user id to the list of users stalked by another one
   *
   * @param {User} stalker
   * @param {User} stalked
   * @param {Function} cb
   *
   */
  function startStalking(stalker, stalked, cb) {

    redis.sadd('stalked_by:' + stalker.uid, stalked.uid, function(error, value) {
      cb(!!value);
    });

  }

  /**
   * Ask for the follower history of each stalked user
   *
   * @param {User} stalker
   * @param {Function} cb
   */
  function getStalkedFollowerHistory(stalker, cb) {
    redis.smembers('stalked_by:' + stalker.uid, function(error, value) {

    });
  }


}
