const cors = require("cors");

const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
            : null;

        if (
            !origin ||
            !allowedOrigins ||
            allowedOrigins.includes("*") ||
            allowedOrigins.includes(origin)
        ) {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
    ],
    credentials: true,
};

const corsMiddleware = cors(corsOptions);

module.exports = {
    corsMiddleware,
    corsOptions,
};
