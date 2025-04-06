function emptyDropdownMenu() {
  $('#frontend-overlay').empty();
}


function openDropdownMenu(source, is_reopen=false) {
  if ($('#frontend-overlay').hasClass('hidden')){
    $('#frontend-overlay').removeClass('hidden');
  }

  if (is_reopen == true) {
    logEvent(EventName.SUGGESTION_REOPEN, source);
  } else {
    logEvent(EventName.SUGGESTION_OPEN, source);
  }
}


function hideDropdownMenu(source) {
  if ($('#frontend-overlay').length && !$('#frontend-overlay').hasClass('hidden')){
    $('#frontend-overlay').addClass('hidden');
    $('.sudo-hover').removeClass('sudo-hover');  // NOTE Do not delete; error
    logEvent(EventName.SUGGESTION_CLOSE, source);
  }
}

function selectDropdownItem(suggestion, range, type) {
  // Close dropdown menu after selecting new suggestion
  logEvent(EventName.SUGGESTION_SELECT, EventSource.USER);
  hideDropdownMenu(EventSource.API);
  if (type === 'grammar') {
    const text = quill.getText();

      if (range && range.length > 0) {
        // If there is a selection range, directly replace the contents of the selection range
        const rangeStart = range.index; // Start position of the selected range
        const rangeEnd = range.index + range.length; // End position of the selected range

        // Get the complete sentence in the selected range
        const leadingSpaces = findSentencesInRange(text, range);

        quill.deleteText(rangeStart, rangeStart + leadingSpaces.length); // Delete the contents of the selected range
        quill.insertText(rangeStart, suggestion, { color: '#4169E1' }); // Insert suggested text and retain leading spaces
        quill.setSelection(rangeStart + suggestion.length, 0); // Move the cursor to the end of the new sentence

      } else {
        // If no range is selected, replace the sentence where the cursor is located
        const cursorIndex = range.index;

        // Find the start of the current sentence
        let start = Math.max(
          text.lastIndexOf('.', cursorIndex - 1),
          text.lastIndexOf('?', cursorIndex - 1)
        ) + 1;

        // Retain the space before the start of the sentence
        while (start > 0 && text[start - 1] === ' ') {
          start--;
        }

        // Find the end of the current sentence
        const end = Math.min(
          text.indexOf('.', cursorIndex) === -1 ? text.length : text.indexOf('.', cursorIndex),
          text.indexOf('?', cursorIndex) === -1 ? text.length : text.indexOf('?', cursorIndex)
        ) + 1;

        // Get the space in front of the current sentence
        const leadingSpaces = text.slice(start, cursorIndex).match(/^\s*/)[0];

        // Replace the contents of the sentence where the cursor is located
        quill.deleteText(start, end - start); // Delete the current sentence
        quill.insertText(start, leadingSpaces + suggestion, { color: '#4169E1' }); // Insert new recommendations and retain spaces
        quill.setSelection(start + leadingSpaces.length + suggestion.length, 0); // Move the cursor to the end of the new sentence
      }

      // Style after resetting the cursor to the default colour
      quill.format('color', null);
  }
  else {
    appendText(' ' + suggestion);
  }




  // Do not empty for metaphor generation
  if (domain !== 'metaphor') {
    emptyDropdownMenu();
  }
}
// Extract complete sentences from the selected range
function findSentencesInRange(text, range) {
  const start = range.index; // Selected range start position
  const end = range.index + range.length; // Selection of the end position of the range

  // Forward to find the nearest full stop or question mark
  let sentenceStart = Math.max(
    text.lastIndexOf('.', start - 1),
    text.lastIndexOf('?', start - 1)
  ) + 1;

  // Look backward for the nearest full stop or question mark
  let sentenceEnd = Math.min(
    text.indexOf('.', end) === -1 ? text.length : text.indexOf('.', end),
    text.indexOf('?', end) === -1 ? text.length : text.indexOf('?', end)
  ) + 1;

  // Correct the scope to ensure that spaces and complete sentences are included
  sentenceStart = Math.max(sentenceStart, 0);
  sentenceEnd = Math.min(sentenceEnd, text.length);

  const extractedText = text.slice(sentenceStart, sentenceEnd).trim();
  console.log("Extracted range text:", extractedText);
  return extractedText;
}



function addToDropdownMenu(suggestion_with_probability
) {
  const { content, plainText, range, isOriginal } = suggestion_with_probability;
  let index = suggestion_with_probability['index'];
  let original = suggestion_with_probability['original'];
  let trimmed = suggestion_with_probability['trimmed'];
  let probability = suggestion_with_probability['probability'];
  let source = suggestion_with_probability['source'];  // Could be empty

  if (plainText && plainText.length > 0) {
      // Creating menu items
      const $menuItem = $('<div class="dropdown-item">')
        .text(content)
        .click(function () {
          selectDropdownItem(plainText, range, 'grammar'); // Use plainText when replacing
        })
        .mouseover(function () {
          logEvent(EventName.SUGGESTION_HOVER, EventSource.USER);
        });

      // Append to drop-down menu
      $('#frontend-overlay').append($menuItem);
  }
  else {
      // Hide empty string suggestions
      if (trimmed && trimmed.length > 0) {
        $('#frontend-overlay').append(function() {
          return $('<div class="dropdown-item" data-source="' + source + '">' + trimmed + '</div>').click(function(){
            currentHoverIndex = index;
            currentIndex = index;
            selectDropdownItem(original, range);
          }).mouseover(function(){
            currentHoverIndex = index;
            logEvent(EventName.SUGGESTION_HOVER, EventSource.USER);
          }).data('index', index).data('original', original).data('trimmed', trimmed).data('probability', probability).data('source', source);
        });
      }
  }



}

