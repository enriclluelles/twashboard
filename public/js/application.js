var socket =io.connect('/');



var User = Backbone.Model.extend({
  defaults: {
    screen_name: '(deleted user)',
    name: '(deleted user)',
    avatar: '/img/placeholder.jpg'
  },
  idAttribute: 'screen_name',
  url: '/user/' + this.id
});

var UserCollection = Backbone.Collection.extend({
  model: User,
  url: '/users'
})

var UserView = Backbone.View.extend({
  render: function () {
    return JST['user']({user: this.model.attributes});
  }
});

var AppController = Backbone.Router.extend({
  routes: {
    'users': 'allUsers',
    'user/:id': 'getUser'
  },
  getUser: function (id) {
    var view, user, self = this;
    this.allUsers({success: function () {
      user = self.users.get(id);
      view = new UserView({model: user});
      return $('#user').html(view.render());
    }});
  },
  allUsers: function (options) {
    this.users = this.users || new UserCollection();
    this.users.fetch(options);
  }

});

var appController = new AppController();
Backbone.history.start();
