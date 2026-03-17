const validators = require('../utils/validators');

const validate = (validator) => {
  return (req, res, next) => {
    try {
      const { error } = validators[validator].validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { validate };