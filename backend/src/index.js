export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // Pagesデプロイ後はPagesのURLに絞るとセキュアです
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // A. メッセージ送信 API (POST /api/send)
    if (request.method === "POST" && url.pathname === "/api/send") {
      try {
        const { nickname, message, ttl } = await request.json();
        
        // ニックネーム未入力時のデフォルト値（フロントでも処理しますが念のため）
        const finalNickname = nickname.trim() === "" ? "名無しさん" : nickname;
        const finalTtl = parseInt(ttl, 10) || 3600; // デフォルト1時間

        if (!message) {
          return new Response("Missing message", { status: 400, headers: corsHeaders });
        }

        const now = Math.floor(Date.now() / 1000);
        const expiresAt = now + finalTtl; // ★送信時刻 + ユーザーが選んだ秒数 = 消滅時刻

        await env.DB.prepare(
          "INSERT INTO messages (nickname, message, created_at, expires_at) VALUES (?, ?, ?, ?)"
        )
        .bind(finalNickname, message, now, expiresAt)
        .run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(err.message, { status: 500, headers: corsHeaders });
      }
    }

    // B. メッセージ取得 API (GET /api/messages)
    if (request.method === "GET" && url.pathname === "/api/messages") {
      try {
        const now = Math.floor(Date.now() / 1000);

        // ★まだ消滅時間を迎えていない（expires_at > 現在時刻）メッセージだけを取得
        const { results } = await env.DB.prepare(
          "SELECT * FROM messages WHERE expires_at > ? ORDER BY created_at DESC LIMIT 100"
        )
        .bind(now)
        .all();

        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(err.message, { status: 500, headers: corsHeaders });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },

  // C. 定期実行による物理削除（Cron Trigger: 1分ごとに実行）
  async scheduled(event, env, ctx) {
    const now = Math.floor(Date.now() / 1000);

    // ★消滅時間を過ぎたレコードをデータベースから完全に削除
    await env.DB.prepare(
      "DELETE FROM messages WHERE expires_at < ?"
    )
    .bind(now)
    .run();

    console.log(`[Cron] 消滅期限が切れた古いログを掃除しました。`);
  },
};