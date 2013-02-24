var conf = require('./conf')
, redis = require('./lib/redis_manager')
, users = require('./lib/users')(redis, conf);

users.getAll(function(list) {
  list.forEach(function(usr) {
    ('oldfollowers users diff').split(' ').map(function(a){return a + ':'}).forEach(function(a){
      console.log(a + usr.screen_name);
      redis.rename(a + usr.screen_name, a + usr.uid, function(){});
    });
  });
});

users.getAll(function(list){ list.forEach(function(usr){usr.store()})});
