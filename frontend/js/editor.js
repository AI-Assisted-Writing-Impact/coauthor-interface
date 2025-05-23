var checkFormatLockTime = new Date();  // for template

/* Setup */
function trackTextChanges(){
  quill.on('text-change', function(delta, oldDelta, source) {
    if (source == 'silent') {
      return;
    }
    else {
      // Classify whether it's insert or delete
      eventName = null;
      eventSource = sourceToEventSource(source);

      ops = new Array();
      for (let i = 0; i < delta.ops.length; i++) {
        ops = ops.concat(Object.keys(delta.ops[i]));
      }
      if (ops.includes('insert')) {
        eventName = EventName.TEXT_INSERT;
      } else if (ops.includes('delete')) {
        eventName = EventName.TEXT_DELETE;
      } else {
        eventName = EventName.SKIP;
        console.log('Ignore format change');
      }
      logEvent(eventName, eventSource, textDelta=delta);

      if (isCounterEnabled == true) {
        updateCounter();
      }

      if (domain == 'template') {
        let currentTime = new Date();
        let elapsedTime = (currentTime - checkFormatLockTime) / 1000;

        if (elapsedTime > 1){
          checkFormatLockTime = currentTime;
          formatNonTerminals();
        }
      }
    }
  });
}

function trackTextChangesByMachineOnly(){
  quill.on('text-change', function(delta, oldDelta, source) {
    eventName = null;
    eventSource = sourceToEventSource(source);

    ops = new Array();
    for (let i = 0; i < delta.ops.length; i++) {
      ops = ops.concat(Object.keys(delta.ops[i]));
    }
    if (ops.includes('insert')) {
      eventName = EventName.TEXT_INSERT;
    } else if (ops.includes('delete')) {
      eventName = EventName.TEXT_DELETE;
    } else {
      eventName = EventName.SKIP;
      console.log('Ignore format change');
    }

    // Ignore text-change by user and reset to oldDelta
    if (source == 'silent') {
      return;
    } else if (source == EventSource.API) {
      logEvent(eventName, eventSource, textDelta=delta);
    // Allow deletion
    } else if (source == EventSource.USER && eventName == EventName.TEXT_DELETE) {
      logEvent(eventName, eventSource, textDelta=delta);
    // Allow insertion of whitespace
    } else if (source == EventSource.USER && eventName == EventName.TEXT_INSERT){
        const isInsert = (element) => element == 'insert';
        let index = ops.findIndex(isInsert);

        if (delta.ops[index]['insert'].trim() == '') {
          logEvent(eventName, eventSource, textDelta=delta);
        } else {
          quill.setContents(oldDelta, 'silent');
        }
    } else {
      console.log('Ignore unknown change:', source, eventName);
    }

    if (isCounterEnabled == true) {
      updateCounter();
    }

  });
}

function trackSelectionChange(){
  // NOTE It's "silenced" when coincide with text-change
  quill.on('selection-change', function(range, oldRange, source) {
    if (range === null) {
      return;  // click outside of the editor
    } else if (source == 'silent'){
      return;
    } else {
      eventName = null;
      eventSource = sourceToEventSource(source);

      // Use prevCursorIndex instead of oldRange.index as oldRange is null at times
      if (range.length > 0){
        eventName = EventName.CURSOR_SELECT;
      } else if (range.index > prevCursorIndex) {
        eventName = EventName.CURSOR_FORWARD;
      } else if (range.index < prevCursorIndex) {
        eventName = EventName.CURSOR_BACKWARD;
      } else if (range.index == prevCursorIndex){
        // Deselect
        eventName = EventName.SKIP;
      } else {
        if (debug) {
          alert('Wrong selection-change handling!');
          console.log(range, oldRange, source);
        }
        eventName = EventName.SKIP;
      }

      logEvent(eventName, eventSource, textDelta='', cursorRange=range);
    }
  });
}

