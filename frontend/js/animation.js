/* Wiggle icons upon mouse over */
$('button').hover(
  function() {
    $(this).children('i').addClass('wiggle');
  }, function() {
    $(this).children('i').removeClass('wiggle');
  }
);

$('i').hover(
  function() {
    $(this).addClass('wiggle');
  }, function() {
    $(this).removeClass('wiggle');
  }
);

function showLoadingSignal(message) {
  $('#robot').addClass('spin');
  if (!$('#loading-message').length) {
    $('body').append('<div id="loading-message" class="loading-overlay">Working on it...</div>');
  }
  $('#loading-message').show();
  // Ignore message for default loading signal
}

function hideLoadingSignal() {
  $('#robot').removeClass('spin');
  $('#loading-message').hide();

}
