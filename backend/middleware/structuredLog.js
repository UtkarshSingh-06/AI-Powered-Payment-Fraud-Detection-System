export function structuredLogMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const entry = {
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      msg: 'http_request',
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: Date.now() - start,
      tenantId: req.headers['x-tenant-id'] || req.user?.tenantId,
      userId: req.user?.userId,
      correlationId: req.headers['x-correlation-id'],
      service: process.env.SERVICE_NAME || 'backend'
    };
    console.log(JSON.stringify(entry));
  });
  next();
}
