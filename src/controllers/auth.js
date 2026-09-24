const bcrypt = require('bcryptjs'); 
const User = require('../models/User'); 
const { signAccess, signRefresh } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => { 
  const { email, password, name } = req.body; 
  const passwordHash = await bcrypt.hash(password, 12); 
  const user = await User.create({ email, passwordHash, name }); 
  res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, accessToken: signAccess(user), refreshToken: signRefresh(user) }); 
};

exports.login = async (req, res) => { 
  const user = await User.findOne({ email: req.body.email }); 
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' }); 
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, accessToken: signAccess(user), refreshToken: signRefresh(user) }); 
};

exports.refresh = async (req, res) => { 
  try { 
    const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error('JWT refresh secret is not defined');
    const p = jwt.verify(req.body.refreshToken, secret); 
    const user = await User.findById(p.sub); 
    if (!user) throw new Error(); 
    if (p.tokenVersion !== user.tokenVersion) throw new Error();
    res.json({ accessToken: signAccess(user), refreshToken: signRefresh(user) }); 
  } catch { 
    res.status(401).json({ error: 'Invalid refresh token' }); 
  } 
};

const nodemailer = require('nodemailer');
const crypto = require('crypto');

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // We send a success response even if user doesn't exist for security reasons (prevents email enumeration)
    return res.json({ message: 'If that email address is in our database, we will send you an email to reset your password.' });
  }

  const token = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const resetUrl = `http://localhost:5173/reset-password?token=${token}`;

    const info = await transporter.sendMail({
      from: '"FinTracker Support" <support@fintracker.com>',
      to: user.email,
      subject: 'Password Reset Request',
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process within one hour of receiving it:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`
    });

    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

    res.json({ message: 'If that email address is in our database, we will send you an email to reset your password.' });
  } catch (error) {
    console.error('Email Error:', error);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(500).json({ error: 'Error sending email. Please try again later.' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  
  // Optionally invalidate existing refresh tokens to force re-login everywhere
  user.tokenVersion += 1; 

  await user.save();

  res.json({ message: 'Success! Your password has been changed.' });
};

