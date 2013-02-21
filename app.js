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

var port, sessionStore;

passport.serializeUser(function(metadata, done) {
  done(null, metadata.id_str);
});

passport.deserializeUser(function(id, done) {
  users.getUser(id, function(user) {
    done(null, user);
  })
});

passport.createUserFromTwitter = function (accessToken, accessTokenSecret, metadata, done) {
  var user = new User(metadata._json);
  users.getUser(metadata._json.id_str, function(u) {
    if (u && u.followers_count) {
      user.old_followers_count = u.followers_count;
    }
    user.setAccessToken(accessToken, accessTokenSecret);
    user.store(function(){
      done(null, metadata._json);
    });
  });
};

//TODO: Fix this, using the host of a the first request, maybe change how passport works
var cb_host;


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
  .use(function(req, res, next) {
    //We're setting the twitter callback host here
    if (!cb_host) {
      cb_host = 'http://' + req.headers.host
      passport.use(
        new TwitterStrategy({
          consumerKey: tc.key,
          consumerSecret: tc.secret,
          callbackURL: cb_host + '/auth/twitter/callback'
        }, passport.createUserFromTwitter)
      );
    }
    next();
  })
  .set('view engine', 'ejs');


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
  if (req.user) {
    res.redirect('/dashboard')
  } else {
    res.render("index");
  }
});

server.get("/dashboard", function(req, res, next) {
  if (req.user) {
    var user_info = req.user;
    res.render("dashboard", {
      full_name: user_info.name,
      current_followers: user_info.followers_count,
      old_followers: user_info.old_followers_count
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
  var user = req.user
  if (user) {
    user.getFollowers(function () {
      user.followerHistory(function (history) {
        res.render("follower_history", {
          user: user,
          history: history
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
