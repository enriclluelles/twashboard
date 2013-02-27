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



server
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
  var user = req.user
  , firstTimeUser = !user.lastFollowersRetrieved

  if (!user.areFollowersRecent()) {
    if (firstTimeUser) {
      user.getFollowers();
    }
  }

  res.render("dashboard.jade", {
    full_name: user.name,
    first_time_user: firstTimeUser,
    followers_fetched_recently: user.areFollowersRecent(),
    current_followers: user.followers_count,
    old_followers: user.old_followers_count,
    layout: 'layout.ejs'
  });
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


server.get("/stalk", function(req, res, next) {
  res.render('stalk');
});

server.post("/stalk", function(req, res, next) {
  var user = req.user
  user.stalk(req.body.who, function(){
    res.send('ok');
  });
});

server.get("/follower_history", function(req, res, next) {
  var user = req.user
  if (user.lastFollowersRetrieved) {
    user.followerHistory(function (history) {
      res.render("follower_history", {
        user: user,
        history: history
      });
    });
  }
});

//Fallback for static pages
server.get("/:view_id", function(req, res, next) {
  res.render(req.param("view_id"));
});

server.listen(process.env.PORT || 4000);
