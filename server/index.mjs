import "./load-env.mjs";
import { createServer } from "node:http";

const PORT = Number(process.env.API_PROXY_PORT || 8787);
const AI_API_URL = process.env.AI_API_URL || "https://ai.iteacher-alex.org/ai";
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || "openai/gpt-oss-20b:fireworks-ai";

const defaultCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...defaultCorsHeaders,
  });
  res.end(JSON.stringify(payload));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

const isOpenAICompatibleUrl = (url) =>
  url.includes("router.huggingface.co") ||
  url.includes("/v1") ||
  url.includes("openai.com");

const toOpenAICompatiblePayload = (payload) => {
  const historyMessages = Array.isArray(payload.history) ? payload.history : [];
  const normalizedHistory = historyMessages
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const role = item.role || item.type || "user";
      const content = item.content || item.text || "";

      if (!content) {
        return null;
      }

      return { role, content };
    })
    .filter(Boolean);

  const messages = [
    ...(payload.system ? [{ role: "system", content: payload.system }] : []),
    ...normalizedHistory,
    ...(payload.prompt ? [{ role: "user", content: payload.prompt }] : []),
  ];

  return {
    model: AI_MODEL,
    messages,
    max_tokens: payload.max_output_tokens || 4000,
    temperature: 0.7,
  };
};

const normalizeOpenAICompatibleResponse = async (upstreamResponse) => {
  const text = await upstreamResponse.text();

  if (!upstreamResponse.ok) {
    return {
      status: upstreamResponse.status,
      body: text,
      contentType:
        upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8",
    };
  }

  try {
    const parsed = JSON.parse(text);
    const content = parsed?.choices?.[0]?.message?.content;

    if (typeof content === "string") {
      return {
        status: upstreamResponse.status,
        body: JSON.stringify({ response: content }),
        contentType: "application/json; charset=utf-8",
      };
    }
  } catch {
    return {
      status: upstreamResponse.status,
      body: text,
      contentType:
        upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8",
    };
  }

  return {
    status: upstreamResponse.status,
    body: text,
    contentType:
      upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8",
  };
};

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, defaultCorsHeaders);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/ai") {
    sendJson(res, 404, { error: "Route not found" });
    return;
  }

  if (!AI_API_KEY) {
    sendJson(res, 500, {
      error: "AI_API_KEY is missing. Add it to the server env file.",
    });
    return;
  }

  try {
    const rawBody = await readBody(req);
    const parsedBody = rawBody ? JSON.parse(rawBody) : {};
    const useOpenAICompatibleMode = isOpenAICompatibleUrl(AI_API_URL);
    const upstreamUrl =
      useOpenAICompatibleMode && !AI_API_URL.endsWith("/chat/completions")
        ? `${AI_API_URL.replace(/\/$/, "")}/chat/completions`
        : AI_API_URL;
    const upstreamBody = useOpenAICompatibleMode
      ? JSON.stringify(toOpenAICompatiblePayload(parsedBody))
      : rawBody;

    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: upstreamBody,
    });

    const normalizedResponse = useOpenAICompatibleMode
      ? await normalizeOpenAICompatibleResponse(upstreamResponse)
      : {
          status: upstreamResponse.status,
          body: await upstreamResponse.text(),
          contentType:
            upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8",
        };

    res.writeHead(normalizedResponse.status, {
      "Content-Type": normalizedResponse.contentType,
      ...defaultCorsHeaders,
    });
    res.end(normalizedResponse.body);
  } catch (error) {
    sendJson(res, 500, {
      error: "Failed to reach AI service",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`AI proxy server is running on http://localhost:${PORT}`);
});
