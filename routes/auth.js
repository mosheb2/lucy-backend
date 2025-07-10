const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Mock user database
const users = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'demo@example.com',
    password: 'password123',
    full_name: 'Demo User',
    username: 'demouser',
    role: 'user',
    created_at: '2023-01-01T00:00:00Z'
  }
];

// Sign up
router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').notEmpty().trim(),
  body('username').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name, username } = req.body;

    // Check if username is available
    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Create new user
    const newUser = {
      id: `user-${Date.now()}`,
      email,
      password, // In a real app, this would be hashed
      full_name,
      username,
      role: 'user',
      created_at: new Date().toISOString()
    };

    users.push(newUser);

    res.status(201).json({
      message: 'User created successfully. Please check your email to confirm your account.',
      user: {
        id: newUser.id,
        email,
        full_name,
        username
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign in
router.post('/signin', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    console.log('/signin route: Received signin request');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('/signin route: Validation errors', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log('/signin route: Attempting to sign in user:', email);

    // Find user
    const user = users.find(user => user.email === email && user.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret_here',
      { expiresIn: '1h' }
    );

    console.log('/signin route: User signed in successfully:', user.id);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        username: user.username,
        role: user.role
      },
      session: {
        access_token: token,
        refresh_token: 'mock-refresh-token',
        expires_at: new Date(Date.now() + 3600000).toISOString()
      }
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign out
router.post('/signout', async (req, res) => {
  try {
    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Signout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('/me route: No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    // In a real app, you would verify the token
    // For this mock, we'll just return a user
    const user = users[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        username: user.username,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    console.log('/refresh route: Received refresh request');
    const { refresh_token } = req.body;

    if (!refresh_token) {
      console.log('/refresh route: No refresh token provided');
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // In a real app, you would verify the refresh token
    // For this mock, we'll just generate a new token
    const user = users[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret_here',
      { expiresIn: '1h' }
    );

    res.json({
      session: {
        access_token: token,
        refresh_token: 'mock-refresh-token',
        expires_at: new Date(Date.now() + 3600000).toISOString()
      },
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OAuth callback handler
router.get('/callback/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code } = req.query;

    res.json({
      message: `OAuth callback received for ${provider}`,
      code,
      mockResponse: true
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 