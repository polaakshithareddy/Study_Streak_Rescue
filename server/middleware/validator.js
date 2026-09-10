const { validationResult, body } = require('express-validator');

/**
 * Express middleware to validate request input schemas
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstErr = errors.array()[0];
    return res.status(400).json({
      error: {
        message: `${firstErr.path ? firstErr.path + ': ' : ''}${firstErr.msg}`,
        code: 'VALIDATION_ERROR',
        details: errors.array()
      }
    });
  }
  next();
}

/**
 * Validation rules for user registration
 */
const registerValidationRules = [
  body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  validateRequest
];

/**
 * Validation rules for user login
 */
const loginValidationRules = [
  body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest
];

/**
 * Validation rules for plan creation preview
 */
const createPlanValidationRules = [
  body('title').trim().notEmpty().withMessage('Plan title is required'),
  body('targetDate').notEmpty().withMessage('Target date is required'),
  validateRequest
];

module.exports = {
  validateRequest,
  registerValidationRules,
  loginValidationRules,
  createPlanValidationRules
};
