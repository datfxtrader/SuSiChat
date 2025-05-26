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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://0.0.0.0:3000';