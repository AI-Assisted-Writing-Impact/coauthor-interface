function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}
document.addEventListener("DOMContentLoaded", function () {
    console.log("Document loaded. Initializing test editor...");

    const type = getUrlParameter('type'); // 获取 URL 中的 type 参数

    // 根据 type 参数显示或隐藏特定的功能
      if (type === 'a') {
        $('#suggestion').hide(); // 隐藏 suggestion
        $('#grammar').show();    // 显示 grammar
        $('#tab').hide(); // 隐藏 suggestion
        $('#F1').show();    // 显示 grammar
      } else if (type === 'b' || type === 'c' || type === 'd'|| type === 'f') {
        $('#suggestion').show(); // 显示 suggestion
        $('#grammar').hide();    // 隐藏 grammar
         $('#F1').hide(); // 隐藏 suggestion
        $('#tab').show();    // 显示 grammar
      } else if (type === 'e') {
        $('#shortcuts').hide();
      }


    // 初始化 Quill
    const quill = new Quill("#editor-container", {
        theme: "snow",
        placeholder: "Start writing here...",
        modules: {
          toolbar: false
        }
    });

    let aiRequested = false;  // 确保用户触发 AI
    let aiAccepted = false;   // 确保用户选择 AI 生成的文本

    // 隐藏 "Test completed" 消息
    document.getElementById("status-message").style.display = "none";
    document.getElementById("next-page-btn").style.display = "none";

    // 模拟 AI 生成的建议
    const fakeSuggestions = [
        "This is a test suggestion.",
        "Another possible completion.",
        "Try this sentence instead.",
        "An alternative phrasing for your text.",
        "Here’s a different way to express that idea."
    ];

    // 监听 Tab 和 F1 键，模拟 AI 交互
    document.addEventListener("keydown", function (event) {
        if (type === 'a' && event.key === "F1") {
            // Type A: 监听 F1
            event.preventDefault();
            if (!aiRequested) {
                aiRequested = true;
                showFakeSuggestions(true); // 传递 isGrammar=true
            }
        } else if (event.key === "Tab") {
            // 其他类型: 监听 Tab
            event.preventDefault();
            if (!aiRequested) {
                aiRequested = true;
                showFakeSuggestions(false); // 传递 isGrammar=false
            }
        }
    });

    // 显示模拟 AI 生成的建议
    function showFakeSuggestions(isGrammar) {
        const overlay = document.getElementById("frontend-overlay");
        overlay.innerHTML = ""; // 清空现有内容
        overlay.classList.remove("hidden");

        // 生成建议
        const fakeSuggestions1 = [
            "This is a test suggestion.",
            "Another possible completion.",
            "Try this sentence instead.",
            "An alternative phrasing for your text.",
            "Here’s a different way to express that idea."
        ];
        const fakeSuggestions2 = [
            "Original: Some text.",
            "Revised: Some text get fixed by Chatgpt.",
        ];
        if (type === 'a') {
            fakeSuggestions2.forEach((suggestion, index) => {
                const item = document.createElement("div");
                item.classList.add("dropdown-item");
                item.textContent = suggestion;
                item.addEventListener("click", function () {
                    insertSuggestion(suggestion);
                });
                overlay.appendChild(item);
            });
        }
        else {
            fakeSuggestions1.forEach((suggestion, index) => {
                const item = document.createElement("div");
                item.classList.add("dropdown-item");
                item.textContent = suggestion;
                item.addEventListener("click", function () {
                    insertSuggestion(suggestion);
                });
                overlay.appendChild(item);
            });
        }


        // 计算正确的显示位置
        positionDropdownMenu();
    }
    function positionDropdownMenu() {
        // 检查是否有建议
        if ($('#frontend-overlay').children().length === 0) {
            alert('No suggestions to be shown. Press tab key to get new suggestions!');
            return;
        }

        // 获取偏移量
        let offsetTop = $('#editor-view').offset().top;
        let offsetLeft = $('#editor-view').offset().left;
        let offsetBottom = $('footer').offset().top;

        let position = quill.getBounds(0);
        let top = offsetTop + position.top + 60 + 40;  // + Toolbar 高度 + 行高
        let left = offsetLeft + position.left;

        // 计算最大宽度和总高度
        let maxWidth = 0;
        let totalHeight = 0;
        $(".dropdown-item").each(function () {
            let width = $(this).outerWidth(true);
            let height = $(this).outerHeight(true);

            if (width > maxWidth) {
                maxWidth = width;
            }
            totalHeight += height;
        });

        let finalWidth = Math.min(maxWidth, $('#editor-view').outerWidth(true));
        let rightmost = left + maxWidth;
        let bottommost = top + totalHeight;

        let width_overflow = rightmost > $("#editor-view").width();

        // 如果超出右侧边界，调整左偏移量
        if (width_overflow) {
            left = offsetLeft + 30;  // 30px padding
        }

        // 计算是否需要向上移动
        const bodyHeight = $('body').outerHeight(true);
        let moveUpDropdown = false;

        if (bottommost >= ($("#editor-view").height() + 100)) {
            if (top > (bodyHeight / 2)) {
                moveUpDropdown = true;
            }
        }

        if (moveUpDropdown) {
            let maxHeight = top - 100;
            if (totalHeight > maxHeight) {
                totalHeight = maxHeight;
            }
            top = top - totalHeight - 60;
        } else {
            let maxHeight = $("#editor-view").height() - offsetTop - position.top + 60;
            if (maxHeight < 100) {
                maxHeight = 100;
            }
            if (totalHeight > maxHeight) {
                totalHeight = maxHeight;
            }
        }

        // 应用样式
        $('#frontend-overlay').css({
            top: top,
            left: left,
            height: totalHeight,
        });

        // 自动选择第一项
        $('#frontend-overlay > .dropdown-item').first().addClass('sudo-hover');
    }



    // 插入用户选择的 AI 建议
    function insertSuggestion(text) {
        if (!aiRequested) return; // 只有按了 Tab 才能插入

        quill.insertText(quill.getLength(), " " + text);
        aiAccepted = true;
        document.getElementById("frontend-overlay").classList.add("hidden");
        checkTestCompletion();
    }

    function checkTestCompletion() {
        if (aiRequested && aiAccepted) {
            document.getElementById("status-message").style.display = "block";
            document.getElementById("next-page-btn").style.display = "inline-block";
        }
    }

    document.getElementById("next-page-btn").addEventListener("click", function () {
        window.location.href = "index.html?access_code=demo&type=" + type;
    });
});
