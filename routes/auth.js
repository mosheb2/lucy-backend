const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const router = express.Router();

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
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          username
        },
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        username,
        role: 'user',
        created_at: new Date().toISOString()
      });

    if (profileError) {
      return res.status(500).json({ error: 'Failed to create profile' });
    }

    res.status(201).json({
      message: 'User created successfully. Please check your email to confirm your account.',
      user: {
        id: authData.user.id,
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('/signin route: Authentication error:', error);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('/signin route: User signed in successfully:', data.user.id);
    console.log('/signin route: Token generated:', data.session ? 'yes' : 'no');
    
    res.json({
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign out
router.post('/signout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(500).json({ error: 'Failed to sign out' });
    }

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

    console.log('/me route: Validating token...');
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('/me route: Token validation error:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!data || !data.user) {
      console.log('/me route: No user found for token');
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = data.user;
    console.log('/me route: User found:', user.id);

    // Get profile data
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist, create one for OAuth users
    if (!profile && !profileError) {
      console.log('Profile not found for user:', user.id, 'Creating profile...');
      
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Unknown User',
        username: user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        // Return user without profile if creation fails
        return res.json({
          user: {
            ...user,
            profile_created: false
          }
        });
      }

      profile = newProfile;
      console.log('Profile created successfully for user:', user.id);
    }

    // If there was an error getting the profile and it's not a "not found" error
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error getting profile:', profileError);
      return res.status(500).json({ error: 'Failed to get user profile' });
    }

    res.json({
      user: {
        ...user,
        ...profile
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

    console.log('/refresh route: Attempting to refresh token...');
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      console.error('/refresh route: Token refresh error:', error);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if we got a valid session back
    if (!data || !data.session || !data.session.access_token) {
      console.error('/refresh route: No valid session in refresh response');
      return res.status(401).json({ error: 'Failed to refresh token' });
    }

    console.log('/refresh route: Token refreshed successfully for user:', data.user?.id);
    res.json({
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Development endpoint to create a confirmed user (for testing only)
if (process.env.NODE_ENV === 'development') {
  router.post('/dev-signup', [
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
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      // Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            username
          }
        }
      });

      if (authError) {
        return res.status(400).json({ error: authError.message });
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          full_name,
          username,
          role: 'user',
          created_at: new Date().toISOString()
        });

      if (profileError) {
        return res.status(500).json({ error: 'Failed to create profile' });
      }

      // Confirm the user email (development only)
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        authData.user.id,
        { email_confirm: true }
      );

      if (confirmError) {
        console.error('Error confirming user:', confirmError);
      }

      res.status(201).json({
        message: 'Development user created and confirmed successfully',
        user: {
          id: authData.user.id,
          email,
          full_name,
          username
        }
      });
    } catch (error) {
      console.error('Dev signup error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}

// Google OAuth routes
router.get('/google', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.FRONTEND_URL || 'https://app.lucysounds.com'}/auth/callback`
      }
    });

    if (error) {
      console.error('Google OAuth error:', error);
      return res.status(500).json({ error: 'Failed to initiate Google OAuth' });
    }

    // Redirect to Google OAuth URL
    res.redirect(data.url);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Facebook OAuth routes
router.get('/facebook', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${process.env.FRONTEND_URL || 'https://app.lucysounds.com'}/auth/callback`
      }
    });

    if (error) {
      console.error('Facebook OAuth error:', error);
      return res.status(500).json({ error: 'Failed to initiate Facebook OAuth' });
    }

    // Redirect to Facebook OAuth URL
    res.redirect(data.url);
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Solana wallet authentication routes
router.get('/wallet/solana', async (req, res) => {
  try {
    // For Solana wallet authentication, we'll redirect to a custom page
    // that will handle the wallet connection
    const redirectUrl = `${process.env.FRONTEND_URL || 'https://app.lucysounds.com'}/connect-wallet?provider=solana`;
    
    // Set a cookie to track the authentication attempt
    res.cookie('auth_wallet_request', 'solana', { 
      maxAge: 3600000, // 1 hour
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    console.log('Redirecting to Solana wallet connection page');
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Solana wallet auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 