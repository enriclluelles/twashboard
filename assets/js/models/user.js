module.exports = Backbone.Model.extend({
  url: '/user',
  isFirstTimeUser: function () {
    return !this.get('lastFollowersRetrieved');
  }
});
