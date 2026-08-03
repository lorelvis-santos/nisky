import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application } from "express";
import { corsConfig } from "./config/cors";
import { errorMiddleware, successMiddleware } from "./middlewares";
import routes from "./routes";

const app: Application = express();

app.disable("x-powered-by");
app.use(cors(corsConfig));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(successMiddleware);
app.use("/api/v1", routes);
app.use(errorMiddleware);

export default app;
