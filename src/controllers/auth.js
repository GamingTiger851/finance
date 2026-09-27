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
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = await User.findOne({ email });
  if (!user) {
    // We send a success response even if user doesn't exist for security reasons (prevents email enumeration)
    return res.json({ message: 'If that email address is in our database, we will send you an email to reset your password.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  // Store only a digest so a database read cannot be used to reset an account.
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  try {
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    if (!smtpUser || !smtpPass) {
      throw new Error('Password reset email is not configured');
    }

    const frontendUrl = (process.env.FRONTEND_URL || process.env.APP_URL || '').trim();
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL is not configured');
    }
    const resetUrl = new URL('/reset-password', frontendUrl);
    resetUrl.searchParams.set('token', token);

    const port = Number(process.env.SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `FinTracker Support <${smtpUser}>`,
      to: user.email,
      subject: 'Password Reset Request',
      text: `You requested a password reset for your FinTracker account. Use this link within one hour:\n\n${resetUrl.toString()}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>You requested a password reset for your FinTracker account.</p><p><a href="${resetUrl.toString()}">Reset your password</a></p><p>This link expires in one hour. If you did not request this, you can ignore this email.</p>`
    });

    res.json({ message: 'If that email address is in our database, we will send you an email to reset your password.' });
  } catch (error) {
    console.error('Password reset email failed:', error.message);
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
    resetPasswordToken: crypto.createHash('sha256').update(token).digest('hex'),
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

