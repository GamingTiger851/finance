const router = require('express').Router(); const { z } = require('zod'); const validate = require('../middleware/validate'); const validateParams = validate.params; const { authenticate, requireAdmin } = require('../middleware/auth'); const auth=require('../controllers/auth'); const c=require('../controllers/crud'); const adminCtrl=require('../controllers/admin'); const upstoxCtrl=require('../controllers/upstox'); const growwCtrl=require('../controllers/groww'); const liveMarket=require('../controllers/liveMarket');
const aiCtrl = require('../controllers/ai');
const newsCtrl = require('../controllers/news');
const credentials=validate(z.object({body:z.object({email:z.string().email(),password:z.string().min(8),name:z.string().optional()}),params:z.object({}),query:z.object({})}));
const refreshCredentials=validate(z.object({body:z.object({refreshToken:z.string().min(20)}),params:z.object({}),query:z.object({})}));
const body = schema => validate(z.object({ body: schema, params: z.record(z.string()), query: z.record(z.string()) }));
const id = z.string().regex(/^[a-f\d]{24}$/i);
const oneId = validateParams(z.object({ id }));
const portfolioId = validateParams(z.object({ portfolioId: id }));
const portfolioBody = z.object({ name:z.string().min(1).max(100), baseCurrency:z.string().length(3).optional() });
const holdingBody = z.object({ symbol:z.string().min(1).max(12), quantity:z.number().nonnegative(), averageCost:z.number().nonnegative() });
const transactionBody = z.object({ portfolio:id.optional(), type:z.enum(['buy','sell','income','expense','dividend','deposit','withdrawal']), symbol:z.string().max(12).optional(), quantity:z.number().nonnegative().optional(), price:z.number().nonnegative().optional(), amount:z.number().nonnegative(), date:z.coerce.date().optional(), notes:z.string().max(1000).optional() });
const alertBody = z.object({ symbol:z.string().min(1).max(12), condition:z.enum(['above','below']), target:z.number().nonnegative(), active:z.boolean().optional() });
const watchlistBody = z.object({ symbols:z.array(z.string().min(1).max(12)).max(100) });
router.post('/auth/register',credentials,auth.register); 
router.post('/auth/login',credentials,auth.login); 
router.post('/auth/refresh',refreshCredentials,auth.refresh);
router.post('/auth/forgot-password', auth.forgotPassword);
router.post('/auth/reset-password', auth.resetPassword);
// Yahoo Finance Live Market Routes (no IP restriction, real NSE/BSE data)
router.get('/live/status', liveMarket.status);
router.get('/live/indices', liveMarket.indices);
router.get('/live/quote/:symbol', liveMarket.quote);
router.post('/live/batch', liveMarket.batch);
router.get('/live/candles/:symbol', liveMarket.candles);
router.get('/live/movers', liveMarket.movers);
router.get('/news', newsCtrl.getNews);

router.use(authenticate);

const aiChatBody = validate(z.object({
  body: z.object({
    question: z.string().trim().min(1).max(2000),
    history: z.array(z.object({ role: z.enum(['user', 'model']), text: z.string().max(2000) })).max(8).optional(),
    context: z.object({
      currency: z.string().length(3).optional(),
      income: z.number().finite().optional(),
      expenses: z.number().finite().optional(),
      balance: z.number().finite().optional(),
      savingsRate: z.number().finite().optional(),
      topCategories: z.array(z.object({ name: z.string().max(80), amount: z.number().finite() })).max(3).optional(),
    }).optional(),
  }),
  params: z.record(z.string()),
  query: z.record(z.string()),
}));
router.get('/ai/status', aiCtrl.status);
router.post('/ai/chat', aiChatBody, aiCtrl.chat);

// Admin Routes
router.get('/admin/stats', requireAdmin, adminCtrl.getStats);
router.get('/admin/users', requireAdmin, adminCtrl.getUsers);
router.patch('/admin/users/:id/role', requireAdmin, adminCtrl.updateUserRole);
router.delete('/admin/users/:id', requireAdmin, adminCtrl.deleteUser);
router.get('/admin/settings', requireAdmin, adminCtrl.getSettings);
router.patch('/admin/settings', requireAdmin, adminCtrl.updateSettings);
router.get('/admin/logs', requireAdmin, adminCtrl.getAuditLogs);
router.post('/admin/clear-cache', requireAdmin, adminCtrl.clearCache);

// Upstox Routes
router.post('/upstox/connect', upstoxCtrl.connect);
router.post('/upstox/disconnect', upstoxCtrl.disconnect);
router.get('/upstox/status', upstoxCtrl.status);
router.get('/upstox/auth-url', upstoxCtrl.authUrl);
router.get('/upstox/profile', upstoxCtrl.profile);
router.get('/upstox/quotes', upstoxCtrl.getQuotes);
router.get('/upstox/stream', upstoxCtrl.stream);
router.get('/upstox/ltp', upstoxCtrl.getLtp);
router.get('/upstox/candles', upstoxCtrl.getCandles);

router.get('/portfolios',c.portfolios); router.post('/portfolios',body(portfolioBody),c.portfolios); router.get('/portfolios/:id',oneId,c.portfolio); router.patch('/portfolios/:id',oneId,body(portfolioBody.partial()),c.portfolio); router.delete('/portfolios/:id',oneId,c.portfolio);
router.get('/portfolios/:portfolioId/holdings',portfolioId,c.holdings); router.post('/portfolios/:portfolioId/holdings',portfolioId,body(holdingBody),c.holdings); router.patch('/holdings/:id',oneId,body(holdingBody.partial()),c.holding); router.delete('/holdings/:id',oneId,c.holding);
router.get('/portfolios/:portfolioId/transactions',portfolioId,c.transactions); router.post('/portfolios/:portfolioId/transactions',portfolioId,body(transactionBody.omit({portfolio:true})),c.transactions);
router.get('/transactions',c.transactions); router.post('/transactions',body(transactionBody),c.transactions); router.patch('/transactions/:id',oneId,body(transactionBody.partial()),c.transaction); router.delete('/transactions/:id',oneId,c.transaction); router.get('/watchlist',c.watchlist); router.put('/watchlist',body(watchlistBody),c.watchlist); router.get('/alerts',c.alerts); router.post('/alerts',body(alertBody),c.alerts); router.patch('/alerts/:id',oneId,body(alertBody.partial()),c.alert); router.delete('/alerts/:id',oneId,c.alert);
router.get('/dashboard',c.dashboard); router.get('/market/quote/:symbol',c.quote); router.get('/reports/transactions',c.report);

// Groww Trading API Routes (authenticated proxy)
router.get('/groww/status', growwCtrl.status);
router.get('/groww/indices', growwCtrl.indices);
router.get('/groww/quote/:symbol', growwCtrl.quote);
router.post('/groww/ltp-batch', growwCtrl.ltpBatch);
router.get('/groww/candles/:symbol', growwCtrl.candles);

module.exports=router;
