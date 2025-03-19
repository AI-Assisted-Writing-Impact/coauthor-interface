async function startSession(accessCode) {
  session = {};
  logs = [];
  try {
    session = await wwai.api.startSession(domain, accessCode);
    if (debug) {
      console.log(session);
    }
    if (session['status'] == FAILURE){
      alert(session['message']);
    } else {
      sessionId = session.session_id;
      example = session.example;
      exampleActualText = session.example_text; 
      promptText = session.prompt_text;

      setPrompt(promptText);
      startTimer(session.session_length);
      promptLength = promptText.length;  // Number of characters
    
      if (isCounterEnabled == true) {
        resetCounter();
      }

      setCtrl(
        session.n,
        session.max_tokens,
        session.temperature,
        session.top_p,
        session.presence_penalty,
        session.frequency_penalty,
      );

      stop = session.stop;
      engine = session.engine;
    }
  } catch(e) {
    alert('Start sesion error:' + e);
    console.log(e);
  } finally {
    updateCounter();
    stopBlinking();

    if (domain == 'demo') {
      hideLoadingSignal();
    }
  }
}

async function endSession() {
// 获取文本框的内容
  const storyText = document.getElementById("story-text").value;
  const results = await wwai.api.endSession(sessionId, logs, storyText);
  const verificationCode = results['verification_code'];

  $('#verification-code').removeClass('do-not-display');
  $('#verification-code').html('Verification code: ' + verificationCode);
}

async function endSessionWithReplay() {
  const results = await wwai.api.endSession(sessionId, logs);
  const verificationCode = results['verification_code'];
  // let replayLink = 'http://writingwithai-replay.glitch.me/?session_id=' + verificationCode;
  let replayLink = frontendURL + '/replay.html?session_id=' + verificationCode;

  if (domain == 'story') {
    // replayLink = 'http://writingwithai-replay-story.glitch.me/?session_id=' + verificationCode;
    replayLink = frontendURL + '/replay.html?session_id=' + verificationCode;
  }

  $('#verification-code').removeClass('do-not-display');
  $('#verification-code').html('<a href="' + replayLink + '" target="_blank">' + replayLink + '</a>');
}

const delay = ms => new Promise(res => setTimeout(res, ms));
var prevEventName = '';

async function replay(replayLogs, start){
  emptyDropdownMenu();
  quill.setText('');

  // Show query count
  $queryCurrent = $('#query-current');
  $queryTotal = $('#query-total');

  var queryCnt = 0;
  var queryTotal = 0;
  for (i = 0; i < replayLogs.length; i++) {
    if (replayLogs[i].eventName == EventName.SUGGESTION_GET) {
      queryTotal = queryTotal + 1;
    }
  }
  $queryCurrent.html(queryCnt);
  $queryTotal.html(queryTotal);

  // Show selection count
  $selectedCurrent = $('#selected-current');
  $selectedTotal = $('#selected-total');

  var selectedCnt = 0;
  var selectedTotal = 0;
  for (i = 0; i < replayLogs.length; i++) {
    if (replayLogs[i].eventName == EventName.SUGGESTION_SELECT) {
      selectedTotal = selectedTotal + 1;
    }
  }
  $selectedCurrent.html(selectedCnt);
  $selectedTotal.html(selectedTotal);

  // Show log count
  $logCurrent = $('#log-current');
  $logTotal = $('#log-total');

  var logCurrent = parseInt(start);

  $logCurrent.html(logCurrent);
  $logTotal.html(replayLogs.length + logCurrent - 1);

  // Show time elapse
  var timeOffset = replayLogs[0].eventTimestamp;
  var totalTime = (replayLogs[replayLogs.length - 1].eventTimestamp - timeOffset) / 1000;
  var elapsedTime = 0;

  var minutes = Math.floor(totalTime / 60).toString();
  var seconds = Math.floor(totalTime % 60).toString();
  if (minutes.length == 1) {
    minutes = '0' + minutes;
  }
  if (seconds.length == 1) {
    seconds = '0' + seconds;
  }

  $timeElapsed = $('#time-elapsed');
  $timeTotal = $('#time-total');

  $timeTotal.html(minutes + ':' + seconds);

  // If start is specified, initialize with currentDoc of the start log
  if (logCurrent > 0){
    setText(replayLogs[0].currentDoc);
    setCursor(replayLogs[0].currentCursor);
  }

  for (var i = 0; i < replayLogs.length; i++) {
    $logCurrent.html(logCurrent);
    logCurrent = logCurrent + 1;

    var logTime = replayLogs[i].eventTimestamp - timeOffset;
    timeOffset = replayLogs[i].eventTimestamp;

    elapsedTime += logTime;
    minutes = Math.floor(elapsedTime / 1000 / 60).toString();
    seconds = Math.floor(elapsedTime / 1000 % 60).toString();
    if (minutes.length == 1) {
      minutes = '0' + minutes;
    }
    if (seconds.length == 1) {
      seconds = '0' + seconds;
    }
    $timeElapsed.html(minutes + ':' + seconds);

    if (ReplayableEvents.includes(prevEventName)) {
      await delay(replayTime);
    }

    showLog(replayLogs[i]);

    // if (replayLogs[i].eventName == EventName.SYSTEM_INITIALIZE){
    //   await delay(10000); // NOTE Delete; for recording;
    // }

    // if (replayLogs[i].eventName == EventName.SUGGESTION_OPEN) {
    //   await delay(slowDownSuggestionTime);
    // }

    var prevEventName = replayLogs[i].eventName;
    var replayTime = Math.min(logTime / speedUpReplayTime, maximumElapsedTime);

    if (replayLogs[i].eventName == EventName.SUGGESTION_GET) {
      queryCnt += 1;
      $queryCurrent.html(queryCnt);
    }
    else if (replayLogs[i].eventName == EventName.SUGGESTION_SELECT) {
      selectedCnt += 1;
      $selectedCurrent.html(selectedCnt);
    }
  }

}

