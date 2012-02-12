var users = require("./lib/user");
var _ = require('underscore');
var util = require('util');
var auser;
users.getUser('enriclluelles', 'jashkenas', 'tjholowaychuck', function(u){
  console.log(util.inspect(u));
});
users.getUser('enriclluelles', function(u){
  console.log(util.inspect(u));
});

setTimeout(function () {
  process.exit()
}
, 1000);
