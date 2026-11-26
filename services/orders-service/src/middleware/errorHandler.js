function errorHandler(err, req, res, next) {
  console.error(JSON.stringify({ level: 'error', message: err.message, path: req.path }));
  res.status(500).json({ error: 'Something went wrong' });
}

module.exports = errorHandler;
