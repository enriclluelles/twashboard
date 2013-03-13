var Models = require('./models');
var Collections = require('./collections');
var Views = require('./views');
var current_user = new Models.User();
var Router = require('./router');
var router = new Router();

window.current_user = current_user;
//poor man's bootstrap
current_user.fetch({
  success: function () {
    Backbone.history.start({pushState: true});
  }
});

$(document).on('click', "a#follower_history_link", function () {
  Backbone.history.navigate('follower_history', {trigger: true});
  return false;
});

router.on('route:dashboard', function () {
  var v = new Views.DashBoardView({el: $('#main'), model: current_user});
  v.render();
});

router.on('route:follower_history', function () {
  Collections.FollowHistory = require('./collections/follow_history');
  var follow_history = new Collections.FollowHistory();
  follow_history.fetch({
    success: function() {
      var FollowHistoryView = require('./views/follow_history_view');
      var view = new FollowHistoryView({collection: follow_history});
      $('#main').html(view.render());
    }
  });
});
