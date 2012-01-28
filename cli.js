var users = require("./lib/user");
var _ = require('underscore');
var util = require('util');
var auser;
users.getUser('enriclluelles',function(u){
  auser = u;
  auser.followerHistory(function (followers) {
    console.log(followers);
    process.exit();
  });
});
