var socket = io.connect('/');
socket.on('followers', function (followers) {
  console.log(followers);
});

$('followers').on('click', function () {
  socket.emit('getFollowers');
});
