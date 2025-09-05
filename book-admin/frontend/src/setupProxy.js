const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Only proxy specific backend paths, let React serve static files from public/
  app.use(
    '/shuspot-images',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      onProxyRes: function(proxyRes, req, res) {
        console.log(`[Proxy Images] ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
      }
    })
  );

  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // remove /api prefix when forwarding to backend
      },
      onProxyRes: function(proxyRes, req, res) {
        console.log(`[Proxy API] ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
      }
    })
  );
};
