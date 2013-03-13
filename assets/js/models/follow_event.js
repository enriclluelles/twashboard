module.exports = Backbone.Model.extend({
  when: function () {
    return moment(this.get('when')).format("dddd, MMMM Do YYYY");
  }
});
