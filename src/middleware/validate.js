module.exports = schema => (req, _res, next) => {
  const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
  if (!result.success) return next(Object.assign(new Error(result.error.issues.map(i => i.message).join(', ')), { status: 400 }));
  req.body = result.data.body; req.params = result.data.params; req.query = result.data.query; next();
};
module.exports.params = schema => (req, _res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) return next(Object.assign(new Error(result.error.issues.map(i => i.message).join(', ')), { status: 400 }));
  req.params = result.data;
  next();
};
