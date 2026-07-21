/**
 * Response sukses
 * @param {Object} res
 * @param {any} data
 * @param {string} message
 * @param {number} statusCode
 */
const successResponse = (res, data, message = "Success", statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

/**
 * Response error
 * @param {Object} res
 * @param {string} message
 * @param {number} statusCode
 * @param {any} errors
 */
const errorResponse = (
    res,
    message = "Internal Server Error",
    statusCode = 500,
    errors = null,
) => {
    const response = {
        success: false,
        message,
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

module.exports = {
    successResponse,
    errorResponse,
};
