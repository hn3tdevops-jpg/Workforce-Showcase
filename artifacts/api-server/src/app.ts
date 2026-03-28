import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import hospitableRouter from "./hospitable/router.js";
import authRouter from "./auth/router.js";
import coreRouter from "./core/router.js";
import schedulingRouter from "./scheduling/router.js";
import studioRouter from "./studio/router.js";
import promotionsRouter, { seedPromotionTiers } from "./promotions/router.js";
import { logger } from "./lib/logger.js";

const PA_BASE = "https://hn3t.pythonanywhere.com";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use("/api/v1/hospitable", hospitableRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1", coreRouter);
app.use("/api/v1", schedulingRouter);
app.use("/api/v1/studio", studioRouter);
app.use("/api/v1/promotions", promotionsRouter);

// Seed promotion tiers on startup (idempotent)
seedPromotionTiers();

app.use("/api/v1", async (req: Request, res: Response) => {
  const upstream = `${PA_BASE}/api/v1${req.url}`;

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (
      typeof value === "string" &&
      key.toLowerCase() !== "host" &&
      key.toLowerCase() !== "connection" &&
      key.toLowerCase() !== "transfer-encoding"
    ) {
      headers[key] = value;
    }
  }

  const hasBody =
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    req.body != null &&
    Object.keys(req.body as object).length > 0;

  try {
    const upstreamRes = await fetch(upstream, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body) : undefined,
    });

    res.status(upstreamRes.status);

    const contentType = upstreamRes.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);

    const text = await upstreamRes.text();
    res.send(text);
  } catch (err) {
    logger.error({ err, upstream }, "Proxy error forwarding to PythonAnywhere");
    res.status(502).json({ detail: "Upstream proxy error" });
  }
});

export default app;
