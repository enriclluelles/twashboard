var socket = io.connect('/');
socket.on('followers', function (followers) {
  console.log(followers);
});
