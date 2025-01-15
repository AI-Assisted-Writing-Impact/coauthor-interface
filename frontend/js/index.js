function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}
$(function() {
  startBlinking();

  const type = getUrlParameter('type'); // 获取 URL 中的 type 参数

  // 根据 type 参数显示或隐藏特定的功能
  if (type === 'a') {
    $('#suggestion').hide(); // 隐藏 suggestion
    $('#grammar').show();    // 显示 grammar
  } else if (type === 'b' || type === 'c' || type === 'd') {
    $('#suggestion').show(); // 显示 suggestion
    $('#grammar').hide();    // 隐藏 grammar
  } else if (type === 'e') {
    $('#shortcuts').hide();
  }


    // 添加文字到 p 标签中
  const promptText = "Everyone’s on social media these days, but does it actually help people stay connected, or does it just make us feel more alone? What’s your take on it? Have you noticed a difference in your own friendships?";
  document.getElementById("prompt-text").innerText = promptText;

  if (condition == 'human') {
    setupEditorHumanOnly();
  } else if (condition == 'machine') {
    setupEditorMachineOnly();
  } else {
    setupEditor();
  }

  /* Enable controls */
  ctrl = getControl(); // &ctrl=show
  if (ctrl == 'show'){
    $('#setting-btn').css('display', 'inline');
    $('#setting-btn').click(function(e) {
      $('#control').toggleClass('show');
    });
    $('#finish-btn').prop('disabled', false);
    $('#finish-replay-btn').prop('disabled', false);
  }

  let accessCode = getAccessCode();
  startSession(accessCode);

  /* Enable tooltips */
  $('[data-toggle="tooltip"]').tooltip();

  /* Make shortcuts draggable */
  if ($("#shortcuts").length) {
    $("#shortcuts").draggable({containment: 'window'});
  }

  /* Manage suggestions in dropdown */
  $(document).click(function(e) {
    // Close dropdown if mouse clicked elsewhere
    // Check if click was triggered on or within frontend-overlay
    if ($(e.target).closest("#frontend-overlay").length > 0) {
      return false;
    } else {
      hideDropdownMenu(EventSource.USER);
    }
  });

  // Navigate dropdown menu using arrow keys
  tab = 9, enter = 13, esc = 27, left = 37, up = 38, right = 39, down = 40;
  $(document).keydown(function(e) {
    if ($('#frontend-overlay').hasClass('hidden')) {
      // Reopen dropdown menu
      if (e.shiftKey && e.key === 'Tab') {
        showDropdownMenu(EventSource.USER, is_reopen=true);
        e.preventDefault();
      }
      return;
    } else {
      switch (e.which) {
        case up:
          previousItem = $('.dropdown-item').get(currentIndex);
          $(previousItem).removeClass('sudo-hover');
          currentIndex = currentIndex - 1;
          if (currentIndex < 0) {
            currentIndex = numItems - 1;
          }
          currentItem = $('.dropdown-item').get(currentIndex);
          $(currentItem).addClass('sudo-hover');

          logEvent(EventName.SUGGESTION_UP, EventSource.USER);
          break;

        case down:
          previousItem = $('.dropdown-item').get(currentIndex);
          $(previousItem).removeClass('sudo-hover');
          currentIndex = currentIndex + 1;
          if (currentIndex == numItems) {
            currentIndex = 0;
          }
          currentItem = $('.dropdown-item').get(currentIndex);
          $(currentItem).addClass('sudo-hover');

          logEvent(EventName.SUGGESTION_DOWN, EventSource.USER);
          break;

        case esc:
          logEvent(EventName.SUGGESTION_CLOSE, EventSource.USER);
          hideDropdownMenu(EventSource.USER);
          break;

        case tab:
          break;

        default:
          hideDropdownMenu(EventSource.USER);
          return;
      }
      e.preventDefault();
      return;
    }
  });

  /* Handle buttons */
  $('#shortcuts-close-btn').click(function(e) {
    closeShortcuts();
  });
  $('#shortcuts-open-btn').click(function(e) {
    openShortcuts();
  });
  $('#finish-btn').click(function(e) {
    endSession();
  });
  $('#finish-replay-btn').click(function(e) {
    endSessionWithReplay();
  });

    $('#close-btn').click(function(e) {
        const alertBox = document.getElementById('alert-box');
              if (alertBox) {
                alertBox.style.display = 'none'; // 隐藏弹框
              }
      });


});
