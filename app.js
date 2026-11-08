// Universal Entry point for Hostinger Node.js Application Manager
try {
  require('./dist/main.js');
} catch (e) {
  require('./main.js');
}
