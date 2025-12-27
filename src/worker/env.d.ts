interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  MOCHA_USERS_SERVICE_API_URL: string;
}
