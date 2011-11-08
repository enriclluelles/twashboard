var express = require("express"),
tc = require("./credentials").twitter;
everyauth = require("everyauth"),
server = express.createServer(),
User = require("./user");
io = require("socket.io"),
jade = require("jade");

var util = require('util');
var user, port;


everyauth.twitter
.consumerKey(tc.key)
.consumerSecret(tc.secret)
.callbackPath("/auth/twitter/callback")
.findOrCreateUser(function (session, accessToken, accessTokenSecret, metadata) {
  user = User.createUser(metadata);
  user.setAccessToken(accessToken, accessTokenSecret);
  user.getFollowers();
  return metadata;
})
.redirectPath('/');


server.use(express.favicon());
server.use(express.bodyParser());
server.use('/',express.static(__dirname + '/public'));
server.use(express.cookieParser());
server.use(express.session({secret: 'secret'}));
server.use(everyauth.middleware());

server.set('view engine', 'jade');

server.get("/", function(req, res, next) {
  var twitter_info, auth_hash;
  if (req.session.auth) {
    var params;
    twitter_info = req.session.auth.twitter;
    user_info = twitter_info.user;
    params = {
      token: {
        oauth_token: twitter_info.accessToken,
        oauth_token_secret: twitter_info.accessTokenSecret
      },
      screen_name: user_info.screen_name
    }
    res.render("index", {full_name: user_info.name, followers: user_info.followers_count});
  }else{
    res.render("index", {full_name: null, followers: null});
  }
});

server.get("/:view_id", function(req, res, next) {
  res.render(req.param("view_id"));
});

io.listen(server);

port = process.argv[2] || 3000;
server.listen(port);
