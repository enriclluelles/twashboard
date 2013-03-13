var Twashboard = window.Twashboard = {
  models: {},
  collections: {}
}

_.extend(Twashboard, {
  Models: require('./models'),
  Collections: require('./collections'),
  Router: require('./router'),
  Views: require('./views'),
});

Twashboard.router = new Twashboard.Router();

var user = Twashboard.models.user = new Twashboard.Models.User();

//Poor man's bootstrap
user.fetch({
  success: function () {
    Backbone.history.start({pushState: true});
  }
});
