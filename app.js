var express = require("express")
  , conf = require("./conf")
  , tc = conf.twitter
  , passport = require("passport")
  , server = express.createServer()
  , redis = require("./lib/redis")
  , users = require("./lib/users")(redis, conf)
  , User = users.User
  , util = require('util')
  , connect = require('connect')
  , RedisStore = require('connect-redis')(connect)
  , moment = require('moment')
  , passport = require('passport')
  , TwitterStrategy = require('passport-twitter').Strategy
  , jade = require("jade");

var user, port, sessionStore;

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

//TODO: Fix this, using the host of a the first request, maybe change how passport works
var cb_host = process.env.NODE_ENV == 'production' ? 'http://localhost:4000' : 'http://twashboard.herokuapp.com'

passport.use(
  new TwitterStrategy({
    consumerKey: tc.key,
    consumerSecret: tc.secret,
    callbackURL: cb_host + '/auth/twitter/callback'
  }, function (accessToken, accessTokenSecret, metadata, done) {
    console.log(metadata);
    user = new User(metadata._json);
    user.setAccessToken(accessToken, accessTokenSecret);
    user.store();
    done(null, metadata);
  })
);

sessionStore = new RedisStore({client: redis});

server.use(express.favicon())
  .use(express.bodyParser())
  .use('/',express.static(__dirname + '/public'))
  .use(express.cookieParser())
  .use(express.session({
    secret: conf.session.secret,
    store: sessionStore
  }))
  .use(passport.initialize())
  .use(passport.session())
  .set('view engine', 'jade');


server.get('/auth/twitter', passport.authenticate('twitter'));

server.get('/auth/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/dashboard');
  }
);

server.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

server.get("/", function (req, res, next) {
  res.render("index");
});

server.get("/dashboard", function(req, res, next) {
  if (req.session.auth) {
    var twitter_info = req.session.auth.twitter;
    var user_info = twitter_info.user;
    users.getUser(user_info.screen_name, function (user) {
      res.render("dashboard", {
        full_name: user_info.name,
        followers: user_info.followers_count
      });
    });
  }else{
    res.redirect("/");
  }
});

server.get("/users", function(req, res, next) {
  users.getAll(function (users) {
    res.send(users);
  });
});

server.get("/user/:id", function(req, res, next) {
  users.getUser(req.params.id, function (user) {
    res.send(user);
  });
});

server.get("/follower_history", function(req, res, next) {
  if (req.session.auth && req.session.auth.twitter) {
    var user = req.session.auth.twitter.user;
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
