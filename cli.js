var users = require("./lib/user");
var _ = require('underscore');
var util = require('util');
users.getUser('enriclluelles',function(u){
  u.getFollowersData(function(fs){
    var names = _.map(fs, function(fl) {return fl.screen_name})
    console.log(names);
    process.exit();
  });
});
