module.exports = Backbone.View.extend({
  id: 'main',
  tagName: 'div',
  renderer: JST.dashboard,
  initialize: function () {
    _.bindAll(this);
    this.model.on('change', this.render);
  },

  render: function () {
    var user = this.model;
    var locals = {
      full_name: user.get('name'),
      first_time_user: user.isFirstTimeUser(),
      current_followers: user.get('followers_count'),
      old_followers: user.get('old_followers_count')
    };
    this.$el.html(this.renderer(locals));
  }

});
