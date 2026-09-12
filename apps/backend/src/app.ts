import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application } from "express";
import { corsConfig } from "./config/cors";
import { errorMiddleware, successMiddleware } from "./middlewares";
import routes from "./routes";
import { OAuthController } from "./modules/oauth/oauth.controller";
import oauthRoutes from "./modules/oauth/oauth.routes";

const app: Application = express();

app.disable("x-powered-by");
app.use(cors(corsConfig));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(successMiddleware);
const oauthController = new OAuthController();
app.get("/.well-known/oauth-authorization-server", oauthController.metadata);
app.get("/.well-known/openid-configuration", oauthController.metadata);
app.use("/oauth", oauthRoutes);
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});
app.use("/api/v1", routes);
// The web app proxies API requests through /api/v1. Keep OAuth available there
// while retaining the standards-oriented public /oauth endpoints above.
app.use("/api/v1/oauth", oauthRoutes);
app.use(errorMiddleware);

export default app;
