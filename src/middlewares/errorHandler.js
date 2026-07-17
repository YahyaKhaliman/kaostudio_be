const { errorResponse } = require("../utils/responseHelper");

const errorHandler = (err, req, res, next) => {
    console.error("Error occurred:", {
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });

    const statusCode = err.statusCode || 500;
    const message = err.message || "Terjadi kesalahan internal server.";

    return errorResponse(res, message, statusCode);
};

module.exports = errorHandler;
