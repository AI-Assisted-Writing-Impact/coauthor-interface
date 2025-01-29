function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}
$(function() {
  startBlinking();

  const type = getUrlParameter('type'); // 获取 URL 中的 type 参数

  // 定义不同类型的 instructions
  const instructionsMap = {
    a: `
      <p>In this task, you will write one essay with an AI-powered writing assistant which can provide you with grammar and style suggestions.
      Please write naturally and spontaneously, and avoid overthinking or making the writing overly formal.
      Do not use any editing tools, grammar checkers, or other external resources to assist your writing.</p>
      <p>Please follow these guidelines:</p>
      <ul>
        <li>When you need suggestions for grammar and style while you write, press <b>F1</b> if you are using Windows or <b>fn + F1</b> for a Mac. You can accept, revise, or reject the suggestions.</li>
        <li>Please use this grammar and style suggestions function at least <b>5 times</b>.</li>
        <li>Each essay should be at least <b>500 words</b>, ensuring it has a clear ending.</li>
        <li>Spend no more than <b>40 minutes</b>.</li>
        <li>Once you’re done, click the <b>Save</b> button, which will give you a verification code.</li>
        <li>Copy and paste your essay and verification code below.</li>
      </ul>
    `,
    b: `
      <p>In this task, you will write one essay with an AI-powered writing assistant that can help you continue your sentences.
      Please write naturally and spontaneously, and avoid overthinking or making the writing overly formal.
      Do not use any editing tools, grammar checkers, or other external resources to assist your writing.</p>
      <p>Please follow these guidelines:</p>
      <ul>
        <li>If you want the AI to complete an unfinished sentence or generate a new sentence, press the <b>Tab</b> key. You can accept, revise, or reject the completion.</li>
        <li>Please use the sentence continuation/generation function at least <b>5 times</b>.</li>
        <li>Each essay should be at least <b>500 words</b>, ensuring it has a clear ending.</li>
        <li>Spend no more than <b>40 minutes</b>.</li>
        <li>Once you’re done, click the <b>Save</b> button, which will give you a verification code.</li>
        <li>Copy and paste your essay and verification code below.</li>
      </ul>
    `,
    c: `
      <p>In this task, you will write an essay with an AI-powered writing assistant that will generate the second half of your essay.
      Please write naturally and spontaneously, and avoid overthinking or making the writing overly formal.
      Do not use any editing tools, grammar checkers, or other external resources to assist your writing.</p>
      <p>Please follow these guidelines:</p>
      <ul>
        <li>Write the first <b>250 words</b> of your essay on your own.</li>
        <li>Once you write about 250 words, press the <b>Tab</b> key to generate the second half of your essay. You can accept, revise, or reject the AI-generated text.</li>
        <li>Spend no more than <b>40 minutes</b>.</li>
        <li>Once you’re done, click the <b>Save</b> button, which will give you a verification code.</li>
        <li>Copy and paste your full essay and verification code below.</li>
      </ul>
    `,
    d: `
      <p>In this task, you will write an essay with an AI-powered writing assistant that will generate the first 250 words of your essay.
      Please write naturally and spontaneously, and avoid overthinking or making the writing overly formal.
      Do not use any editing tools, grammar checkers, or other external resources to assist your writing.</p>
      <p>Please follow these guidelines:</p>
      <ul>
        <li>Press the <b>Tab</b> key at the beginning to generate the first <b>250 words</b> of your essay. You can accept, revise, or reject the AI-generated text.</li>
        <li>Continue writing from where the AI left off until your essay reaches at least <b>500 words</b>, ensuring it has a clear ending.</li>
        <li>Spend no more than <b>40 minutes</b>.</li>
        <li>Once you’re done, click the <b>Save</b> button, which will give you a verification code.</li>
        <li>Copy and paste your full essay and verification code below.</li>
      </ul>
    `,
    e: `
      <p>In this task, you will write an essay.
      Please write naturally and spontaneously, and avoid overthinking or making the writing overly formal.
      Do not use any editing tools, grammar checkers, or other external resources to assist your writing.</p>
      <p>Please follow these guidelines:</p>
      <ul>
        <li>Your essay should be at least <b>500 words</b> and have a clear ending.</li>
        <li>You should spend no more than <b>40 minutes</b> on this task.</li>
        <li>Once you’re done, click the <b>Save</b> button, which will give you a verification code.</li>
        <li>Copy and paste your full essay and verification code below.</li>
      </ul>
    `
  };
  // 设置 Instructions
  if (instructionsMap[type]) {
    $("#instructions-content").html(instructionsMap[type]);
  } else {
    $("#instructions-content").html("<p>Invalid type. Please check the URL.</p>");
  }

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
