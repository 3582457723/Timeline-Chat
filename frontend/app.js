// ★デプロイしたWorkersのURLに書き換えてください（末尾にスラッシュは不要）
const API_BASE_URL = "timeline-chat.y20183033.workers.dev";

const messagesContainer = document.getElementById("messages");
const nicknameInput = document.getElementById("nickname");
const ttlSelect = document.getElementById("ttl-select");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("send-btn");

// 1. メッセージを取得して画面に描画する関数
async function fetchMessages() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/messages`);
        if (!response.ok) throw new Error("メッセージの取得に失敗しました");
        
        const data = await response.json();
        
        // ログが空の場合
        if (data.length === 0) {
            messagesContainer.innerHTML = '<div class="system-msg">メッセージはありません。最初のチャットを投稿しよう！</div>';
            return;
        }

        // 新しい順（または古い順）に並び替えてHTMLを生成
        // D1からは降順で取得しているので、チャットらしく下に向かって進むように reverse() しています
        messagesContainer.innerHTML = data.reverse().map(msg => {
            // 時刻のフォーマット (HH:MM:SS)
            const time = new Date(msg.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return `
                <div class="msg-box">
                    <span class="msg-time">[${time}]</span>
                    <strong class="msg-nickname">${escapeHTML(msg.nickname)}</strong>: 
                    <span class="msg-text">${escapeHTML(msg.message)}</span>
                </div>
            `;
        }).join("");

        // 最下部までスクロール
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    } catch (error) {
        console.error("Error:", error);
    }
}

// 2. メッセージを送信する関数
async function sendMessage() {
    const nickname = nicknameInput.value.trim() || "名無しさん";
    const message = messageInput.value.trim();
    const ttl = ttlSelect.value;

    if (!message) return; // 空文字なら送信しない

    // 連打防止のために一時的に無効化
    sendBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ nickname, message, ttl }),
        });

        if (response.ok) {
            messageInput.value = ""; // 入力欄をクリア
            await fetchMessages(); // 画面を更新
        } else {
            alert("送信に失敗しました");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("通信エラーが発生しました");
    } finally {
        sendBtn.disabled = false;
    }
}

// XSS対策（セキュリティのためのエスケープ処理）
function escapeHTML(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 3. イベントリスナーの設定
sendBtn.addEventListener("click", sendMessage);

// Enterキーでも送信できるようにする
messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendMessage();
    }
});

// 4. 定期的な画面更新（3秒ごとに自動で新着メッセージを取得）
fetchMessages();
setInterval(fetchMessages, 10);