function setupEditorHumanOnly() {
  quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: 'Write something...',
    modules: {
      clipboard: {
        matchVisual: false,  // Prevent empty paragraph to be added
        matchers: [
						[
              Node.ELEMENT_NODE, function(node, delta) {
  							return delta.compose(new Delta().retain(delta.length(), {
                    color: false,
                    background: false,
                    bold: false,
                    strike: false,
                    underline: false
  							}));
						  }
						]
					]
      },
      toolbar: false
    }
  });

  trackTextChanges();
  trackSelectionChange();

  quill.focus();
}

function setupEditorMachineOnly() {
  let bindings = {
    tab: {
      key: 9,
      handler: function() {
      const type = getUrlParameter('type'); // 获取 URL 中的 type 参数
        if (type === 'a') {
            return;
        }
        logEvent(EventName.SUGGESTION_GET, EventSource.USER);
        queryGPT3();
      }
    },
    enter: {
      key: 13,
      handler: function() {
        let selectedItem = $('.sudo-hover');
        if (selectedItem.length > 0) {
          $(selectedItem).click();
        } else {
          return true;
        }
      }
    },
    f1: {
      key: 112, // Keycode for Control
      handler: function() {
        logEvent(EventName.SUGGESTION_GET, EventSource.USER);
        queryGPT4ForSuggestions();

      }
    }
  };

  quill = new Quill('#editor-container', {
    theme: 'snow',
    modules: {
      keyboard: {
        bindings: bindings
      },
      clipboard: {
        matchVisual: false,  // Prevent empty paragraph to be added
        matchers: [
						[
              Node.ELEMENT_NODE, function(node, delta) {
  							return delta.compose(new Delta().retain(delta.length(), {
                    color: false,
                    background: false,
                    bold: false,
                    strike: false,
                    underline: false
  							}));
						  }
						]
					]
      },
      toolbar: false
    }
  });

  // Prohibition of copying and pasting
  const editorElement = document.querySelector('#editor-container');
  editorElement.addEventListener('copy', function (e) {
    e.preventDefault();
    alert('Copy is disabled.');
  });
  editorElement.addEventListener('paste', function (e) {
    e.preventDefault();
    alert('Paste is disabled.');
  });

  trackTextChangesByMachineOnly();
  trackSelectionChange();

  quill.focus();
}

function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function setupEditor() {
  let bindings = {
    tab: {
      key: 9,
      handler: function() {
        logEvent(EventName.SUGGESTION_GET, EventSource.USER);
        const type = getUrlParameter('type'); // 获取 URL 中的 type 参数
        if (type === 'a') {
            return;
        }
        const text = quill.getText().trim(); // 获取编辑器的文本
        const wordCount = text.length > 0 ? text.split(/\s+/).filter(word => word.length > 0).length : 0;

        // 仅在 type 为 'c' 时检查字数
        if (type === 'c' && wordCount < 250) {
            alert("You must enter at least 250 words before requesting AI suggestions.");
            return;
        }

        queryGPT3();
      }
    },
    enter: {
      key: 13,
      handler: function() {
        let selectedItem = $('.sudo-hover');
        if (selectedItem.length > 0) {
          $(selectedItem).click();
        } else {
          return true;
        }
      }
    },
    f1: {
      key: 112, // Keycode for Control
      handler: function() {
        logEvent(EventName.SUGGESTION_GET, EventSource.USER);
        queryGPT4ForSuggestions();
      }
    }
  };

  quill = new Quill('#editor-container', {
    theme: 'snow',
    modules: {
      keyboard: {
        bindings: bindings
      },
      clipboard: {
        matchVisual: false,  // Prevent empty paragraph to be added
        matchers: [
						[
              Node.ELEMENT_NODE, function(node, delta) {
  							return delta.compose(new Delta().retain(delta.length(), {
                    color: false,
                    background: false,
                    bold: false,
                    strike: false,
                    underline: false
  							}));
						  }
						]
					]
      },
      toolbar: false
    }
  });
      // Function to update word count
    function updateWordCount() {
      // Get text content without trailing newline
      const text = quill.getText().trim();
      const wordCount = text.length > 0 ? text.split(/\s+/).filter(word => word.length > 0).length : 0;
      document.getElementById('word-count-value').textContent = wordCount;
    }

    // Listen for changes in the editor
    quill.on('text-change', function() {
      updateWordCount();
    });

    // Initialize word count on page load
    updateWordCount();

    // Prohibition of copying and pasting
  const editorElement = document.querySelector('#editor-container');
  editorElement.addEventListener('copy', function (e) {
    e.preventDefault();
    alert('Copy is disabled.');
  });
  editorElement.addEventListener('paste', function (e) {
    e.preventDefault();
    alert('Paste is disabled.');
  });

  trackTextChanges();
  trackSelectionChange();

  quill.focus();
}

