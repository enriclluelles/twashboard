var redisUrl = require('url').parse(process.env.REDISTOGO_URL || 'redis://localhost:6379/')
  , redisPass = redisUrl.auth && redisUrl.auth.split(':')[1]
  , util = require('util')
  , redis = require("redis").createClient(redisUrl.port, redisUrl.hostname);

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

module.exports = redis;
