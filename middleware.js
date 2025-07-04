function myCustomMiddleware(req, res, next) {
    console.log('Request received:', req.method, req.url,req.body);
  
    next(); 
  }

  module.exports = myCustomMiddleware;