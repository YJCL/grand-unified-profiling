import Stripe from 'stripe';

// シークレットキーはサーバー環境変数のみ（クライアントに出さない）
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
