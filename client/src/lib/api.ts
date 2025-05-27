import axios, { AxiosRequestConfig } from 'axios';

// Default API request options
const defaultOptions: AxiosRequestConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Make an API request using axios
 */
export async function apiRequest<T>(
  endpoint: string,
  options: AxiosRequestConfig = {}
): Promise<T> {
  try {
    const mergedOptions = {
      ...defaultOptions,
      ...options,
    };

    const response = await axios(endpoint, mergedOptions);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      // If the server returned an error response
      const serverError = error.response.data?.error || error.response.data?.message || error.message;
      throw new Error(serverError);
    }
    throw error;
  }
}

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' 
  : 'http://0.0.0.0:3001';

// Export api object for compatibility
export const api = {
  request: apiRequest,
  baseURL: API_BASE_URL
};