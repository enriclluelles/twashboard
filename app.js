var express = require("express")
  , conf = require("./conf")
  , tc = conf.twitter
  , passport = require("passport")
  , server = express.createServer()
  , redis = require("./lib/redis_manager")
  , users = require("./lib/users")(redis, conf)
  , User = users.User
  , util = require('util')
  , connect = require('connect')
  , sass = require('node-sass')
  , RedisStore = require('connect-redis')(connect)
  , moment = require('moment')
  , passport = require('passport')
  , TwitterStrategy = require('passport-twitter').Strategy
  , jade = require("jade")
  , sessionStore = new RedisStore({client: redis});

passport.serializeUser(function(metadata, done) {
  done(null, metadata.id_str);
});

passport.deserializeUser(function(id, done) {
  users.getUser(id, function(user) {
    done(null, user);
  });
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



server
  .use(
    sass.middleware({
      src: __dirname + '/assets'
      , dest: __dirname + '/public'
      , debug: true
    })
  )
  .use('/',express.static(__dirname + '/public'))
  .use(express.favicon())
  .use(express.bodyParser())
  .use(express.cookieParser())
  .use(express.session({
    secret: conf.session.secret,
    store: sessionStore
  }))
  .use(passport.initialize())
  .use(passport.session())
  .use(function(req, res, next) {
    if (req.user || req.url.match(/^(\/|\/auth\/.*)$/)) {
      next();
    } else {
      res.redirect('/');
    }
  })
  .use(function(req, res, next) {
    //We're setting the twitter callback host here
    if (!cb_host) {
      cb_host = 'http://' + req.headers.host;
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
    res.redirect('/dashboard');
  } else {
    res.render("logged_out", {layout: false});
  }
});

server.get("/dashboard", function(req, res, next) {
  var user = req.user
    , firstTimeUser = !user.lastFollowersRetrieved;

  console.log(user.areFollowersRecent());
  if (!user.areFollowersRecent()) {
    user.getFollowers();
  }

  res.render("logged_in", {layout: false});
});

server.get("/follow_history", function(req, res, next) {
  var user = req.user;
  if (user.lastFollowersRetrieved) {
    user.followerHistory(function (history) {
      res.send(history);
    });
  }
});

server.get("/user", function(req, res, next) {
  res.send(req.user);
});

//Fallback for static pages
server.all("*", function(req, res, next) {
  res.render("logged_in", {layout: false});
});

server.listen(process.env.PORT || 4000);
