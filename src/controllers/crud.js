const Portfolio = require('../models/Portfolio'); 
const Holding = require('../models/Holding'); 
const Transaction = require('../models/Transaction'); 
const Watchlist = require('../models/Watchlist'); 
const Alert = require('../models/Alert'); 
const { quote } = require('../services/marketData'); 
const { csv, pdf } = require('../services/report');

const id = req => req.user.sub;
const safeAssign = (doc, body) => {
  const restricted = ['_id', 'user', 'portfolio', 'createdAt', 'updatedAt', '__v'];
  Object.keys(body).forEach(k => {
    if (!restricted.includes(k)) doc[k] = body[k];
  });
};

exports.portfolios = async (req,res) => { if (req.method === 'GET') return res.json(await Portfolio.find({ user:id(req) })); res.status(201).json(await Portfolio.create({ ...req.body, user:id(req) })); };
const ownedPortfolio = (req, portfolioId) => Portfolio.findOne({ _id: portfolioId, user: id(req) });
exports.portfolio = async (req,res) => { const p = await ownedPortfolio(req, req.params.id); if (!p) return res.status(404).json({error:'Portfolio not found'}); if (req.method==='DELETE') { await Holding.deleteMany({ portfolio:p._id, user:id(req) }); await Transaction.deleteMany({ portfolio:p._id, user:id(req) }); await p.deleteOne(); return res.status(204).end(); } safeAssign(p,req.body); await p.save(); res.json(p); };
exports.holdings = async (req,res) => { if (!await ownedPortfolio(req, req.params.portfolioId)) return res.status(404).json({error:'Portfolio not found'}); if (req.method==='GET') return res.json(await Holding.find({ user:id(req), portfolio:req.params.portfolioId })); const h=await Holding.create({...req.body,user:id(req),portfolio:req.params.portfolioId}); res.status(201).json(h); };
exports.holding = async (req,res) => { const h=await Holding.findOne({_id:req.params.id,user:id(req)}); if(!h || !await ownedPortfolio(req,h.portfolio))return res.status(404).json({error:'Holding not found'}); if(req.method==='DELETE'){await h.deleteOne();return res.status(204).end();} safeAssign(h,req.body); await h.save(); res.json(h); };
exports.transactions = async (req,res) => { if (req.params.portfolioId && !await ownedPortfolio(req, req.params.portfolioId)) return res.status(404).json({error:'Portfolio not found'}); if(req.method==='GET') return res.json(await Transaction.find({user:id(req), ...(req.params.portfolioId ? { portfolio:req.params.portfolioId } : {})}).sort({date:-1})); if (req.body.portfolio && !await ownedPortfolio(req, req.body.portfolio)) return res.status(404).json({error:'Portfolio not found'}); res.status(201).json(await Transaction.create({...req.body,user:id(req), ...(req.params.portfolioId ? { portfolio:req.params.portfolioId } : {})})); };
exports.transaction = async (req,res) => { const t=await Transaction.findOne({_id:req.params.id,user:id(req)}); if(!t)return res.status(404).json({error:'Transaction not found'}); if (req.body.portfolio && !await ownedPortfolio(req, req.body.portfolio)) return res.status(404).json({error:'Portfolio not found'}); if(req.method==='DELETE'){await t.deleteOne();return res.status(204).end();} safeAssign(t,req.body); await t.save(); res.json(t); };
exports.watchlist = async (req,res) => { let w=await Watchlist.findOne({user:id(req)}); if(!w) w=await Watchlist.create({user:id(req),symbols:[]}); if(req.method==='PUT'){w.symbols=req.body.symbols;await w.save();} res.json(w); };
exports.alerts = async (req,res) => { if(req.method==='GET') return res.json(await Alert.find({user:id(req)})); res.status(201).json(await Alert.create({...req.body,user:id(req)})); };
exports.alert = async (req,res) => { const a=await Alert.findOne({_id:req.params.id,user:id(req)}); if(!a)return res.status(404).json({error:'Alert not found'}); if(req.method==='DELETE'){await a.deleteOne();return res.status(204).end();} safeAssign(a,req.body); await a.save(); res.json(a); };
exports.dashboard = async (req,res) => { const tx=await Transaction.find({user:id(req)}); const holdings=await Holding.find({user:id(req)}); const sum=types=>tx.filter(t=>types.includes(t.type)).reduce((s,t)=>s+t.amount,0); const invested=holdings.reduce((s,h)=>s+h.quantity*h.averageCost,0); const deposits=sum(['deposit']); const withdrawals=sum(['withdrawal']); res.json({ totals:{income:sum(['income','dividend']), expenses:sum(['expense']), deposits, withdrawals, cashFlow:deposits+sum(['income','dividend'])-withdrawals-sum(['expense']), invested}, transactionCount:tx.length, holdingsCount:holdings.length }); };
exports.quote = async (req,res) => res.json(await quote(req.params.symbol));
exports.report = async (req,res) => { const rows=await Transaction.find({user:id(req)}).lean(); if(req.query.format==='pdf'){res.type('application/pdf').send(await pdf(rows));} else {res.type('text/csv').send(csv(rows));} };
