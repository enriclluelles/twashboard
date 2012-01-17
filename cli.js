users = require("./user");
GL = {};
users.getUser('enriclluelles',function(u){
  u.followersData();
});
