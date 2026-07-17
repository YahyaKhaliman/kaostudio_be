const express = require("express");
const cors = require("cors");
const { PORT, NODE_ENV } = require("./config/database");
const errorHandler = require("./middlewares/errorHandler");
const { successResponse } = require("./utils/responseHelper");
const apiRoutes = require("./routes/api");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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
 
