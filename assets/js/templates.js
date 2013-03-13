(function () {
this.JST = this.JST || {};
JST["dashboard"] = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
buf.push('<header>Hi ' + escape((interp = full_name) == null ? '' : interp) + '!</header><div>fucker</div><div class="explain_followers"><p>You\'ve got ' + escape((interp = current_followers) == null ? '' : interp) + ' followers on twitter.</p>');
 if (first_time_user)
{
buf.push('<p>It looks like it\'s your first time visiting this site.</p>');
}
 if (current_followers > 75000)
{
buf.push('<p>You\'ve got a large number of followers, it will take a while to fetch them all</p>');
}
 if (current_followers && old_followers && current_followers !== old_followers)
{
buf.push('<p>You\'ve ');
 if (current_followers > old_followers)
{
buf.push('won ' + escape((interp = current_followers - old_followers) == null ? '' : interp) + ' followers ');
}
 if (current_followers < old_followers)
{
buf.push('lost ' + escape((interp = old_followers - current_followers) == null ? '' : interp) + ' followers ');
}
buf.push('since the last time you were here.</p>');
}
buf.push('<div><p>See your <a id="follower_history_link" href="/follower_history">follower history</a></p><p><a href="/logout"></a></p></div></div>');
}
return buf.join("");
}; 
JST["follow_history"] = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
buf.push('<div>');
// iterate events.models
;(function(){
  if ('number' == typeof events.models.length) {

    for (var $index = 0, $$l = events.models.length; $index < $$l; $index++) {
      var event = events.models[$index];

buf.push('<div><p>' + escape((interp = event.get('what')) == null ? '' : interp) + ' ' + escape((interp = event.get('who')) == null ? '' : interp) + ' \n' + escape((interp = event.get('what') == '+' ? 'started following you' : 'stopped following you') == null ? '' : interp) + ' \non ' + escape((interp = event.get('when')) == null ? '' : interp) + '</p></div>');
    }

  } else {
    var $$l = 0;
    for (var $index in events.models) {
      $$l++;      var event = events.models[$index];

buf.push('<div><p>' + escape((interp = event.get('what')) == null ? '' : interp) + ' ' + escape((interp = event.get('who')) == null ? '' : interp) + ' \n' + escape((interp = event.get('what') == '+' ? 'started following you' : 'stopped following you') == null ? '' : interp) + ' \non ' + escape((interp = event.get('when')) == null ? '' : interp) + '</p></div>');
    }

  }
}).call(this);

buf.push('</div>');
}
return buf.join("");
}; 
JST["user"] = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
buf.push('<div class="user">#' + escape((interp = user.uid) == null ? '' : interp) + '<div class="attributes"><div class="screen_name">');
var __val__ = user.screen_name
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div><div class="name">');
var __val__ = user.name
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div><div class="avatar"><img');
buf.push(attrs({ 'src':(user.avatar) }, {"src":true}));
buf.push('/></div></div></div>');
}
return buf.join("");
}
})()