async function replayLogsWithSessionId(sessionId, range){
  try {
    results = await wwai.api.getLog(sessionId);

    let start = parseInt(range['start']);
    let end = parseInt(range['end']);
    if (end < 0){
      end = results['logs'].length;
    }
    replayLogs = results['logs'].slice(start, end + 1);

    await replay(replayLogs, start);

  } catch (e) {
    const message = 'We could not get the requested writing session (' + sessionId + ') '
                    + 'due to a server error or an invalid session ID.\n\n'
                    + 'Please notify the issue to ' + contactEmail + ' '
                    + 'and try again later.';
    setText(message);
    $('#editor-view').addClass('error');
    return;
  }
}

async function showFinalStoryWithSessionId(sessionId){
  console.log('Final mode: logs with session ID: ' + sessionId);
  try {
    results = await wwai.api.getLog(sessionId);
  } catch (e) {
    alert('Could not find logs for the given session ID: ' + sessionId + '\n\n' + e);
    return;
  }

  if (results['status'] == FAILURE) {
    alert(results['message']);
    return;
  }

  replayLogs = results['logs'];

  lastLog = replayLogs[replayLogs.length - 1];
  quill.setText(lastLog.currentDoc);
  quill.setSelection(lastLog.currentCursor);
}

async function loadLogsWithSessionId(newSessionId){
  try {
    results = await wwai.api.getLog(newSessionId);

    // Overwrite all settings with the ones from the logs
    config = results['config'];

    console.log('change sessionId from ' + sessionId + ' to ' + newSessionId);
    sessionId = newSessionId;
    example = config['example'];
    promptText = config['promptText'];
    if (promptText) {
      promptLength = promptText.length;
    } else {
      promptLength = 0;
    }

    setCtrl(
      config['n'],
      config['max_tokens'],
      config['temperature'],
      config['top_p'],
      config['presence_penalty'],
      config['frequency_penalty'],
    );
    stop = config['stop'];
    engine = config['engine'];

    // Overwrite the current logs with loaded logs
    loadedLogs = results['logs'];
    logs = loadedLogs;

    // Set the text editor to be the last state in the log
    const lastText = results['last_text'];
    const lastIndex = loadedLogs[results['logs'].length - 1]['currentCursor'];
    quill.setText(lastText, 'silent');
    quill.setSelection(lastIndex, 'silent');

    $('#editor-view-overlay').addClass('do-not-display');
    $('#start-btn').addClass('do-not-display');
    $('#load-btn').addClass('do-not-display');
    $('#save-btn').removeClass('do-not-display');
  } catch (e) {
    const message = 'We could not get the requested writing session (' + sessionId + ') '
                    + 'due to a server error or an invalid session ID.\n\n'
                    + e + '\n\n'
                    + 'Please notify the issue to ' + contactEmail + ' '
                    + 'and try again later.';
    alert(message);
    return;
  } finally {
    if (domain == 'reedsy') {
      hideLoadingSignal();
    }
  }
}

