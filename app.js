var express = require("express")
  , tc = require("./conf/credentials").twitter
  , everyauth = require("everyauth")
  , server = express.createServer()
  , User = require("./lib/user").User
  , util = require('util')
  , io = require('socket.io').listen(server)
  , jade = require("jade");

var user, port;


everyauth.twitter
  .consumerKey(tc.key)
  .consumerSecret(tc.secret)
  .callbackPath("/auth/twitter/callback")
  .findOrCreateUser(function (session, accessToken, accessTokenSecret, metadata) {
    user = new User(metadata);
    user.setAccessToken(accessToken, accessTokenSecret);
    user.store();
    user.getFollowers(function (followers) {
      io.emit('followers', followers);
    });
    return metadata;
  })
  .redirectPath('/');


server.use(express.favicon())
  .use(express.bodyParser())
  .use('/',express.static(__dirname + '/public'))
  .use(express.cookieParser())
  .use(express.session({secret: 'secret'}))
  .use(everyauth.middleware());

server.set('view engine', 'jade');

server.get("/", function(req, res, next) {
  var twitter_info, auth_hash;
  if (req.session.auth) {
    twitter_info = req.session.auth.twitter;
    user_info = twitter_info.user;
    res.render("index", {full_name: user_info.name, followers: user_info.followers_count});
  }else{
    res.render("index", {full_name: null, followers: null});
  }
});

server.get("/:view_id", function(req, res, next) {
  res.render(req.param("view_id"));
});



port = process.env.PORT || 4000;
server.listen(port);
