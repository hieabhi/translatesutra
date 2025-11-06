export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreateInput {
  email: string;
  password: string;
  displayName: string;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface Device {
  id: string;
  user_id: string;
  device_uuid: string;
  platform: string;
  app_version?: string;
  last_seen: Date;
  created_at: Date;
}

export interface DeviceCreateInput {
  deviceUuid: string;
  platform: string;
  appVersion?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

/**
 * Convert database user to API response format
 * @param user - Database user object
 * @returns UserResponse - User data for API response
 */
export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    createdAt: user.created_at.toISOString(),
  };
}

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns boolean - True if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns object - Validation result with isValid boolean and message
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: 'Password must be no more than 128 characters long' };
  }
  
  // Check for at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { isValid: false, message: 'Password must contain at least one letter and one number' };
  }
  
  return { isValid: true };
}

/**
 * Validate display name
 * @param displayName - Display name to validate
 * @returns object - Validation result with isValid boolean and message
 */
export function validateDisplayName(displayName: string): { isValid: boolean; message?: string } {
  if (!displayName || displayName.trim().length === 0) {
    return { isValid: false, message: 'Display name is required' };
  }
  
  if (displayName.length < 2) {
    return { isValid: false, message: 'Display name must be at least 2 characters long' };
  }
  
  if (displayName.length > 50) {
    return { isValid: false, message: 'Display name must be no more than 50 characters long' };
  }
  
  return { isValid: true };
}