function reverse_sort_by_probability(a, b) {
  if (a.probability > b.probability ){
    return -1;
  }
  if (a.probability < b.probability){
    return 1;
  }
  return 0;
}

function addSuggestionsToDropdown(suggestions_with_probabilities, doc) {
  emptyDropdownMenu();

  // If doc is passed in, the original sentence and the first suggestion are processed
  if (doc && suggestions_with_probabilities && suggestions_with_probabilities.length > 0) {
    // Show original sentence
    addToDropdownMenu({
      content: `Original: ${doc}`, // Displayed content with prefix
      plainText: doc, // Actual content at the time of replacement
      isOriginal: true,
      range: suggestions_with_probabilities[0]?.range || null,
    });

    // Show first recommendation
    const firstSuggestion = suggestions_with_probabilities[0];
    addToDropdownMenu({
      content: `Revised: ${firstSuggestion.trimmed}`, // Displayed content with prefix
      plainText: firstSuggestion.trimmed, // Actual content at the time of replacement
      probability: firstSuggestion.probability,
      range: firstSuggestion.range,
      isOriginal: false,
    });
  } else {
    // If no doc is passed in, the original logic is followed
    if (sortSuggestions === true) {
      suggestions_with_probabilities.sort(reverse_sort_by_probability);
    }

    for (let i = 0; i < suggestions_with_probabilities.length; i++) {
        addToDropdownMenu(suggestions_with_probabilities[i]);
      }
  }

  // Update the global status of drop-down menu items
  items = $('.dropdown-item');
  numItems = items.length;
  currentIndex = 0;
}


function showDropdownMenu(source, is_reopen=false) {
  // Check if there are entries in the dropdown menu
  if ($('#frontend-overlay').children().length == 0) {
    if (is_reopen == true) {
        alert('You can only reopen suggestions when none of them was selected before. Please press tab key to get new suggestions instead!');
    } else {
        alert('No suggestions to be shown. Press tab key to get new suggestions!');
    }
    return;
  }
  else {
    // Compute offset
    let offsetTop = $('#editor-view').offset().top;
    let offsetLeft = $('#editor-view').offset().left;
    let offsetBottom = $('footer').offset().top;

    let position = quill.getBounds(getText().length);
    let top = offsetTop + position.top + 60 + 40;  // + Height of toolbar + line height
    let left = offsetLeft + position.left;

    // Fit frontend-overlay to the contents
    let maxWidth = 0;
    let totalHeight = 0;
    let finalWidth = 0;
    $(".dropdown-item").each(function(){
        width = $(this).outerWidth(true);
        height = $(this).outerHeight(true);

        if (width > maxWidth) {
          maxWidth = width;
        }
        totalHeight = totalHeight + height;
    });
    finalWidth = Math.min(maxWidth, $('#editor-view').outerWidth(true));

    let rightmost = left + maxWidth;
    let bottommost = top + totalHeight;

    let width_overflow = rightmost > $("#editor-view").width();
    // Push it left if it goes outside of the frontend
    if (width_overflow) {
      left = offsetLeft + 30;  // 30px for padding
    }

    // Decide whether or not to move up the dropdown
    const bodyHeight = $('body').outerHeight(true);
    let moveUpDropdown = false;

    if (bottommost < ($("#editor-view").height() + 100)) {  // If it doesn't go over footer, no need to move up
    } else {  // If it does go over footer, then see whether moving up is easier
      if (top > (bodyHeight / 2)){
        moveUpDropdown = true;
      }
    }

    if (moveUpDropdown) {
      console.log('$("#editor-view").height(): ' + $("#editor-view").height());
      console.log('top: ' + top);
      console.log('offsetTop: ' + offsetTop);
      console.log('totalHeight: ' + totalHeight);

      // Adjust height
      var maxHeight = top - 100;
      if (totalHeight > maxHeight) {
        totalHeight = maxHeight;
      }

      // Set top
      top = top - totalHeight - 60;

    } else {
      // Set top
      top = top;

      // Adjust height
      var maxHeight = $("#editor-view").height() - offsetTop - position.top + 60;
      if (maxHeight < 100) {
        maxHeight = 100;
      }

      if (totalHeight > maxHeight){
        totalHeight = maxHeight;
      }

    }

    // Set top and left
    $('#frontend-overlay').css({
      top: top,
      left: left,
      height: totalHeight,
    });


    // Auto-select the first suggestion
    if (domain != 'story') {
      $('#frontend-overlay > .dropdown-item').first().addClass('sudo-hover');
    }

    openDropdownMenu(source, is_reopen);
  }


}
