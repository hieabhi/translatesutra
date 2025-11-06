import axios from 'axios';

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'http://localhost:5000';

export interface TranslationResult {
  translatedText: string;
  originalText: string;
  fromLanguage: string;
  toLanguage: string;
  service: string;
  confidence?: number;
}

export interface ApiError {
  error: string;
  message: string;
}

/**
 * Get stored authentication tokens
 */
async function getAuthTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  try {
    // This will be available in the renderer process through the preload script
    if (typeof window !== 'undefined' && window.electronAPI) {
      return await window.electronAPI.getAuthTokens();
    }
    return { accessToken: null, refreshToken: null };
  } catch (error) {
    console.error('Failed to get auth tokens:', error);
    return { accessToken: null, refreshToken: null };
  }
}

/**
 * Make authenticated API request to backend
 */
async function makeAuthenticatedRequest(endpoint: string, options: any = {}): Promise<any> {
  const { accessToken } = await getAuthTokens();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const response = await axios({
      url: `${BACKEND_URL}${endpoint}`,
      method: options.method || 'GET',
      headers,
      data: options.data,
      timeout: 10000,
    });

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      const refreshed = await refreshAuthToken();
      if (refreshed) {
        // Retry the request with new token
        const { accessToken: newToken } = await getAuthTokens();
        headers['Authorization'] = `Bearer ${newToken}`;
        
        const retryResponse = await axios({
          url: `${BACKEND_URL}${endpoint}`,
          method: options.method || 'GET',
          headers,
          data: options.data,
          timeout: 10000,
        });
        
        return retryResponse.data;
      }
    }
    throw error;
  }
}

/**
 * Refresh authentication token
 */
async function refreshAuthToken(): Promise<boolean> {
  try {
    const { refreshToken } = await getAuthTokens();
    
    if (!refreshToken) {
      return false;
    }

    const response = await axios.post(`${BACKEND_URL}/auth/refresh`, {
      refreshToken
    }, {
      timeout: 10000,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;

    // Save new tokens
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.saveAuthTokens({
        accessToken,
        refreshToken: newRefreshToken
      });
    }

    return true;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    // Clear invalid tokens
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.clearAuthTokens();
    }
    return false;
  }
}

/**
 * Translate text using backend API (with authentication)
 */
async function translateWithBackend(text: string, fromLang: string = 'auto', toLang: string = 'en'): Promise<TranslationResult> {
  try {
    const result = await makeAuthenticatedRequest('/translate', {
      method: 'POST',
      data: {
        text,
        fromLang,
        toLang
      }
    });

    return {
      translatedText: result.translatedText,
      originalText: text,
      fromLanguage: result.fromLanguage || fromLang,
      toLanguage: result.toLanguage || toLang,
      service: result.service || 'backend',
      confidence: result.confidence
    };
  } catch (error: any) {
    console.error('Backend translation failed:', error);
    throw new Error(error.response?.data?.message || 'Backend translation service unavailable');
  }
}

/**
 * Translate text using LibreTranslate (fallback)
 */
async function translateWithLibreTranslate(text: string, fromLang: string = 'auto', toLang: string = 'en'): Promise<TranslationResult> {
  try {
    const response = await axios.post(`${LIBRETRANSLATE_URL}/translate`, {
      q: text,
      source: fromLang,
      target: toLang,
      format: 'text'
    }, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return {
      translatedText: response.data.translatedText,
      originalText: text,
      fromLanguage: response.data.detectedLanguage?.language || fromLang,
      toLanguage: toLang,
      service: 'libretranslate',
      confidence: response.data.detectedLanguage?.confidence
    };
  } catch (error: any) {
    console.error('LibreTranslate translation failed:', error);
    throw new Error('LibreTranslate service unavailable');
  }
}

/**
 * Main translation function with fallback
 */
export async function translateText(text: string, fromLang: string = 'auto', toLang: string = 'en'): Promise<TranslationResult> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required for translation');
  }

  // Trim and limit text length
  const trimmedText = text.trim().substring(0, 5000); // Limit to 5000 characters

  try {
    // Try backend first (if user is authenticated)
    const { accessToken } = await getAuthTokens();
    
    if (accessToken) {
      try {
        return await translateWithBackend(trimmedText, fromLang, toLang);
      } catch (error) {
        console.warn('Backend translation failed, trying LibreTranslate fallback:', error);
      }
    }

    // Fallback to LibreTranslate
    return await translateWithLibreTranslate(trimmedText, fromLang, toLang);
    
  } catch (error: any) {
    console.error('All translation services failed:', error);
    
    // Return a mock translation for development/testing
    if (process.env.NODE_ENV === 'development') {
      return {
        translatedText: `[MOCK TRANSLATION] ${trimmedText}`,
        originalText: trimmedText,
        fromLanguage: fromLang,
        toLanguage: toLang,
        service: 'mock',
        confidence: 0.95
      };
    }
    
    throw new Error('Translation service unavailable. Please check your internet connection and try again.');
  }
}

/**
 * Get available languages from LibreTranslate
 */
export async function getAvailableLanguages(): Promise<Array<{ code: string; name: string }>> {
  try {
    const response = await axios.get(`${LIBRETRANSLATE_URL}/languages`, {
      timeout: 10000
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to get available languages:', error);
    
    // Return common languages as fallback
    return [
      { code: 'auto', name: 'Auto-detect' },
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' }
    ];
  }
}

/**
 * User authentication functions
 */
export async function loginUser(email: string, password: string): Promise<any> {
  try {
    const response = await axios.post(`${BACKEND_URL}/auth/login`, {
      email,
      password
    }, {
      timeout: 10000
    });

    const { accessToken, refreshToken, user } = response.data;

    // Save tokens securely
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.saveAuthTokens({ accessToken, refreshToken });
    }

    return { user, success: true };
  } catch (error: any) {
    console.error('Login failed:', error);
    throw new Error(error.response?.data?.message || 'Login failed');
  }
}

export async function registerUser(email: string, password: string, displayName: string): Promise<any> {
  try {
    const response = await axios.post(`${BACKEND_URL}/auth/register`, {
      email,
      password,
      displayName
    }, {
      timeout: 10000
    });

    const { accessToken, refreshToken, user } = response.data;

    // Save tokens securely
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.saveAuthTokens({ accessToken, refreshToken });
    }

    return { user, success: true };
  } catch (error: any) {
    console.error('Registration failed:', error);
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
}

export async function logoutUser(): Promise<void> {
  try {
    const { refreshToken } = await getAuthTokens();
    
    if (refreshToken) {
      // Call logout endpoint
      await axios.post(`${BACKEND_URL}/auth/logout`, {
        refreshToken
      }, {
        timeout: 5000
      });
    }
  } catch (error) {
    console.error('Logout API call failed:', error);
  } finally {
    // Clear tokens regardless of API call success
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.clearAuthTokens();
    }
  }
}

export async function getCurrentUser(): Promise<any> {
  try {
    return await makeAuthenticatedRequest('/auth/me');
  } catch (error: any) {
    console.error('Get current user failed:', error);
    throw new Error(error.response?.data?.message || 'Failed to get user information');
  }
}