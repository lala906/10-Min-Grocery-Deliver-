const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_123'); // Dummy fallback

const createPaymentIntent = async (req, res, next) => {
    try {
        const { amount } = req.body;

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Stripe expects cents
            currency: 'inr',
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { createPaymentIntent };
