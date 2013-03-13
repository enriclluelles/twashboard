var FollowEvent = require('../models/follow_event');
module.exports = Backbone.Collection.extend({
  url: '/follow_history',
  model: FollowEvent
});
