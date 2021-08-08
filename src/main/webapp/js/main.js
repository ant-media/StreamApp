//Video Modal *******************************************************************
$(document).ready(function () {

  // when the modal is opened autoplay it  
  $('#myModal').on('shown.bs.modal', function (e) {

    // set the video src to autoplay and not to show related video. Youtube related video is like a box of chocolates... you never know what you're gonna get
    $("#video").attr('src', $videoSrc + "?autoplay=1&amp;modestbranding=1&amp;showinfo=0");
  })



  // stop playing the youtube video when I close the modal
  $('#myModal').on('hide.bs.modal', function (e) {
    // a poor man's stop video
    $("#video").attr('src', $videoSrc);
  })

  // document ready  
});

// camera and microphone on off
$(document).ready(function() {
  $( ".camera-on" ).click(function() {
    $( this ).removeClass( "active" );
    $(this).next().addClass( "active" );
  });
  $( ".camera-off" ).click(function() {
    $( this ).removeClass( "active" );
    $(this).prev().addClass( "active" );
  });
  $( ".microphone-on" ).click(function() {
    $( this ).removeClass( "active" );
    $(this).next().addClass( "active" );
  });
  $( ".microphone-off" ).click(function() {
    $( this ).removeClass( "active" );
    $(this).prev().addClass( "active" );
  });
});

// chat on off
$(document).ready(function() {
  $( ".chat-on" ).click(function() {
    $( ".chat-active"  ).toggleClass( "active" );
    $( ".chat"  ).toggleClass( "active" );
  });
  $( ".chat-close" ).click(function() {
    $( ".chat-active"  ).removeClass( "active" );
    $( ".chat"  ).removeClass( "active" );
  });
});
