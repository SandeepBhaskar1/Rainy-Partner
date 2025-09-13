const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  console.log(`📥 ${req.method} ${req.originalUrl} - ${req.ip}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusEmoji = res.statusCode >= 400 ? '❌' : '✅';
    console.log(`📤 ${statusEmoji} ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

module.exports = {
  requestLogger
};