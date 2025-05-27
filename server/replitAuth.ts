import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Get the primary domain from REPLIT_DOMAINS
  const domains = process.env.REPLIT_DOMAINS!.split(",");
  const primaryDomain = domains[0];
  
  // Register strategy for each domain
  for (const domain of domains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  // Register fallback strategies for common host formats
  const fallbackHosts = ['0.0.0.0:5000', 'localhost:5000'];
  for (const host of fallbackHosts) {
    const strategy = new Strategy(
      {
        name: `replitauth:${host}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${primaryDomain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    console.log("Login attempt from:", req.headers.host);
    const host = req.headers.host || req.hostname;
    console.log("Using authentication strategy for host:", host);
    
    // Try to find a matching strategy
    const strategyName = `replitauth:${host}`;
    const strategy = passport._strategies[strategyName];
    
    if (!strategy) {
      console.log(`No strategy found for ${strategyName}, using primary domain strategy`);
      const primaryDomain = process.env.REPLIT_DOMAINS!.split(",")[0];
      passport.authenticate(`replitauth:${primaryDomain}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } else {
      passport.authenticate(strategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    }
  });

  app.get("/api/callback", (req, res, next) => {
    console.log('=== OAuth Callback Debug ===');
    console.log('Callback URL:', req.url);
    console.log('Host header:', req.get('host'));
    console.log('Query params:', req.query);
    
    // Check for OAuth errors in query params
    if (req.query.error) {
      console.error('OAuth error received:', req.query.error, req.query.error_description);
      return res.redirect(`/?error=${req.query.error}&description=${encodeURIComponent(req.query.error_description || 'Authentication failed')}`);
    }

    const host = req.headers.host || req.hostname;
    console.log("Processing callback for host:", host);

    // Try to find matching strategy, fallback to primary domain
    const strategyName = `replitauth:${host}`;
    const strategy = passport._strategies[strategyName];
    
    const finalStrategy = strategy ? strategyName : `replitauth:${process.env.REPLIT_DOMAINS!.split(",")[0]}`;
    console.log("Using strategy:", finalStrategy);

    passport.authenticate(finalStrategy, { 
      failureRedirect: "/?error=auth_failed",
      failureFlash: false
    })(req, res, next);
  }, (req, res) => {
    console.log("Authentication successful for user:", req.user);
    
    // Ensure session is saved before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect('/?error=session_error');
      }
      console.log('Session saved successfully, redirecting to /chat');
      res.redirect("/chat");
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.redirect("/api/login");
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.redirect("/api/login");
  }
};