function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}
$(function() {
  startBlinking();

  const type = getUrlParameter('type'); // get type from the url

  // 定义不同类型的 instructions
  const instructionsMap = {
    a: `
      <p><b>Instructions: </b>In this task, you will write using an AI-powered writing assistant that provides grammar and style suggestions. Please write naturally and spontaneously. Do not use any external resources to assist your writing. </p>
      <p>Please follow these guidelines:</p>
      <ul>
        <li>When you need suggestions for grammar and style while you write, press <b>F1</b>(Windows) or <b>fn + F1</b> (Mac). You can accept, revise, or reject the suggestions.</li>
        <li>Use this grammar and style suggestions function <b>at least 5 times</b>.</li>
        <li>Your essay should be <b>at least 500 words</b>, ensuring it has a clear ending.</li>
        <li>Spend <b>at least 40 minutes</b>.</li>
        <li>Once you’re done, click the <b>Save</b> button, which will give you a verification code.</li>
        <li>Copy and paste your essay and verification code below.</li>
      </ul>
    `,
    b: `
      <p><b>Instructions: </b>In this task, you will write using an AI-powered writing assistant that can help you continue your sentences. Please write naturally and spontaneously. Do not use any external resources to assist your writing. </p>
      <p>Please follow these guidelines:</p>
      <ul>
        <li>If you want the AI to complete an unfinished sentence or generate a new sentence, press the <b>Tab</b> key. You can <b>accept</b>, <b>revise</b>, or <b>reject</b> the continuation.</li>
        <li>Use the sentence continuation/generation function <b>at least 5 times</b>.</li>
        <li>Your essay should be <b>at least 500 words</b>, ensuring it has a clear ending.</li>
        <li>Spend <b>at least 40 minutes</b>.</li>
        <li>Once you’re done, click the <b>Save</b> button, which will give you a verification code.</li>
        <li>Copy and paste your essay and verification code below.</li>
      </ul>
    `,
    c: `
      <p><b>Instructions: </b>In this task, you will write a 500-word essay with an AI-powered writing assistant that will generate the second half of your essay. Please write naturally and spontaneously. Do not use any external resources to assist your writing.</p>
      <p>Please follow these guidelines:</p>
      <ul>
        <li>Write <b>the first half</b> of your essay on your own (<b>about 250 words</b>).</li>
        <li>Once you write about 250 words, press the <b>Tab</b> key to generate the second half of your essay. You can <b>accept</b>, <b>revise</b>, or <b>reject</b> the AI-generated text, but be sure to <b>read it carefully</b> before making your decision.</li>
        <li><b>Edit the writing</b> to make the text written by you and AI coherent and clear.</li>
        <li>Spend <b>at least 40 minutes</b>.</li>
        <li>Once you’re done, click the <b>Save</b> button, which will give you a verification code.</li>
        <li>Copy and paste your full essay and verification code below.</li>
      </ul>
    `,
    d: `
      <p><b>Instructions: </b>In this task, you will write a 500-word essay with an AI-powered writing assistant that will generate the first half of your essay. Please write naturally and spontaneously. Do not use any external resources to assist your writing.</p>
      <p>Please follow these guidelines:</p>
      <ul>
        <li>Press the <b>Tab</b> key <b>at the beginning</b> to generate the first half of your essay (about 250 words). You can <b>accept</b>, <b>revise</b>, or <b>reject</b> the AI-generated text, but be sure to <b>read it carefully</b> before making your decision.</li>
        <li>Continue writing from where the AI left off until your essay reaches <b>at least 500 words</b>, ensuring it has a clear ending.</li>
        <li><b>Edit the writing</b> to make the text written by you and AI coherent and clear.</li>
        <li>Spend <b>at least 30 minutes</b>.</li>
        <li>Once you’re done, click the <b>Save</b> button, which will give you a verification code.</li>
        <li>Copy and paste your full essay and verification code below.</li>
      </ul>
    `,
    e: `
      <p><b>Instructions: </b>In this task, you will write an essay. Please write naturally and spontaneously. Do not use any external resources to assist your writing.</p>
      <p>Please follow these guidelines:</p>
      <ul>
        <li>Your essay should be <b>at least 500 words</b>, ensuring it has a clear ending.</li>
        <li>Spend <b>at least 40 minutes</b>.</li>
        <li>Once you’re done, click the <b>Save</b> button, which will give you a verification code.</li>
        <li>Copy and paste your full essay and verification code below.</li>
      </ul>
    `,
    f: `
      <p><b>Instructions: </b>In this task, you will write using an AI-powered writing assistant that can help you continue your sentences by suggesting 3-5 words at a time. Please write naturally and spontaneously. Do not use any external resources to assist your writing.  </p>
      <p>Please follow these guidelines:</p>
      <ul>
        <li>If you want the AI to continue an unfinished sentence with 3-5 words, press the <b>Tab</b> key. You can <b>accept</b>, <b>revise</b>, or <b>reject</b> the continuation.</li>
        <li>Use the sentence continuation/generation function <b>at least 5 times</b>.</li>
        <li>Your essay should be <b>at least 500 words</b>, ensuring it has a clear ending.</li>
        <li>Spend <b>at least 40 minutes</b>.</li>
        <li>Once you’re done, click the <b>Save</b> button, which will give you a verification code.</li>
        <li>Copy and paste your essay and verification code below.</li>
      </ul>
    `
  };
  // 设置 Instructions
  if (instructionsMap[type]) {
    $("#instructions-content").html(instructionsMap[type]);
  } else {
    $("#instructions-content").html("<p>Invalid type. Please check the URL.</p>");
  }

  // Show or hide specific functions based on the type parameter
  if (type === 'a') {
    $('#suggestion').hide(); // hide suggestion
    $('#grammar').show();    // show grammar
  } else if (type === 'b' || type === 'c' || type === 'd'|| type === 'f') {
    $('#suggestion').show(); // show suggestion
    $('#grammar').hide();    // hide grammar
  } else if (type === 'e') {
    $('#shortcuts').hide();
  }


    // Adding text to p
  const promptText = "Everyone’s on social media these days, but does it actually help people stay connected, or does it just make us feel more alone? What’s your take on it? Have you noticed a difference in your own friendships?";
  document.getElementById("prompt-text").innerHTML = '<b>Topic: </b>' + promptText;

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
//  const finishBtn = document.getElementById("finish-btn");
//  finishBtn.disabled = true;
//    const storyText = document.getElementById("story-text");
//    const clearEnding = document.getElementById("clear-ending");
//    const aiCollaboration = document.getElementById("ai-collaboration");

//    function validateForm() {
//        if (storyText.value.trim() !== "" && clearEnding.checked && aiCollaboration.checked) {
//            finishBtn.disabled = false; // able button
//        } else {
//            finishBtn.disabled = true;  // disable button
//        }
//    }
//
//    // Listen for changes in the input field
//    storyText.addEventListener("input", validateForm);
//    clearEnding.addEventListener("change", validateForm);
//    aiCollaboration.addEventListener("change", validateForm);
//
//    // Executed once on page load to ensure initial state
//    validateForm();
  $('#finish-btn').click(function(e) {
//    if (storyText.value.trim() !== "" && clearEnding.checked && aiCollaboration.checked) {
        endSession(type);
//    }
  });
//  $('#finish-replay-btn').click(function(e) {
//    endSessionWithReplay();
//  });

    $('#close-btn').click(function(e) {
        const alertBox = document.getElementById('alert-box');
              if (alertBox) {
                alertBox.style.display = 'none'; // hide
              }
      });


});
