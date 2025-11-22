export const registerUserSwaggerSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      example: 'John Doe',
    },
    email: {
      type: 'string',
      format: 'email',
      example: 'john@example.com',
    },
    phone: {
      type: 'string',
      example: '+8801712345678',
    },
    address: {
      type: 'string',
      example: '123 Street, Chittagong, Bangladesh',
    },
    password: {
      type: 'string',
      format: 'password',
      example: 'StrongPass123!',
    },
    facebook: {
      type: 'string',
      example: 'https://facebook.com/johndoe',
    },
    youtube: {
      type: 'string',
      example: 'https://youtube.com/@johndoe',
    },
    twitter: {
      type: 'string',
      example: 'https://twitter.com/johndoe',
    },
    instagram: {
      type: 'string',
      example: 'https://instagram.com/johndoe',
    },
    pinterest: {
      type: 'string',
      example: 'https://pinterest.com/johndoe',
    },
    linkedin: {
      type: 'string',
      example: 'https://linkedin.com/in/johndoe',
    },
    tiktok: {
      type: 'string',
      example: 'https://tiktok.com/@johndoe',
    },
  },
  required: ['name', 'email', 'password'],
};
