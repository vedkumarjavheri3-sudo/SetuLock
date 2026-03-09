require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Route imports
const authRoutes = require('./src/routes/auth');
const familyRoutes = require('./src/routes/family');
const documentRoutes = require('./src/routes/documents');
const sessionRoutes = require('./src/routes/sessions');
const applicationRoutes = require('./src/routes/applications');
const complianceRoutes = require('./src/routes/compliance');
const dashboardRoutes = require('./src/routes/dashboard');

const app = express();

// Trust reverse proxy (Nginx) for correct IP rate limiting
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.OPERATOR_PORTAL_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// ─── API Routes ─────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/families', familyRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Digi SetuSeva Backend running.',
    version: 'V1.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    reference: Date.now()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Digi SetuSeva Backend running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);

  // Start Cron Jobs
  const { startEraseCron, startExpiryAlertCron } = require('./src/cron/eraseCron');
  startEraseCron();
  startExpiryAlertCron();
});
