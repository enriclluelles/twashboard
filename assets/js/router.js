var Models = require('./models');
var Views = require('./views');
var Collections = require('./collections');

var Router = Backbone.Router.extend({
  routes: {
    dashboard: 'dashboard',
    follower_history: 'follower_history'
  },

  dashboard: function () {
    if (Twashboard.models.user) {
      var v = new Views.DashBoardView({el: $('#main'), model: Twashboard.models.user});
      v.render();
    }
  },

  follower_history: function () {
    var renderView = function aux () {
        var view = new Views.FollowHistoryView({collection: follow_history});
        $('#main').html(view.render());
    };
    var follow_history = Twashboard.collections.follow_history;
    if (!follow_history) {
      follow_history = Twashboard.collections.follow_history = new Collections.FollowHistory();
      follow_history.fetch({
        success: renderView
      });
    } else {
      renderView();
    }
  }
});

module.exports = Router;
