import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { router } from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || process.env.VITE_APP_URL || "http://localhost:5173";
const corsOrigins = corsOrigin.split(",").map((s) => s.trim()).filter(Boolean);
app.use(
	cors({
		origin: corsOrigins,
		credentials: true,
	}),
);

// Security enhancements
app.disable("x-powered-by");
app.use((_req, res, next) => {
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("X-Frame-Options", "DENY");
	res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
	next();
});

app.use(express.json({ limit: "1mb" }));

app.use(router);

const distPath = path.resolve(__dirname, "../dist");

app.use(
	express.static(distPath, {
		setHeaders: (res, filePath) => {
			if (filePath.endsWith(".html")) {
				res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
			} else if (filePath.includes("assets/") || /\.[a-f0-9]{8}\./.test(filePath)) {
				res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
			} else {
				res.setHeader("Cache-Control", "public, max-age=3600");
			}
		},
	}),
);

app.get("/{*path}", (_req, res) => {
	res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
	res.sendFile(path.join(distPath, "index.html"));
});

const PORT = parseInt(process.env.PORT || "3001", 10);

app.listen(PORT, "0.0.0.0", () => {
	console.log(`API server running on port ${PORT}`);
});
