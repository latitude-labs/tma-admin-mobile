// Environment configuration that works on both web and mobile
// Uses environment variables from .env file

const ENV = {
  // Use EXPO_PUBLIC_API_URL from .env file, fallback to localhost if not set
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api',
};

export default ENV;