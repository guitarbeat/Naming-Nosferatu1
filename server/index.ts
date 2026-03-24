import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { router } from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Build allowed CORS origins, including Replit dev domain if present
const buildCorsOrigins = (): string[] | true => {
        const replitDomain = process.env.REPLIT_DEV_DOMAIN;
        // In Replit dev, allow all origins since Vite proxies /api to this server
        if (replitDomain) {
                return true;
        }
        const raw = process.env.CORS_ORIGIN || process.env.VITE_APP_URL || "http://localhost:5173";
        return raw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
};

app.use(
        cors({
                origin: buildCorsOrigins(),
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

const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 100, // Limit each IP to 100 requests per windowMs
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        message: { error: "Too many requests, please try again later." },
});

// Apply rate limiting to all API routes
app.use("/api", apiLimiter);

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
