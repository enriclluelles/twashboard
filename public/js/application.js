var socket = io.connect('/');
$('followers_history').click(function (e) {
  $.get('follower_history', function (data) {
    console.log(data);
  });
});
