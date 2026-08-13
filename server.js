// Custom server entry point for hosts (like cPanel/WHM's "Setup Node.js App"
// via Passenger) that need a plain Node.js file to start the app, rather than
// running `next start` directly. Passenger sets PORT and NODE_ENV itself.
require("dotenv/config");
const { createServer } = require("http");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, () => {
    console.log(`> Ready on port ${port} (${dev ? "development" : "production"})`);
  });
});
