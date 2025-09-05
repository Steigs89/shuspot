// Backend API Example for Stripe Integration
// This is an example of what you need to implement on your backend server
// You can use Node.js/Express, Python/Django, or any other backend framework

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(express.json());

// CORS middleware (adjust origins for production)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next();
});

// Create Stripe Checkout Session
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { priceId, userId, email, trialDays, successUrl, cancelUrl } = req.body;

    // Create or retrieve customer
    let customer;
    try {
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      if (customers.data.length > 0) {
        customer = customers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: email,
          metadata: {
            userId: userId
          }
        });
      }
    } catch (error) {
      console.error('Error creating/retrieving customer:', error);
      return res.status(500).json({ error: 'Failed to create customer' });
    }

    // Create checkout session
    const sessionConfig = {
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId
      }
    };

    // Add trial period if applicable
    if (trialDays > 0) {
      sessionConfig.subscription_data = {
        trial_period_days: trialDays,
        metadata: {
          userId: userId
        }
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({
      checkoutUrl: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel Subscription
app.post('/api/stripe/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    res.json({ success: true, subscription });

  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Customer Portal Session
app.post('/api/stripe/create-customer-portal', async (req, res) => {
  try {
    const { customerId } = req.body;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.FRONTEND_URL || 'http://localhost:3000/dashboard',
    });

    res.json({ url: session.url });

  } catch (error) {
    console.error('Error creating customer portal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify Subscription Status
app.get('/api/stripe/verify-subscription/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    res.json({
      id: subscription.id,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      trial_start: subscription.trial_start,
      trial_end: subscription.trial_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      customer: subscription.customer
    });

  } catch (error) {
    console.error('Error verifying subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe Webhook Handler
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log('Webhook signature verification failed.', err.message);
    return res.status(400).send('Webhook signature verification failed.');
  }

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
      console.log('Subscription created:', event.data.object);
      // Update your database with the new subscription
      handleSubscriptionCreated(event.data.object);
      break;

    case 'customer.subscription.updated':
      console.log('Subscription updated:', event.data.object);
      // Update subscription status in your database
      handleSubscriptionUpdated(event.data.object);
      break;

    case 'customer.subscription.deleted':
      console.log('Subscription deleted:', event.data.object);
      // Handle subscription cancellation
      handleSubscriptionDeleted(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      console.log('Payment succeeded:', event.data.object);
      // Handle successful payment
      handlePaymentSucceeded(event.data.object);
      break;

    case 'invoice.payment_failed':
      console.log('Payment failed:', event.data.object);
      // Handle failed payment
      handlePaymentFailed(event.data.object);
      break;

    default:
      console.log('Unhandled event type:', event.type);
  }

  res.json({ received: true });
});

// Helper functions to update your database
async function handleSubscriptionCreated(subscription) {
  // Update your database with the new subscription
  // Example:
  // await db.subscriptions.create({
  //   stripe_subscription_id: subscription.id,
  //   customer_id: subscription.customer,
  //   status: subscription.status,
  //   current_period_start: new Date(subscription.current_period_start * 1000),
  //   current_period_end: new Date(subscription.current_period_end * 1000),
  //   trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
  //   trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
  // });
}

async function handleSubscriptionUpdated(subscription) {
  // Update subscription in your database
  // Example:
  // await db.subscriptions.update({
  //   status: subscription.status,
  //   current_period_start: new Date(subscription.current_period_start * 1000),
  //   current_period_end: new Date(subscription.current_period_end * 1000),
  //   cancel_at_period_end: subscription.cancel_at_period_end,
  // }, {
  //   where: { stripe_subscription_id: subscription.id }
  // });
}

async function handleSubscriptionDeleted(subscription) {
  // Handle subscription deletion
  // Example:
  // await db.subscriptions.update({
  //   status: 'canceled',
  //   canceled_at: new Date()
  // }, {
  //   where: { stripe_subscription_id: subscription.id }
  // });
}

async function handlePaymentSucceeded(invoice) {
  // Handle successful payment
  // You might want to send a confirmation email, update user access, etc.
}

async function handlePaymentFailed(invoice) {
  // Handle failed payment
  // You might want to send a notification email, update user access, etc.
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Environment Variables you need to set:
// STRIPE_SECRET_KEY=sk_test_... (your Stripe secret key)
// STRIPE_WEBHOOK_SECRET=whsec_... (your webhook endpoint secret)
// FRONTEND_URL=http://localhost:3000 (your frontend URL)

module.exports = app;