async function saveLogs() {
  try {
    results = await wwai.api.saveLog();
  } catch (e) {
    alert(e);
  } finally {
    if (domain == 'reedsy') {
      hideLoadingSignal();
      alert('Saved the current writing session!');
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
// Query
////////////////////////////////////////////////////////////////////////////////

function getDataForQuery(doc, exampleText) {
  const data = {
    'session_id': sessionId,
    'domain': domain,
    'example': example,
    'example_text': exampleText, // $('#exampleTextarea').val()

    'doc': doc,

    'n': $("#ctrl-n").val(),
    'max_tokens': $("#ctrl-max_tokens").val(),
    'temperature': $("#ctrl-temperature").val(),
    'top_p': $("#ctrl-top_p").val(),
    'presence_penalty': $("#ctrl-presence_penalty").val(),
    'frequency_penalty': $("#ctrl-frequency_penalty").val(),
    'stop': stop,

    'engine': engine,

    'suggestions': getSuggestionState(),
  };

  return data;
}

function queryGPT3() {
  const doc = getText();
  const exampleText = exampleActualText;
  // 定义 instructions 和 prompt
  const instructions = `In this task, you will write two essays in response to two different prompts. Please follow these guidelines:
Write naturally and spontaneously, and avoid overthinking or making the writing overly formal.
Each essay should be at least 500 words.
Do not use any editing tools, grammar checkers, or other external resources to assist your writing.
Spend no more than 40 minutes per essay.
You will see each prompt one at a time. Once you finish the first essay, you will proceed to the second prompt.`;

  const prompt = `Everyone’s on social media these days, but does it actually help people stay connected, or does it just make us feel more alone? What’s your take on it? Have you noticed a difference in your own friendships?`;

  // 创建 data 对象
  const data = getDataForQuery(doc, exampleText);
  data.instructions = instructions; // 添加 instructions
  data.prompt = prompt; // 添加 prompt
  let type = getType();
  data.type = type;

  $.ajax({
    url: serverURL + '/api/query',
    beforeSend: function() {
      hideDropdownMenu(EventSource.API);
      setCursorAtTheEnd();
      showLoadingSignal('Getting suggestions...');
    },
    type: 'POST',
    dataType: 'json',
    data: JSON.stringify(data),
    crossDomain: true,
    contentType: 'application/json; charset=utf-8',
    success: function(data) {
      hideLoadingSignal();
      if (data.status == SUCCESS) {
        if (data.original_suggestions.length > 0) {
          originalSuggestions = data.original_suggestions;
        } else {
          originalSuggestions = [];
        }

        if (data.suggestions_with_probabilities.length > 0) {
          addSuggestionsToDropdown(data.suggestions_with_probabilities);
          showDropdownMenu('api');
        } else {
          let msg = 'Please try again!\n\n'
                    + 'Why is this happening? The system\n'
                    + '- could not think of suggestions (' + data.counts.empty_cnt + ')\n'
                    + '- generated same suggestions as before (' + data.counts.duplicate_cnt + ')\n'
                    + '- generated suggestions that contained banned words (' + data.counts.bad_cnt + ')\n';
          console.log(msg);

          logEvent(EventName.SUGGESTION_FAIL, EventSource.API, textDelta=msg);
          alert("The system could not generate suggestions. Please try again.");
        }

      } else {
        alert(data.message);
      }
    },
    error: function() {
      hideLoadingSignal();
      alert("Could not get suggestions. Press tab key to try again! If the problem persists, please send a screenshot of this message to " + contactEmail + ". Our sincere apologies for the inconvenience!");
    }
  });
}

function queryGPT4ForSuggestions() {
  const range = quill.getSelection(); // 获取选中范围或光标位置
  if (!range) {
    alert("Please place the cursor in the sentence or select text to check the grammar.");
    return;
  }

  const text = quill.getText(); // 获取编辑器的全文
  let doc = ""; // 用于存储最终提取的文本

  if (range.length > 0) {
    // 用户选中了一段范围，提取范围内完整的句子
    doc = findSentencesInRange(text, range);
    console.log("Selected range detected. Extracted text:", doc);
  } else {
    // 用户没有选中范围，使用光标所在句子的提取逻辑
    const cursorIndex = range.index;
    const { start, end } = findSentenceBoundary(text, cursorIndex);
    doc = text.slice(start, end).trim();
    console.log("Cursor detected. Extracted sentence:", doc);
  }

  // 检查提取的文本是否有效
  if (!doc) {
    alert("No sentence or text found for processing.");
    return;
  }

  const instructions = `In this task, you will write two essays in response to two different prompts. Please follow these guidelines:
Write naturally and spontaneously, and avoid overthinking or making the writing overly formal.
Each essay should be at least 500 words.
Do not use any editing tools, grammar checkers, or other external resources to assist your writing.
Spend no more than 40 minutes per essay.
You will see each prompt one at a time. Once you finish the first essay, you will proceed to the second prompt.`;

  const prompt = `Everyone’s on social media these days, but does it actually help people stay connected, or does it just make us feel more alone? What’s your take on it? Have you noticed a difference in your own friendships?`;

  // 创建 data 对象
  const data = getDataForQuery(doc, text);
  data.instructions = instructions; // 添加 instructions
  data.prompt = prompt; // 添加 prompt
  data.type = 'grammar';

  // 发送 AJAX 请求
  $.ajax({
    url: serverURL + '/api/query',
    beforeSend: function () {
      hideDropdownMenu(EventSource.API);
      setCursorAtTheEnd();
      showLoadingSignal('Getting suggestions...');
    },
    type: 'POST',
    dataType: 'json',
    data: JSON.stringify(data),
    crossDomain: true,
    contentType: 'application/json; charset=utf-8',
    success: function (data) {
      hideLoadingSignal();
      if (data.status == SUCCESS) {
        if (data.suggestions_with_probabilities.length > 0) {
          const updatedSuggestions = data.suggestions_with_probabilities.map((suggestion) => ({
            ...suggestion,
            range: range, // 将 range 添加到每个 suggestion 中
          }));
          addSuggestionsToDropdown(updatedSuggestions, doc);
          showDropdownMenu('api');
        } else {
          let msg = 'Please try again!\n\n'
            + 'Why is this happening? The system\n'
            + '- could not think of suggestions (' + data.counts.empty_cnt + ')\n'
            + '- generated same suggestions as before (' + data.counts.duplicate_cnt + ')\n'
            + '- generated suggestions that contained banned words (' + data.counts.bad_cnt + ')\n';
          console.log(msg);

          logEvent(EventName.SUGGESTION_FAIL, EventSource.API, textDelta = msg);
          alert("The system could not generate suggestions. Please try again.");
        }
      } else {
        alert(data.message);
      }
    },
    error: function () {
      hideLoadingSignal();
      alert("Could not get suggestions. Press tab key to try again! If the problem persists, please send a screenshot of this message to " + contactEmail + ". Our sincere apologies for the inconvenience!");
    },
  });
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

// 提取光标所在句子的边界
function findSentenceBoundary(text, cursorIndex) {
  const lastPeriod = text.lastIndexOf('.', cursorIndex - 1);
  const lastQuestionMark = text.lastIndexOf('?', cursorIndex - 1);
  const start = Math.max(lastPeriod, lastQuestionMark) + 1 || 0;

  const nextPeriod = text.indexOf('.', cursorIndex);
  const nextQuestionMark = text.indexOf('?', cursorIndex);
  const endCandidates = [
    nextPeriod === -1 ? text.length : nextPeriod,
    nextQuestionMark === -1 ? text.length : nextQuestionMark,
  ];
  const end = Math.min(...endCandidates);

  return {
    start,
    end: end !== -1 ? end + 1 : text.length,
  };
}