/* Cursor */
function getCursorIndex() {
  let range = quill.getSelection();

  if (range) {
    if (range.length == 0) {
      prevCursorIndex = range.index;
      return range.index;
    } else {
      // For selection, return index of beginning of selection
        prevCursorIndex = range.index;
      return range.index; // Selection
    }
  } else {
    return prevCursorIndex; // Not in editor
  }
}

function setCursor(index) {
  // Adjust if index is outside of range
  let doc = quill.getText(0);
  let lastIndex = doc.length - 1;
  if (lastIndex < index) {
    index = lastIndex;
  }

  quill.setSelection(index);
  prevCursorIndex = index;
}

function setCursorAtTheEnd() {
  // If it's not triggerd by user's text insertion, and instead by api's
  // forced selection change, then it is saved as part of logs by selection-change
  let doc = quill.getText(0);
  let index = doc.length - 1; // The end of doc
  setCursor(index);
}

/* Text */
function getText() {
  let text = quill.getText(0);
  return text.substring(0, text.length - 1);  // Exclude trailing \n
}

function setText(text) {
  // NOTE Does not keep the formating
  quill.setText(text, 'api');
  setCursor(text.length);
}

function appendText(text) {
  let lastIndex = getText().length;

  // This action is automatically logged by text-change
  quill.insertText(lastIndex, text, { color: '#4169E1' });

  // By default, selection change due to text insertion is "silent"
  // and not saved as part of logs
  setCursorAtTheEnd();
  // 重置光标后的样式为默认颜色
  quill.format('color', null);

}
function showAlert(message) {
  const alertBox = document.getElementById('alert-box');
  const alertMessage = document.getElementById('alert-message');

  if (alertBox && alertMessage) {
    alertMessage.textContent = message; // Setting the message content
    alertBox.style.display = 'block'; // show alert
  } else {
    console.error("Alert box or message element not found");
  }
}
var hasUserStartedWriting = false; // Records whether the user has started typing

function trackTextChanges() {
  quill.on('text-change', function (delta, oldDelta, source) {
    if (source == 'silent') {
      return;
    } else {
      // Get the type in the URL parameter
      const type = getUrlParameter('type');

      // If type is ‘d’, listen for the first user input.
      if (type === 'd' && !hasUserStartedWriting) {
        const text = quill.getText().trim(); // get text
        if (text.length === 1) {
           alert("Press the Tab key to generate the first 250 words of your essay.");
           return
        } else {
          hasUserStartedWriting = true; // Marks that the user has started typing
        }
      }

      // Other logging
      eventName = null;
      eventSource = sourceToEventSource(source);
      ops = new Array();
      for (let i = 0; i < delta.ops.length; i++) {
        ops = ops.concat(Object.keys(delta.ops[i]));
      }
      if (ops.includes('insert')) {
        eventName = EventName.TEXT_INSERT;
      } else if (ops.includes('delete')) {
        eventName = EventName.TEXT_DELETE;
      } else {
        eventName = EventName.SKIP;
        console.log('Ignore format change');
      }
      logEvent(eventName, eventSource, textDelta = delta);

      if (isCounterEnabled == true) {
        updateCounter();
      }

      if (domain == 'template') {
        let currentTime = new Date();
        let elapsedTime = (currentTime - checkFormatLockTime) / 1000;
        if (elapsedTime > 1) {
          checkFormatLockTime = currentTime;
          formatNonTerminals();
        }
      }
    }
  });
}
