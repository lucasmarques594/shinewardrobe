export const errorHandler = ({ code, error, set }: any) => {
  console.error('Error:', error);

  switch (code) {
    case 'VALIDATION':
      set.status = 400;
      return {
        success: false,
        message: 'Validation error',
        errors: error.validator?.Errors ? Array.from(error.validator.Errors) : ['Invalid request data']
      };

    case 'NOT_FOUND':
      set.status = 404;
      return {
        success: false,
        message: 'Resource not found'
      };

    case 'PARSE':
      set.status = 400;
      return {
        success: false,
        message: 'Invalid JSON format'
      };

    case 'UNAUTHORIZED':
      set.status = 401;
      return {
        success: false,
        message: 'Unauthorized access'
      };

    case 'FORBIDDEN':
      set.status = 403;
      return {
        success: false,
        message: 'Forbidden access'
      };

    default:
      set.status = 500;
      return {
        success: false,
        message: process.env.NODE_ENV === 'development' 
          ? error.message || 'Internal server error'
          : 'Internal server error'
      };
  }
};