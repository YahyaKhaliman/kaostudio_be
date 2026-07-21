const path = require("path");
const express = require("express");
const cors = require("cors");
const { PORT, NODE_ENV } = require("./config/database");
const errorHandler = require("./middlewares/errorHandler");
const { corsMiddleware, corsOptions } = require("./middlewares/corsMiddleware");
const { successResponse } = require("./utils/responseHelper");
const apiRoutes = require("./routes/api");

const app = express();

// Middleware CORS
app.use(corsMiddleware);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve static files (uploads folder) dengan Header CORS penuh untuk mencegah tainted canvas
app.use(
    "/uploads",
    express.static(path.join(__dirname, "../uploads"), {
        setHeaders: (res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
            res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        },
    })
);

// Routes
app.use("/api", apiRoutes);

app.get("/health", (req, res) => {
    return successResponse(
        res,
        { timestamp: new Date() },
        "API KaoStudio Ready",
    );
});

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di mode [${NODE_ENV}] pada port: ${PORT}`);
});
 
