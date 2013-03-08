require.config({
  paths: {
    jquery: 'lib/jquery',
    underscore: 'lib/underscore',
    backbone: 'lib/backbone'
  }
});

define(['jquery', 'underscore', 'backbone'], function ($, _, Backbone) {
  console.log(Backbone);
  return {};
});
