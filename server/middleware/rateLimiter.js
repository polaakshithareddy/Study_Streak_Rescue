const rateLimit = require('express-rate-limit');

/**
 * Rate limiter middleware for authentication routes (login / register)
 * Protects against brute-force password guessing and bot spam.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 25, // Limit each IP to 25 auth requests per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  }
});

/**
 * General API rate limiter for protecting endpoints from excessive spam.
 */
const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 120, // Limit each IP to 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many API requests. Please slow down.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  }
});

module.exports = {
  authRateLimiter,
  apiRateLimiter
};
