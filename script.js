    document.addEventListener('DOMContentLoaded', () => {
    // -----------------------------------------------------
    // HTML要素の取得
    // -----------------------------------------------------
    const messageList = document.getElementById('message-list');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatContainer = document.querySelector('.chat-container'); // ドラッグ対象の要素

    // 初期位置を中央に設定
    const initialLeft = (window.innerWidth - chatContainer.offsetWidth) / 2;
    const initialTop = (window.innerHeight - chatContainer.offsetHeight) / 2;
    chatContainer.style.left = `${initialLeft}px`;
    chatContainer.style.top = `${initialTop}px`;

    // -----------------------------------------------------
    // 定数と変数
    // -----------------------------------------------------
    // ★★★ あなたのCloudflare WorkersのURLに置き換えてください ★★★
    const API_ENDPOINT = 'https://black-mud-382d.corsicajp.workers.dev/'; 

    let isLoading = false; // APIリクエスト中のローディング状態
    
    // ドラッグ関連の変数
    let isDragging = false; // ドラッグ中かどうか
    let offsetX, offsetY;   // マウスと要素の左上隅との相対位置

    // -----------------------------------------------------
    // ヘルパー関数
    // -----------------------------------------------------

    /**
     * メッセージをチャットリストに追加する関数
     * @param {string} type - 'user' または 'ai'
     * @param {string} text - 表示するメッセージテキスト
     */
    function addMessage(type, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', type);
        messageDiv.textContent = text;
        messageList.appendChild(messageDiv);
        // 最新のメッセージが見えるようにスクロール
        messageList.scrollTop = messageList.scrollHeight;
    }

    /**
     * ローディング表示を切り替える関数
     * @param {boolean} show - trueで表示、falseで非表示
     */
    function toggleLoading(show) {
        isLoading = show;
        userInput.disabled = show;   // 入力フィールドを無効/有効化
        sendButton.disabled = show;  // 送信ボタンを無効/有効化

        if (show) {
            const loadingDiv = document.createElement('div');
            loadingDiv.classList.add('loading-message');
            loadingDiv.id = 'loading-indicator'; // 後で削除するためにIDを設定
            loadingDiv.textContent = 'AIが思考中...';
            messageList.appendChild(loadingDiv);
            messageList.scrollTop = messageList.scrollHeight; // スクロール
        } else {
            const loadingDiv = document.getElementById('loading-indicator');
            if (loadingDiv) {
                messageList.removeChild(loadingDiv);
            }
        }
    }

    // -----------------------------------------------------
    // メッセージ送信ロジック
    // -----------------------------------------------------

    /**
     * メッセージを送信し、APIから回答を取得する非同期関数
     */
    async function sendMessage() {
        const question = userInput.value.trim();
        if (question === '') {
            return; // 入力が空の場合は何もしない
        }

        addMessage('user', question); // ユーザーのメッセージをUIに追加
        userInput.value = '';        // 入力フィールドをクリア

        toggleLoading(true); // ローディング開始

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question: question }), // 質問をJSON形式で送信
            });

            if (!response.ok) {
                // HTTPステータスが2xx以外の場合
                const errorText = await response.text(); 
                // エラーテキストが長すぎる場合を考慮して切り詰める
                const truncatedError = errorText.substring(0, 500) + (errorText.length > 500 ? '...' : '');
                throw new Error(`API Error: ${response.status} ${response.statusText} - ${truncatedError}`);
            }

            const data = await response.json(); // レスポンスをJSONとしてパース
            
            if (data.answer) {
                addMessage('ai', data.answer); // AIの回答をUIに追加
            } else {
                addMessage('ai', '回答が得られませんでした。'); // 回答がない場合
            }
        } catch (error) {
            console.error('Failed to fetch AI answer:', error);
            addMessage('ai', `エラーが発生しました: ${error.message}`); // エラーメッセージをUIに表示
        } finally {
            toggleLoading(false); // ローディング終了
        }
    }

    // -----------------------------------------------------
    // イベントリスナーの設定
    // -----------------------------------------------------

    // 送信ボタンのクリックイベント
    sendButton.addEventListener('click', sendMessage);

    // 入力フィールドでのEnterキー押下イベント
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !isLoading) {
            sendMessage();
        }
    });

    // -----------------------------------------------------
    // ドラッグ機能の実装
    // -----------------------------------------------------

    // ドラッグ開始（マウスダウン）イベント
    chatContainer.addEventListener('mousedown', (e) => {
        // マウスの左ボタン (button === 0) がクリックされた場合のみドラッグを開始
        if (e.button === 0) {
            isDragging = true;
            chatContainer.style.cursor = 'grabbing'; // ドラッグ中のカーソル
            
            // マウスの現在位置と要素の現在の左上隅との相対的なオフセットを計算
            offsetX = e.clientX - chatContainer.offsetLeft;
            offsetY = e.clientY - chatContainer.offsetTop;

            // ドラッグ中にテキストが選択されるのを防止
            e.preventDefault(); 
        }
    });

    // ドラッグ中（マウスムーブ）イベント
    // documentにイベントリスナーを設定することで、マウスが要素の外に出てもドラッグを継続できる
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return; // ドラッグ中でなければ何もしない

        // 新しい要素の位置を計算
        // マウスの現在のX/Y座標から、オフセットを引く
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;

        // オプション: ウィンドウの端からはみ出さないように制限
        const maxX = window.innerWidth - chatContainer.offsetWidth;
        const maxY = window.innerHeight - chatContainer.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxX));
        newTop = Math.max(0, Math.min(newTop, maxY));

        // 要素のCSSのleftとtopプロパティを更新して位置を移動
        chatContainer.style.left = newLeft + 'px';
        chatContainer.style.top = newTop + 'px';
    });

    // ドラッグ終了（マウスアップ）イベント
    // documentにイベントリスナーを設定することで、要素の外でマウスボタンを離してもドラッグを終了できる
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false; // ドラッグ状態を終了
            chatContainer.style.cursor = 'grab'; // カーソルを元に戻す
        }
    });
});