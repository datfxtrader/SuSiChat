import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

console.log('🔧 Environment check:');
console.log('REPL_ID:', process.env.REPL_ID);
console.log('REPL_OWNER:', process.env.REPL_OWNER);  
console.log('REPL_SLUG:', process.env.REPL_SLUG);
console.log('REPLIT_DOMAINS:', process.env.REPLIT_DOMAINS);

if (!process.env.REPLIT_DOMAINS && !process.env.REPL_ID) {
  throw new Error("Neither REPLIT_DOMAINS nor REPL_ID environment variables are provided");
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

  // Get the actual Replit app URL for callbacks
  const replId = process.env.REPL_ID;
  const replOwner = process.env.REPL_OWNER;
  const replSlug = process.env.REPL_SLUG;
  
  // Construct the proper Replit callback URL
  let callbackURL;
  if (replId && replOwner && replSlug) {
    callbackURL = `https://${replSlug}.${replOwner}.repl.co/api/callback`;
  } else if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(",");
    callbackURL = `https://${domains[0]}/api/callback`;
  } else {
    callbackURL = `https://0.0.0.0:5000/api/callback`;
  }

  console.log('🔧 OAuth callback URL configured as:', callbackURL);

  // Register primary strategy with correct callback URL
  const strategy = new Strategy(
    {
      name: `replitauth:primary`,
      config,
      scope: "openid email profile offline_access",
      callbackURL: callbackURL,
    },
    verify,
  );
  passport.use(strategy);

  // Register fallback strategies for development
  const fallbackHosts = ['0.0.0.0:5000', 'localhost:5000'];
  for (const host of fallbackHosts) {
    const fallbackStrategy = new Strategy(
      {
        name: `replitauth:${host}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: callbackURL, // Use the same callback URL
      },
      verify,
    );
    passport.use(fallbackStrategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    console.log("Login attempt from:", req.headers.host);
    console.log("Using primary authentication strategy");
    
    passport.authenticate("replitauth:primary", {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
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

    console.log("Processing callback with primary strategy");

    // Add timeout protection
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        console.error('OAuth callback timeout');
        res.redirect('/?error=timeout');
      }
    }, 25000);

    passport.authenticate("replitauth:primary", { 
      failureRedirect: "/?error=auth_failed",
      failureFlash: false
    })(req, res, (err) => {
      clearTimeout(timeoutId);
      if (err) {
        console.error('OAuth authentication error:', err);
        return res.redirect('/?error=auth_error');
      }
      next();
    });
  }, (req, res) => {
    if (res.headersSent) return;
    
    console.log("Authentication successful for user:", req.user);
    
    try {
      // Quick redirect without session save to prevent timeout
      res.redirect("/chat");
    } catch (error) {
      console.error('Redirect error:', error);
      if (!res.headersSent) {
        res.redirect('/?error=redirect_failed');
      }
    }
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