var express = require("express")
  , conf = require("./conf")
  , tc = conf.twitter
  , everyauth = require("everyauth")
  , server = express.createServer()
  , redis = require("./lib/redis")
  , users = require("./lib/user")(redis)
  , User = users.User
  , util = require('util')
  , io = require('socket.io').listen(server)
  , connect = require('connect')
  , RedisStore = require('connect-redis')(connect)
  , moment = require('moment')
  , jade = require("jade");

var user, port, sessionStore;

everyauth.twitter
  .consumerKey(tc.key)
  .consumerSecret(tc.secret)
  .callbackPath("/auth/twitter/callback")
  .findOrCreateUser(function (session, accessToken, accessTokenSecret, metadata) {
    user = new User(metadata);
    user.setAccessToken(accessToken, accessTokenSecret);
    user.store();
    return metadata;
  })
  .redirectPath('/dashboard');

sessionStore = new RedisStore({client: redis});

server.use(express.favicon())
  .use(express.bodyParser())
  .use('/',express.static(__dirname + '/public'))
  .use(express.cookieParser())
  .use(express.session({
    secret: conf.session.secret,
    store: sessionStore
  }))
  .use(everyauth.middleware())
  .set('view engine', 'jade');

io.set('authorization', function (data, accept) {
  if (data.headers.cookie) {
    var sessionID = connect.utils.parseCookie(data.headers.cookie)['connect.sid'];
    sessionStore.get(sessionID, function (err, session) {
      if (err || !(session && session.auth)) {
        // if we cannot grab a session, turn down the connection
        accept('Error', false);
      } else {
        // save the session data and accept the connection
        data.session = session;
        accept(null, true);
      }
    });
  } else {
    console.log('No cookie transmitted');
    accept('No cookie transmitted.', false);
  }
});

server.get("/", function (req, res, next) {
  res.render("index");
});

server.get("/dashboard", function(req, res, next) {
  if (req.session.auth) {
    var twitter_info = req.session.auth.twitter;
    var user_info = twitter_info.user;
    users.getUser(user_info.screen_name, function (user) {
      req.session.auth.user = user;
      res.render("dashboard", {
        full_name: user_info.name,
        followers: user_info.followers_count
      });
    });
  }else{
    res.redirect("/");
  }
});

server.get("/follower_history", function(req, res, next) {
  if (req.session.auth.user) {
    var user = req.session.auth.user;
    users.getUser(user.screen_name, function (u) {
      u.getFollowers(function () {
        u.followerHistory(function (history) {
          res.render("follower_history", {
            user: u,
            history: history
          });
        });
      });
    });
  } else {
    res.redirect("/");
  }
});

server.get("/:view_id", function(req, res, next) {
  res.render(req.param("view_id"));
});

port = process.env.PORT || 4000;
server.listen(port);
