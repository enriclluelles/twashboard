var mainController = require('./main_controller');
module.exports = Backbone.Router.extend({
  routes: {
    dashboard: 'dashboard',
    follower_history: 'follower_history'
  }
});
