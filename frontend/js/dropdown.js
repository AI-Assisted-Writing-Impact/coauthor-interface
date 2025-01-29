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
        // 如果有选中范围，直接替换选中范围内的内容
        const rangeStart = range.index; // 选中范围的起始位置
        const rangeEnd = range.index + range.length; // 选中范围的结束位置

        // 获取选中范围内的完整句子
        const leadingSpaces = findSentencesInRange(text, range);

        quill.deleteText(rangeStart, rangeStart + leadingSpaces.length); // 删除选中范围的内容
        quill.insertText(rangeStart, suggestion, { color: '#4169E1' }); // 插入建议文本并保留前导空格
        quill.setSelection(rangeStart + suggestion.length, 0); // 将光标移动到新句子末尾

      } else {
        // 如果没有选中范围，则替换光标所在的句子
        const cursorIndex = range.index;

        // 找到当前句子的起始位置
        let start = Math.max(
          text.lastIndexOf('.', cursorIndex - 1),
          text.lastIndexOf('?', cursorIndex - 1)
        ) + 1;

        // 保留句子起点之前的空格
        while (start > 0 && text[start - 1] === ' ') {
          start--;
        }

        // 找到当前句子的结束位置
        const end = Math.min(
          text.indexOf('.', cursorIndex) === -1 ? text.length : text.indexOf('.', cursorIndex),
          text.indexOf('?', cursorIndex) === -1 ? text.length : text.indexOf('?', cursorIndex)
        ) + 1;

        // 获取当前句子前面的空格
        const leadingSpaces = text.slice(start, cursorIndex).match(/^\s*/)[0];

        // 替换光标所在句子的内容
        quill.deleteText(start, end - start); // 删除当前句子
        quill.insertText(start, leadingSpaces + suggestion, { color: '#4169E1' }); // 插入新的建议并保留空格
        quill.setSelection(start + leadingSpaces.length + suggestion.length, 0); // 将光标移动到新句子末尾
      }

      // 重置光标后的样式为默认颜色
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
// 提取选中范围的完整句子
function findSentencesInRange(text, range) {
  const start = range.index; // 选中范围起始位置
  const end = range.index + range.length; // 选中范围结束位置

  // 向前查找最近的句号或问号
  let sentenceStart = Math.max(
    text.lastIndexOf('.', start - 1),
    text.lastIndexOf('?', start - 1)
  ) + 1;

  // 向后查找最近的句号或问号
  let sentenceEnd = Math.min(
    text.indexOf('.', end) === -1 ? text.length : text.indexOf('.', end),
    text.indexOf('?', end) === -1 ? text.length : text.indexOf('?', end)
  ) + 1;

  // 修正范围，确保包括空格和完整句子
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
      // 创建菜单项
      const $menuItem = $('<div class="dropdown-item">')
        .text(content)
        .click(function () {
          selectDropdownItem(plainText, range, 'grammar'); // 替换时使用 plainText
        })
        .mouseover(function () {
          logEvent(EventName.SUGGESTION_HOVER, EventSource.USER);
        });

      // 追加到下拉菜单
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

  // 如果传入了 doc，则处理原始句子和第一条建议
  if (doc && suggestions_with_probabilities && suggestions_with_probabilities.length > 0) {
    // 显示原始句子
    addToDropdownMenu({
      content: `Original: ${doc}`, // 显示的内容带前缀
      plainText: doc, // 替换时的实际内容
      isOriginal: true,
      range: suggestions_with_probabilities[0]?.range || null,
    });

    // 显示第一条建议
    const firstSuggestion = suggestions_with_probabilities[0];
    addToDropdownMenu({
      content: `Revised: ${firstSuggestion.trimmed}`, // 显示的内容带前缀
      plainText: firstSuggestion.trimmed, // 替换时的实际内容
      probability: firstSuggestion.probability,
      range: firstSuggestion.range,
      isOriginal: false,
    });
  } else {
    // 如果没有传入 doc，则按原始逻辑处理
    if (sortSuggestions === true) {
      suggestions_with_probabilities.sort(reverse_sort_by_probability);
    }

    for (let i = 0; i < suggestions_with_probabilities.length; i++) {
        addToDropdownMenu(suggestions_with_probabilities[i]);
      }
  }

  // 更新下拉菜单项的全局状态
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
