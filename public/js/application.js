var socket = io.connect('/');

$('followers').on('click', function () {
  socket.emit('getFollowers');
  socket.on('followers', function (followers) {
    console.log(followers);
  });
});
