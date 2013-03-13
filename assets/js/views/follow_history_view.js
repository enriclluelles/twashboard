module.exports = Backbone.View.extend({
  id: 'follow_events',
  render: function () {
    var content = JST['follow_history']({
      events: this.collection
    });
    this.$el.html(content);
    return this.$el;
  }
});
