import sql from "@/app/api/utils/sql";
import { jwtVerify } from "jose";

async function getSessionFromAuthHeader(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
      const { payload } = await jwtVerify(token, secret);
      if (payload?.sub) {
        return { user: { id: parseInt(payload.sub), email: payload.email, name: payload.name } };
      }
    } catch (e) {
      console.error("JWT verify failed:", e);
    }
  }
  return null;
}

async function generateTitleFromVideo(videoUrl) {
  try {
    if (process.env.ASSEMBLYAI_API_KEY && videoUrl) {
      const createRes = await fetch("https://api.assemblyai.com/v2/transcript", {
        method: "POST",
        headers: { Authorization: process.env.ASSEMBLYAI_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ audio_url: videoUrl }),
      });
      const created = await createRes.json();
      if (!createRes.ok || !created.id) throw new Error("failed to create transcript");
      const started = Date.now();
      while (Date.now() - started < 20000) {
        await new Promise((r) => setTimeout(r, 1500));
        const statusRes = await fetch(`https://api.assemblyai.com/v2/transcript/${created.id}`, {
          headers: { Authorization: process.env.ASSEMBLYAI_API_KEY },
        });
        const status = await statusRes.json();
        if (status.status === "completed" && status.text) {
          const words = status.text.trim().split(/\s+/).slice(0, 6).join(" ");
          return words || "Video Ask";
        }
        if (status.status === "error") break;
      }
    }
  } catch (e) {
    console.error("Transcription error:", e);
  }
  return "Video Ask";
}

export async function POST(request, { params }) {
  try {
    const session = await getSessionFromAuthHeader(request);
    if (!session?.user?.id) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const { id } = params;
    const body = await request.json();
    let { title, description, video_url, button_order } = body;
    if (!video_url) {
      return Response.json({ error: "Video URL is required" }, { status: 400 });
    }
    const [card] = await sql("SELECT user_id FROM cards WHERE id = $1", [id]);
    if (!card) return Response.json({ error: "Card not found" }, { status: 404 });
    if (card.user_id !== session.user.id) return Response.json({ error: "Unauthorized" }, { status: 403 });

    if (!title || !title.trim()) {
      title = await generateTitleFromVideo(video_url);
    }

    const [ask] = await sql(
      `INSERT INTO card_asks (card_id, title, description, video_url, button_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, title, description || null, video_url, button_order || 0]
    );

    return Response.json({ ask });
  } catch (e) {
    console.error("Error creating ask auto:", e);
    return Response.json({ error: "Failed to create ask" }, { status: 500 });
  }
}