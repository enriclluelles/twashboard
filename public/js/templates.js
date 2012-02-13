(function () {
this.JST = this.JST || {};
JST["index"] = function anonymous(locals, attrs, escape, rethrow) {
var attrs = jade.attrs, escape = jade.escape, rethrow = jade.rethrow;
var buf = [];
var self = locals || {};
var interp;
buf.push('<p>Hi! What\'s up?</p><p>Go <a');
buf.push(attrs({ 'href':("/auth/twitter") }));
buf.push('>here</a> to see some twitter stats\n</p>');return buf.join("");
}; 
JST["layout"] = function anonymous(locals, attrs, escape, rethrow) {
var attrs = jade.attrs, escape = jade.escape, rethrow = jade.rethrow;
var buf = [];
var self = locals || {};
var interp;
buf.push('<!DOCTYPE html><html><head><link');
buf.push(attrs({ terse: true, 'href':('http://fonts.googleapis.com/css?family=Leckerli+One|VT323'), 'rel':('stylesheet'), 'type':('text/css') }));
buf.push('><meta');
buf.push(attrs({ terse: true, 'charset':("utf-8") }));
buf.push('><title>Twashboard</title><script');
buf.push(attrs({ terse: true, 'src':("//ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js") }));
buf.push('></script><script');
buf.push(attrs({ terse: true, 'src':("/socket.io/socket.io.js") }));
buf.push('></script><script');
buf.push(attrs({ terse: true, 'src':("/js/application.js") }));
buf.push('></script></head><body><div');
buf.push(attrs({ terse: true, 'id':('container') }));
buf.push('><h1>Twashboard</h1>');
var __val__ = body
buf.push(null == __val__ ? "" : __val__);
buf.push('</div></body></html>');return buf.join("");
}
})()