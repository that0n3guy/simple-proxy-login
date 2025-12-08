import express from "express";
import session from "express-session";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
app.use(express.urlencoded({ extended: true }));

// Config
const PORT = process.env.PORT || 3000;
const PROXY_TARGET = process.env.PROXY_TARGET || "http://localhost:8080";
const APP_NAME = process.env.APP_NAME || "Admin";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const BYPASS_PATHS = (process.env.BYPASS_PATHS || "").split(",").filter(Boolean);

// Session
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Login page
const loginPage = (error = "") => `
<!DOCTYPE html>
<html>
<head>
  <title>${APP_NAME} Login</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1a1a2e; }
    form { background: #16213e; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
    h1 { color: #eee; margin-bottom: 1.5rem; font-size: 1.5rem; text-align: center; }
    input { display: block; width: 200px; padding: 0.5rem; margin-bottom: 1rem; border: 1px solid #333; border-radius: 4px; background: #0f0f23; color: #eee; }
    input::placeholder { color: #666; }
    button { width: 100%; padding: 0.5rem; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
    button:hover { background: #4f46e5; }
    .error { color: #f87171; margin-bottom: 1rem; text-align: center; font-size: 0.9rem; }
  </style>
</head>
<body>
  <form method="POST" action="/login">
    <h1>${APP_NAME} Login</h1>
    ${error ? `<div class="error">${error}</div>` : ""}
    <input type="text" name="username" placeholder="Username" autocomplete="username" required />
    <input type="password" name="password" placeholder="Password" autocomplete="current-password" required />
    <button type="submit">Login</button>
  </form>
</body>
</html>
`;

// Routes
app.get("/login", (req, res) => {
  if (req.session?.authenticated) {
    return res.redirect("/");
  }
  res.send(loginPage());
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    req.session.username = username;
    res.redirect("/");
  } else {
    res.status(401).send(loginPage("Invalid username or password"));
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session?.authenticated) {
    return next();
  }
  res.redirect("/login");
};

// Proxy to target (with websocket support)
const proxy = createProxyMiddleware({
  target: PROXY_TARGET,
  changeOrigin: true,
  ws: true,
  on: {
    proxyReq: (proxyReq, req) => {
      console.log(`[Proxy] ${req.method} ${req.url}`);
    },
    error: (err, req, res) => {
      console.error(`[Proxy Error]`, err.message);
      if (res.writeHead) {
        res.status(502).send("Proxy error: " + err.message);
      }
    }
  }
});

// Bypass auth for configured paths (e.g., API endpoints with their own auth)
BYPASS_PATHS.forEach(path => {
  console.log(`[Bypass] ${path} (no auth required)`);
  app.use(path, proxy);
});

// Everything else requires auth
app.use("/", requireAuth, proxy);

// Start server
const server = app.listen(PORT, () => {
  console.log(`simple-proxy-login running on http://localhost:${PORT}`);
  console.log(`App name: ${APP_NAME}`);
  console.log(`Proxying to: ${PROXY_TARGET}`);
});

// Handle websocket upgrades
server.on("upgrade", (req, socket, head) => {
  proxy.upgrade(req, socket, head);
});
