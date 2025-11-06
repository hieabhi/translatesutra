import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { hashPassword, verifyPassword } from '../utils/hash';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { 
  UserCreateInput, 
  UserLoginInput, 
  RefreshTokenInput,
  toUserResponse, 
  isValidEmail, 
  validatePassword, 
  validateDisplayName,
  User,
  AuthResponse
} from '../models/user';

const router = Router();

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName }: UserCreateInput = req.body;

    // Validate input
    if (!email || !password || !displayName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, password, and displayName are required'
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Invalid password',
        message: passwordValidation.message
      });
    }

    // Validate display name
    const nameValidation = validateDisplayName(displayName);
    if (!nameValidation.isValid) {
      return res.status(400).json({
        error: 'Invalid display name',
        message: nameValidation.message
      });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = uuidv4();
    const result = await query(
      `INSERT INTO users (id, email, password_hash, display_name) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, display_name, created_at`,
      [userId, email.toLowerCase(), passwordHash, displayName.trim()]
    );

    const user = result.rows[0] as User;

    // Generate tokens
    const tokenPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token in database (optional - for token revocation)
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] // 7 days
    );

    const response: AuthResponse = {
      accessToken,
      refreshToken,
      user: toUserResponse(user)
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to create account at this time'
    });
  }
});

/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password }: UserLoginInput = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Find user
    const result = await query(
      'SELECT id, email, password_hash, display_name, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0] as User;

    // Verify password
    const isPasswordValid = await verifyPassword(user.password_hash, password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const tokenPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token in database
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );

    const response: AuthResponse = {
      accessToken,
      refreshToken,
      user: toUserResponse(user)
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to authenticate at this time'
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken }: RefreshTokenInput = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    let tokenPayload;
    try {
      tokenPayload = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired'
      });
    }

    // Check if refresh token exists in database
    const tokenResult = await query(
      'SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token not found or expired'
      });
    }

    // Get user data
    const userResult = await query(
      'SELECT id, email, display_name, created_at FROM users WHERE id = $1',
      [tokenPayload.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found',
        message: 'Associated user account not found'
      });
    }

    const user = userResult.rows[0] as User;

    // Generate new tokens
    const newTokenPayload = { userId: user.id, email: user.email };
    const newAccessToken = generateAccessToken(newTokenPayload);
    const newRefreshToken = generateRefreshToken(newTokenPayload);

    // Replace old refresh token with new one
    await query(
      'UPDATE refresh_tokens SET token = $1, expires_at = $2 WHERE token = $3',
      [newRefreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), refreshToken]
    );

    const response: AuthResponse = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: toUserResponse(user)
    };

    res.json(response);
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to refresh token at this time'
    });
  }
});

/**
 * GET /auth/me
 * Get current user information (protected route)
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Note: This route needs authentication middleware
    // For now, we'll implement a basic version
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'Authorization header with Bearer token is required'
      });
    }

    // In a full implementation, use the authenticateToken middleware
    // For now, we'll do basic token verification here
    const { verifyAccessToken } = await import('../utils/jwt');
    
    let tokenPayload;
    try {
      tokenPayload = verifyAccessToken(token);
    } catch (error) {
      return res.status(403).json({
        error: 'Invalid token',
        message: 'Access token is invalid or expired'
      });
    }

    // Get user data
    const result = await query(
      'SELECT id, email, display_name, created_at FROM users WHERE id = $1',
      [tokenPayload.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    const user = result.rows[0] as User;
    res.json(toUserResponse(user));
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to retrieve user information'
    });
  }
});

/**
 * POST /auth/logout
 * Logout user and invalidate refresh token
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove refresh token from database
      await query(
        'DELETE FROM refresh_tokens WHERE token = $1',
        [refreshToken]
      );
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to logout at this time'
    });
  }
});

export { router as authRouter };