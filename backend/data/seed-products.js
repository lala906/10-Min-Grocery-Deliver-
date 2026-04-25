/**
 * seed-products.js
 * ---------------------------------------------------------
 * Standalone seeder: Creates 10 grocery categories then
 * inserts 200+ realistic Indian grocery products linked to
 * those categories via ObjectId references.
 *
 * Usage:
 *   node data/seed-products.js          → import products
 *   node data/seed-products.js --clear  → delete all products & categories
 * ---------------------------------------------------------
 */

const mongoose = require('mongoose');
const dotenv    = require('dotenv');

dotenv.config();

const Category = require('../models/Category');
const Product  = require('../models/Product');

// ─── Helpers ─────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;

// ─── Category Definitions ────────────────────────────────
const CATEGORIES = [
    {
        name: 'Fruits & Vegetables',
        description: 'Fresh seasonal fruits and vegetables sourced daily from farms.',
        image: 'https://images.unsplash.com/photo-1543168256-418811576931?w=400',
    },
    {
        name: 'Dairy & Eggs',
        description: 'Farm-fresh milk, cheese, butter, curd, and eggs.',
        image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
    },
    {
        name: 'Snacks & Beverages',
        description: 'Chips, namkeen, juices, soft drinks and more.',
        image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400',
    },
    {
        name: 'Atta, Rice & Dal',
        description: 'Staple grains, pulses, and flours for every Indian kitchen.',
        image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
    },
    {
        name: 'Oil, Ghee & Masala',
        description: 'Cooking oils, pure ghee, and everyday spices.',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400',
    },
    {
        name: 'Bakery & Biscuits',
        description: 'Fresh breads, cakes, cookies, and biscuits.',
        image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400',
    },
    {
        name: 'Frozen Food',
        description: 'Frozen vegetables, meats, and ready-to-cook items.',
        image: 'https://images.unsplash.com/photo-1527590000983-94a673e4f4fe?w=400',
    },
    {
        name: 'Personal Care',
        description: 'Soaps, shampoos, skincare, and hygiene essentials.',
        image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400',
    },
    {
        name: 'Cleaning Essentials',
        description: 'Detergents, floor cleaners, dishwash, and more.',
        image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400',
    },
    {
        name: 'Instant & Ready-to-Eat',
        description: 'Instant noodles, soups, meals, and quick-cook packs.',
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400',
    },
];

// ─── Product Data Per Category ────────────────────────────
/**
 * Each entry: [name, subcategory, price, unit, stock, rating, description, discount?]
 * discount is optional (0 means no discount listed)
 */
const PRODUCT_DATA = {
    'Fruits & Vegetables': [
        ['Amul Organic Banana (Dozen)', 'Fruits', 49, 'piece', 80, 4.3, '12 fresh organic bananas, naturally ripened. Rich in potassium and energy.', 5],
        ['Red Apple (1 kg)', 'Fruits', 149, 'kg', 60, 4.5, 'Crisp and juicy Shimla Apples, perfect for snacking and baking.', 10],
        ['Sweet Lime (Mosambi) 1 kg', 'Fruits', 59, 'kg', 45, 4.1, 'Freshly sourced sweet limes, great for juice and vitamin C boost.', 0],
        ['Watermelon (Whole)', 'Fruits', 79, 'piece', 30, 4.4, 'Seedless watermelon, chilled and refreshing. Perfect summer fruit.', 0],
        ['Papaya (1 kg)', 'Fruits', 45, 'kg', 50, 4.0, 'Ripe, organic papaya rich in digestive enzymes. Good for gut health.', 5],
        ['Green Grapes (500 g)', 'Fruits', 89, 'g', 40, 4.2, 'Seedless green grapes, sweet and crisp. Ideal for fruit salads.', 0],
        ['Mango Alphonso (500 g)', 'Fruits', 199, 'g', 25, 4.7, 'Premium Alphonso mangoes from Ratnagiri. The king of fruits.', 0],
        ['Pineapple (1 piece)', 'Fruits', 69, 'piece', 35, 4.1, 'Fresh pineapple, sweet and tangy. Great for smoothies and curries.', 0],
        ['Guava (1 kg)', 'Fruits', 39, 'kg', 55, 4.3, 'Fragrant, ripe guavas loaded with Vitamin C and dietary fibre.', 0],
        ['Pomegranate (500 g)', 'Fruits', 99, 'g', 45, 4.5, 'Juicy pomegranate arils, antioxidant-rich and full of flavour.', 5],
        ['Fresh Tomato (1 kg)', 'Vegetables', 35, 'kg', 100, 4.2, 'Firm and ripe red tomatoes, essential for curries and salads.', 0],
        ['Onion (1 kg)', 'Vegetables', 29, 'kg', 120, 4.0, 'Fresh red onions sourced from Nashik. A kitchen staple.', 0],
        ['Potato (1 kg)', 'Vegetables', 25, 'kg', 150, 4.1, 'Washed Agra potatoes, great for frying, boiling, and curries.', 0],
        ['Green Capsicum (500 g)', 'Vegetables', 49, 'g', 70, 4.3, 'Crisp and mild green bell peppers. Ideal for stir-fries and pizzas.', 0],
        ['Carrot (500 g)', 'Vegetables', 39, 'g', 80, 4.4, 'Farm-fresh organic carrots, sweet and crunchy. Rich in beta-carotene.', 0],
        ['Cauliflower (1 piece)', 'Vegetables', 45, 'piece', 60, 4.2, 'White, firm cauliflower head. Perfect for gobi sabzi and aloo gobi.', 5],
        ['Palak (Spinach) 250 g', 'Vegetables', 29, 'g', 75, 4.0, 'Fresh tender spinach leaves, great for palak paneer and smoothies.', 0],
        ['Brinjal / Baingan (500 g)', 'Vegetables', 35, 'g', 65, 3.9, 'Purple brinjals for bhartha, sabzi, and dal preparations.', 0],
        ['Bitter Gourd (Karela) 500 g', 'Vegetables', 45, 'g', 50, 3.8, 'Freshly cut bitter gourds. Known for managing blood sugar levels.', 0],
        ['Cucumber (500 g)', 'Vegetables', 29, 'g', 90, 4.2, 'Cool and crunchy cucumbers, perfect for raita and salads.', 0],
        ['Beetroot (500 g)', 'Vegetables', 35, 'g', 55, 4.3, 'Earth-fresh whole beetroots. Great for salads, juices, and halwa.', 0],
        ['Lady Finger / Bhindi (500 g)', 'Vegetables', 39, 'g', 60, 4.1, 'Tender young okra, ideal for bhindi masala and stir-fry.', 0],
        ['Green Peas (500 g)', 'Vegetables', 55, 'g', 45, 4.4, 'Fresh shelled green peas. Perfect for pulao, curries, and soups.', 0],
        ['Cabbage (1 piece)', 'Vegetables', 35, 'piece', 70, 4.0, 'Firm white cabbage head for coleslaw, sabzi, and stir-fry dishes.', 5],
        ['Lemon (200 g)', 'Vegetables', 25, 'g', 100, 4.5, 'Juicy lemons for daily cooking, nimbu pani, and pickling.', 0],
    ],

    'Dairy & Eggs': [
        ['Amul Taaza Milk (1 L Tetra)', 'Milk', 74, 'litre', 200, 4.5, 'UHT processed milk, no preservatives. Ready to drink straight from pack.', 0],
        ['Amul Gold Full Cream Milk (500 ml)', 'Milk', 34, 'ml', 180, 4.6, 'Rich and creamy full-cream milk. Great for kids and active adults.', 0],
        ['Mother Dairy Cow Milk (1 L)', 'Milk', 58, 'litre', 150, 4.4, 'Pasteurised cow milk, fresh and pure from Delhi cooperative farms.', 0],
        ['Amul Butter (500 g)', 'Butter', 279, 'g', 90, 4.7, 'Creamy salted butter made from fresh cream. Ideal for toast and baking.', 5],
        ['Amul Cheese Slices (200 g)', 'Cheese', 159, 'g', 75, 4.5, 'Processed cheese slices, perfectly melty for sandwiches and burgers.', 0],
        ['Britannia Cheddar Cheese Block (400 g)', 'Cheese', 389, 'g', 40, 4.3, 'Mature cheddar block, great for grating, cooking, and cheeseboards.', 10],
        ['Amul Mozzarella Cheese (200 g)', 'Cheese', 199, 'g', 55, 4.4, 'Stretchy and mild mozzarella, perfect for pizzas and pasta bakes.', 0],
        ['Nestle Milkmaid Condensed Milk (400 g)', 'Condensed Milk', 189, 'g', 70, 4.6, 'Sweetened condensed milk for desserts, kheer, and barfis.', 0],
        ['Amul Dahi (500 g)', 'Curd', 49, 'g', 160, 4.5, 'Thick set curd made from whole milk. Probiotic-rich and fresh daily.', 0],
        ['Epigamia Greek Yogurt Plain (400 g)', 'Yogurt', 149, 'g', 60, 4.4, 'Creamy strained Greek yogurt, high protein. No artificial flavours.', 5],
        ['Amul Ghee (1 L Tin)', 'Ghee', 649, 'litre', 80, 4.7, '100% pure cow ghee, traditionally churned. Rich aroma and flavour.', 0],
        ['Patanjali Cow Ghee (500 ml)', 'Ghee', 299, 'ml', 65, 4.3, 'Desi cow ghee from Patanjali farms. Great for roti, dal, and puja.', 0],
        ['Farm Fresh Eggs (Pack of 12)', 'Eggs', 89, 'pack', 120, 4.5, 'Free-range eggs from happy hens, rich in protein and Omega-3.', 0],
        ['Amul Toned Milk Pouch (500 ml)', 'Milk', 27, 'ml', 200, 4.3, 'Low-fat toned milk, ideal for tea, coffee, and light cooking.', 0],
        ['Akshayakalpa Organic Milk (1 L)', 'Milk', 89, 'litre', 45, 4.7, 'Certified organic cow milk, antibiotic-free from pasture-fed cows.', 0],
        ['Amul Lassi (200 ml Tetra)', 'Lassi', 25, 'ml', 130, 4.3, 'Sweet flavoured lassi, chilled and refreshing. No added colours.', 0],
        ['Go Paneer (200 g)', 'Paneer', 99, 'g', 85, 4.4, 'Soft and fresh paneer made from cow milk. Great for curries.', 5],
        ['Amul Paneer (500 g Pouch)', 'Paneer', 235, 'g', 70, 4.5, 'Smooth and firm paneer, ready to use for butter masala and tikka.', 0],
        ['Nandini Butter (100 g)', 'Butter', 55, 'g', 95, 4.4, 'Karnataka cooperative butter, fresh and flavourful for daily use.', 0],
        ['Amul Cream (200 ml)', 'Cream', 65, 'ml', 80, 4.5, 'Fresh cooking cream with 25% fat. Perfect for gravies and desserts.', 0],
    ],

    'Snacks & Beverages': [
        ['Lay\'s Classic Salted Chips (78 g)', 'Chips', 30, 'g', 200, 4.2, 'Crispy potato chips with light salt seasoning. Perfect party snack.', 0],
        ['Kurkure Masala Munch (90 g)', 'Chips', 25, 'g', 200, 4.3, 'Spicy corn puffs with tangy masala flavour. A desi favourite.', 0],
        ['Bingo Mad Angles (76 g)', 'Chips', 30, 'g', 180, 4.1, 'Triangle-shaped chips with achaari flavour. Crunchy and bold.', 0],
        ['Haldiram\'s Aloo Bhujia (200 g)', 'Namkeen', 79, 'g', 150, 4.5, 'Classic Bikaner-style sev and spiced potato straws. Addictive crunch.', 0],
        ['Haldiram\'s Moong Dal (200 g)', 'Namkeen', 79, 'g', 140, 4.4, 'Lightly fried moong dal namkeen, seasoned with tangy spices.', 0],
        ['Too Yumm! Multigrain Chips (45 g)', 'Chips', 20, 'g', 170, 4.0, 'Baked multigrain chips with less oil. A healthier snack choice.', 0],
        ['Pepsi (750 ml PET)', 'Soft Drinks', 45, 'ml', 100, 4.0, 'Classic Pepsi cola drink, chilled and fizzy for any occasion.', 0],
        ['Coca-Cola (500 ml PET)', 'Soft Drinks', 40, 'ml', 110, 4.1, 'The original Coca-Cola, refreshing and effervescent.', 0],
        ['Tropicana Orange Juice (1 L)', 'Juices', 125, 'litre', 90, 4.3, '100% pure orange juice, no added sugar. Rich in Vitamin C.', 5],
        ['Real Fruit Power Mixed Fruit (1 L)', 'Juices', 115, 'litre', 85, 4.2, 'Blended fruit juice with apple, mango, and guava. No preservatives.', 0],
        ['Minute Maid Nimbu Fresh (400 ml)', 'Juices', 49, 'ml', 130, 4.0, 'Refreshing lemon drink, great chilled on hot days.', 0],
        ['Red Bull Energy Drink (250 ml)', 'Energy Drinks', 125, 'ml', 75, 4.3, 'Original energy drink with taurine, caffeine, and B-vitamins.', 0],
        ['Paper Boat Jaljeera (250 ml)', 'Ethnic Drinks', 30, 'ml', 120, 4.4, 'Tangy cumin-coriander drink, a desi summer coolant.', 0],
        ['Nescafé Classic Jar (100 g)', 'Coffee', 285, 'g', 100, 4.6, 'Rich instant coffee granules for a perfect cup of café-style coffee.', 0],
        ['Tata Tea Gold (500 g)', 'Tea', 299, 'g', 110, 4.5, 'Premium Assam tea leaves with long leaves for strong, aromatic chai.', 5],
        ['Green Tea Lipton Honey Lemon (25 bags)', 'Tea', 149, 'pack', 90, 4.2, 'Refreshing green tea bags, infused with honey and lemon flavour.', 0],
        ['Horlicks Original (500 g)', 'Health Drinks', 349, 'g', 70, 4.3, 'Classic malt-based health drink for strong bones and immunity.', 0],
        ['Complan Royale Chocolate (500 g)', 'Health Drinks', 399, 'g', 65, 4.1, 'Protein-rich chocolate health drink for growing children.', 0],
        ['Bournvita (500 g)', 'Health Drinks', 355, 'g', 80, 4.4, 'Cadbury chocolate malt drink with DHA and 15 vital nutrients.', 0],
        ['Minute Maid Pulpy Orange (400 ml)', 'Juices', 45, 'ml', 120, 4.2, 'Juicy orange drink with real orange pulp for extra freshness.', 0],
        ['Thums Up (750 ml)', 'Soft Drinks', 45, 'ml', 100, 4.3, 'Strong cola with a bold, refreshing taste. India\'s favourite.', 0],
        ['Limca (750 ml)', 'Soft Drinks', 45, 'ml', 95, 4.0, 'Lime and lemon flavoured drink, zingy and refreshing.', 0],
        ['Sting Energy Drink (250 ml)', 'Energy Drinks', 50, 'ml', 85, 4.1, 'Affordable energy drink with natural flavours and caffeine.', 0],
    ],

    'Atta, Rice & Dal': [
        ['Aashirvaad Whole Wheat Atta (5 kg)', 'Atta', 249, 'kg', 80, 4.6, 'Whole wheat atta with high fibre and bran for healthy rotis.', 5],
        ['Pillsbury Chakki Fresh Atta (5 kg)', 'Atta', 239, 'kg', 75, 4.4, 'Stone-ground whole wheat atta for soft, nutritious rotis.', 0],
        ['Rajdhani Multi-Grain Atta (5 kg)', 'Atta', 289, 'kg', 60, 4.3, 'Blend of wheat, soya, oats, and maize for balanced nutrition.', 0],
        ['Fortune Maida (1 kg)', 'Maida', 45, 'kg', 100, 4.1, 'Fine white refined flour for biscuits, bread, and Indian sweets.', 0],
        ['Patanjali Besan (1 kg)', 'Flour', 65, 'kg', 90, 4.3, 'Pure chana dal flour for pakodas, batter, and sweets like besan ladoo.', 0],
        ['MTR Idli Rava (1 kg)', 'Semolina', 79, 'kg', 80, 4.4, 'Ready-to-cook idli rava for fluffy and soft south-Indian idlis.', 0],
        ['Dawat Super Rozana Basmati Rice (5 kg)', 'Rice', 399, 'kg', 65, 4.5, 'Extra-long grain aged basmati rice with natural aroma.', 10],
        ['India Gate Classic Basmati Rice (5 kg)', 'Rice', 449, 'kg', 60, 4.6, 'Premium aged basmati from fields of Dehradun, restaurant quality.', 0],
        ['Tata Sampann Kolam Rice (5 kg)', 'Rice', 279, 'kg', 70, 4.2, 'Short-grain Kolam rice for everyday cooking, idli, and khichdi.', 0],
        ['Sona Masoori Rice (5 kg)', 'Rice', 320, 'kg', 75, 4.4, 'Light and aromatic Andhra rice, low starch and easy to digest.', 5],
        ['Tata Sampann Tuvar Dal (1 kg)', 'Dal', 129, 'kg', 110, 4.4, 'Polished toor dal with natural oils for a rich and flavourful dal.', 0],
        ['Tata Sampann Chana Dal (1 kg)', 'Dal', 119, 'kg', 100, 4.3, 'Split chickpea lentils, great for dal, halwa, and snacks.', 0],
        ['Tata Sampann Moong Dal (500 g)', 'Dal', 69, 'g', 95, 4.2, 'Split and husked moong dal, easy to cook and light to digest.', 0],
        ['Rajdhani Masoor Dal (1 kg)', 'Dal', 115, 'kg', 90, 4.3, 'Red lentils that cook quickly with a mild, earthy flavour.', 0],
        ['Tata Sampann Urad Dal (500 g)', 'Dal', 75, 'g', 85, 4.2, 'White urad dal for dal makhani, idli batter, and vadas.', 0],
        ['Haldiram\'s Roasted Chana (200 g)', 'Pulses', 49, 'g', 120, 4.4, 'Crunchy roasted chickpeas, a protein-rich low-calorie snack.', 0],
        ['Saffola Oats (1 kg)', 'Oats', 249, 'kg', 75, 4.5, 'Rolled oats, certified heart-healthy. Ideal for breakfast and baking.', 5],
        ['Quaker Oats (1 kg)', 'Oats', 259, 'kg', 70, 4.4, 'Quick-cook oats, high in beta-glucan fibre. Promotes heart health.', 0],
        ['Nature\'s Promise Quinoa (500 g)', 'Supergrains', 349, 'g', 45, 4.5, 'Organic quinoa grain, complete protein source for salads and bowls.', 0],
        ['Annapurna Suji (1 kg)', 'Semolina', 55, 'kg', 95, 4.2, 'Fine semolina for halwa, upma, idli, and rava dosas.', 0],
    ],

    'Oil, Ghee & Masala': [
        ['Fortune Sunflower Oil (1 L)', 'Oil', 145, 'litre', 120, 4.4, 'Refined sunflower oil, light in taste and rich in Vitamin E.', 5],
        ['Saffola Gold Oil (1 L)', 'Oil', 199, 'litre', 100, 4.5, 'Dual-seed blended oil with LOSORB technology for less oil absorption.', 0],
        ['Dhara Mustard Oil (1 L)', 'Oil', 175, 'litre', 110, 4.3, 'Cold-pressed kachi ghani mustard oil, pungent and aromatic.', 0],
        ['Fortune Refined Rice Bran Oil (1 L)', 'Oil', 169, 'litre', 90, 4.2, 'Light and healthy rice bran oil with natural oryzanol antioxidants.', 0],
        ['Figaro Olive Oil (500 ml)', 'Oil', 389, 'ml', 55, 4.6, 'Pure olive oil imported from Spain, ideal for salads and light cooking.', 0],
        ['Amul Pure Ghee (1 L Tin)', 'Ghee', 649, 'litre', 80, 4.7, 'Authentic cow ghee made by traditional churning. Purest quality.', 0],
        ['Britannia Nutralite (500 g)', 'Butter Spread', 149, 'g', 70, 4.2, 'Omega-3 enriched table spread, healthier alternative to butter.', 0],
        ['MDH Chana Masala (100 g)', 'Masala', 65, 'g', 150, 4.5, 'Authentic blend of spices for tangy, flavourful chana curry.', 0],
        ['MDH Garam Masala (100 g)', 'Masala', 75, 'g', 140, 4.6, 'Whole spice powder blend to elevate any Indian curry or biryani.', 0],
        ['Everest Pav Bhaji Masala (100 g)', 'Masala', 60, 'g', 130, 4.4, 'Ready spice blend for Mumbai-style pav bhaji. Perfect balance.', 0],
        ['Everest Chicken Masala (100 g)', 'Masala', 70, 'g', 120, 4.5, 'Aromatic masala blend for rich chicken curry and tikka.', 0],
        ['Catch Black Pepper (50 g)', 'Spices', 90, 'g', 110, 4.4, 'Whole black peppercorns, freshly packed for maximum aroma.', 0],
        ['Tata Salt (1 kg)', 'Salt', 22, 'kg', 200, 4.6, 'Vacuum-evaporated iodised salt with minerals for daily nutrition.', 0],
        ['Catch Cumin Seeds (100 g)', 'Spices', 55, 'g', 130, 4.3, 'Whole jeera seeds, earthy and aromatic. Great for tempering.', 0],
        ['Catch Red Chilli Powder (100 g)', 'Spices', 45, 'g', 140, 4.2, 'Bright red and medium-hot chilli powder for vibrant curries.', 0],
        ['Badshah Rajwadi Masala (100 g)', 'Masala', 80, 'g', 115, 4.5, 'All-purpose Rajasthani masala blend for elaborate Indian dishes.', 5],
        ['MDH Sambhar Masala (100 g)', 'Masala', 65, 'g', 125, 4.4, 'South Indian spice blend for sambar, rasam, and chutneys.', 0],
        ['Patanjali Haldi Powder (200 g)', 'Spices', 40, 'g', 160, 4.3, 'Pure turmeric powder with high curcumin content, anti-inflammatory.', 0],
        ['Everest Biryani Masala (50 g)', 'Masala', 50, 'g', 135, 4.5, 'Fragrant blend of whole spices for perfect biryani and pulao.', 0],
        ['Sugar (1 kg)', 'Sugar', 42, 'kg', 180, 4.3, 'White refined sugar for everyday cooking, baking, and beverages.', 0],
    ],

    'Bakery & Biscuits': [
        ['Britannia Good Day Butter Cookies (500 g)', 'Biscuits', 99, 'g', 150, 4.5, 'Buttery and crumbly cookies with a melt-in-the-mouth texture.', 0],
        ['Parle-G Glucose Biscuits (800 g)', 'Biscuits', 65, 'g', 200, 4.6, 'India\'s favourite glucose biscuit, a classic since 1939.', 0],
        ['Oreo Original (120 g)', 'Biscuits', 30, 'g', 180, 4.4, 'Twin chocolate wafer biscuit with vanilla cream filling. Twist, lick, dunk!', 0],
        ['Monaco Classic Salted Crackers (200 g)', 'Biscuits', 35, 'g', 170, 4.3, 'Light and crispy salted crackers, perfect with cheese and dips.', 0],
        ['Sunfeast Dark Fantasy Choco Fills (300 g)', 'Biscuits', 85, 'g', 140, 4.5, 'Rich chocolate filling inside crispy butter biscuit shells. Indulgent.', 5],
        ['McVitie\'s Digestive (400 g)', 'Biscuits', 120, 'g', 100, 4.4, 'Whole wheat digestive biscuits with oat bran. Great with tea.', 0],
        ['Mother\'s Recipe Namkeen Mathri (200 g)', 'Snack Bread', 79, 'g', 90, 4.3, 'Crispy deep-fried mathri seasoned with ajwain and black pepper.', 0],
        ['Britannia Bourbon (150 g)', 'Biscuits', 25, 'g', 160, 4.3, 'Chocolate cream-filled biscuit sandwich with intense cocoa flavour.', 0],
        ['Britannia 50-50 Maska Chaska (250 g)', 'Biscuits', 45, 'g', 155, 4.2, 'Tangy and sweet biscuit with black pepper and salt. Unique taste.', 0],
        ['Jim Jam Cream Biscuits (200 g)', 'Biscuits', 35, 'g', 140, 4.1, 'Biscuits filled with fruity jam, loved by children.', 0],
        ['English Oven Sandwich Bread (400 g)', 'Bread', 55, 'g', 120, 4.3, 'Soft white sandwich bread, preservative-free from the bakery.', 0],
        ['Harvest Gold White Bread (400 g)', 'Bread', 50, 'g', 130, 4.2, 'Soft and airy white sliced bread, perfect for toast and sandwiches.', 0],
        ['Britannia Whole Wheat Bread (400 g)', 'Bread', 60, 'g', 100, 4.4, 'Nutritious whole wheat bread with fibre and no maida. Healthy choice.', 5],
        ['Monginis Chocolate Pastry (1 piece)', 'Cakes', 75, 'piece', 60, 4.4, 'Soft chocolate cake slice with creamy frosting. Freshly baked daily.', 0],
        ['Bisk Farm Ragi Biscuits (200 g)', 'Biscuits', 55, 'g', 80, 4.2, 'Finger millet biscuits, nutritious and mildly sweet. Guilt-free snack.', 0],
        ['Anmol All-Time Cream Biscuits (200 g)', 'Biscuits', 40, 'g', 145, 4.0, 'Sandwich cream biscuits in vanilla flavour, a family favourite.', 0],
        ['Pillsbury Brownie Mix (200 g)', 'Baking', 99, 'g', 55, 4.3, 'Ready mix for fudgy home-made brownies. Just add eggs and oil.', 0],
        ['EKO Gluten-Free Oat Cookies (150 g)', 'Biscuits', 179, 'g', 40, 4.5, 'Gluten-free oat cookies with jaggery, great for health-conscious snacking.', 0],
    ],

    'Frozen Food': [
        ['McCain Smiles (420 g)', 'Frozen Snacks', 199, 'g', 80, 4.4, 'Smiley-shaped potato snacks, crispy outside and fluffy inside. Kids love them.', 5],
        ['McCain French Fries (425 g)', 'Frozen Snacks', 189, 'g', 90, 4.5, 'Straight-cut French fries, oven or air-fryer ready. Crispy perfection.', 0],
        ['Vadilal Punjabi Samosa (400 g)', 'Frozen Snacks', 149, 'g', 75, 4.2, 'Spiced potato and pea samosas, crispy and ready to fry or bake.', 0],
        ['ITC Master Chef Seekh Kebab (250 g)', 'Frozen Meat', 249, 'g', 55, 4.4, 'Minced mutton seekh kebabs, smoky and rich. Grill or bake at home.', 0],
        ['Godrej Yummiez Chicken Nuggets (400 g)', 'Frozen Chicken', 299, 'g', 65, 4.3, 'Crunchy breaded chicken nuggets, ready in minutes. Great with dips.', 0],
        ['Suguna Fresh Chicken Breast Fillets (500 g)', 'Frozen Chicken', 349, 'g', 50, 4.4, 'Boneless skinless chicken breast, clean and fresh frozen at source.', 5],
        ['Vadilal Veg Biryani (300 g)', 'Frozen Meals', 189, 'g', 70, 4.1, 'Ready-to-heat vegetable biryani with fragrant basmati and spices.', 0],
        ['Amul Pizza Base (2 pieces)', 'Frozen Dough', 99, 'piece', 85, 4.2, 'Pre-baked pizza bases for homemade pizzas. Crispy and thin-crust.', 0],
        ['Innovative Foods Squid (200 g)', 'Frozen Seafood', 299, 'g', 35, 3.9, 'Cleaned and cut squid rings, ready for frying or grilling.', 0],
        ['McCain Corn Nibbles (400 g)', 'Frozen Snacks', 179, 'g', 75, 4.3, 'Crispy corn bites, coated in seasoned breadcrumbs. Air-fry in minutes.', 0],
        ['Haldiram\'s Dal Makhani (285 g)', 'Frozen Meals', 149, 'g', 80, 4.4, 'Restaurant-style dal makhani, microwave ready in 3 minutes.', 0],
        ['Sagar Frozen Paratha (5 pieces)', 'Frozen Bread', 119, 'piece', 90, 4.3, 'Whole wheat layered parathas, ready to cook on a tawa in 3 minutes.', 0],
        ['Creamline Frozen Peas (500 g)', 'Frozen Vegetables', 75, 'g', 100, 4.4, 'Flash-frozen green peas, retain full nutrition and bright green colour.', 0],
        ['Cargill Frozen Corn (500 g)', 'Frozen Vegetables', 79, 'g', 95, 4.3, 'Sweet corn kernels, flash-frozen for freshness. Great for salads and soups.', 0],
        ['Satnam Surimi Fish Balls (200 g)', 'Frozen Seafood', 199, 'g', 40, 4.0, 'Fish-based surimi balls for soups, noodles, and Asian stir-fries.', 0],
        ['Godrej Real Good Frozen Meatballs (200 g)', 'Frozen Meat', 219, 'g', 45, 4.2, 'Juicy chicken meatballs in ready-to-cook pack. Great for pasta and curries.', 0],
        ['ITC Master Chef Veg Seekh Kebab (250 g)', 'Frozen Snacks', 199, 'g', 60, 4.3, 'Spiced vegetable seekh kebabs, paneer-rich and oven-ready.', 5],
        ['Vadilal Mango Ice Cream (750 ml)', 'Frozen Desserts', 249, 'ml', 55, 4.5, 'Creamy Alphonso mango ice cream, the perfect summer treat.', 0],
        ['Amul Chocolate Ice Cream (750 ml)', 'Frozen Desserts', 229, 'ml', 65, 4.4, 'Rich dark chocolate ice cream made with real cocoa. A crowd favourite.', 0],
    ],

    'Personal Care': [
        ['Dove Beauty Bar Soap (75 g)', 'Soap', 49, 'g', 150, 4.6, 'Gentle moisturising soap with 1/4 cream. Leaves skin soft and smooth.', 0],
        ['Dettol Original Soap (125 g)', 'Soap', 45, 'g', 160, 4.5, 'Antibacterial soap with Dettol\'s proven germ protection formula.', 0],
        ['Nivea Creme (200 ml)', 'Moisturiser', 249, 'ml', 90, 4.5, 'All-purpose moisturising cream for face and body. For all skin types.', 5],
        ['Lakme Sunscreen SPF 50 (100 ml)', 'Sunscreen', 349, 'ml', 70, 4.4, 'Lightweight sunscreen with broad-spectrum SPF 50 protection.', 0],
        ['Pantene Shampoo (400 ml)', 'Shampoo', 299, 'ml', 100, 4.4, 'Pro-V formula shampoo for strong, shiny, and nourished hair.', 0],
        ['Head & Shoulders Anti-Dandruff Shampoo (340 ml)', 'Shampoo', 349, 'ml', 95, 4.5, 'Clinical-strength zinc pyrithione formula for dandruff-free scalp.', 5],
        ['Clinic Plus Shampoo (340 ml)', 'Shampoo', 199, 'ml', 110, 4.2, 'Milk protein-enriched shampoo for strong, thick, and shiny hair.', 0],
        ['Vatika Naturals Hair Oil (150 ml)', 'Hair Oil', 149, 'ml', 120, 4.3, 'Enriched with cactus and coconut extracts for hair fall control.', 0],
        ['Parachute Coconut Oil (200 ml)', 'Hair Oil', 89, 'ml', 140, 4.5, 'Pure 100% coconut oil, great for hair, skin, and cooking.', 0],
        ['Colgate Strong Teeth Toothpaste (300 g)', 'Dental Care', 109, 'g', 150, 4.5, 'Calcium-fortified toothpaste for stronger enamel and bright teeth.', 0],
        ['Pepsodent Germicheck (200 g)', 'Dental Care', 79, 'g', 140, 4.3, 'Germ-protection toothpaste with fluoride for whole-family use.', 0],
        ['Gillette Mach3 Razor Blades (4 count)', 'Shaving', 249, 'pack', 75, 4.5, '3-blade precision razors for a close, comfortable shave. Long-lasting.', 5],
        ['Dettol Hand Sanitizer (200 ml)', 'Hygiene', 99, 'ml', 160, 4.5, 'Instant germ-kill sanitizer with 70% IPA alcohol. No water needed.', 0],
        ['Whisper Ultra Clean Sanitary Pads (44 pads)', 'Feminine Care', 399, 'pack', 80, 4.6, 'XL-size pads with anti-bacterial protection for leak-free comfort.', 5],
        ['Stayfree Secure XL Pads (20 pads)', 'Feminine Care', 130, 'pack', 85, 4.4, 'Wide and long pads with cottony dry top for 8-hour protection.', 0],
        ['Old Spice Swagger Deodorant (150 ml)', 'Deodorant', 199, 'ml', 90, 4.4, '48-hour protection deodorant with masculine woody fragrance.', 0],
        ['Dove Go Fresh Deodorant (200 ml)', 'Deodorant', 199, 'ml', 85, 4.5, '48-hour freshness with 1/4 moisturising cream. No alcohol.', 0],
        ['Listerine Cool Mint Mouthwash (500 ml)', 'Dental Care', 249, 'ml', 80, 4.4, 'Antiseptic mouthwash that kills 99.9% of germs for fresh breath.', 5],
        ['Himalaya Neem Face Wash (150 ml)', 'Skincare', 129, 'ml', 120, 4.5, 'Purifying neem and turmeric face wash. Controls oiliness and pimples.', 0],
        ['Biotique Bio Papaya Scrub (75 g)', 'Skincare', 199, 'g', 65, 4.3, 'Enzyme-rich papaya face scrub for radiant and glowing skin.', 0],
    ],

    'Cleaning Essentials': [
        ['Ariel Matic Powder (2 kg)', 'Detergent', 375, 'kg', 90, 4.5, 'High-efficiency detergent for front-load and top-load machines.', 5],
        ['Surf Excel Matic Liquid (1 L)', 'Detergent', 349, 'litre', 85, 4.4, 'Concentrated liquid detergent dissolves easily in cold water.', 0],
        ['Tide Plus Power Powder (3 kg)', 'Detergent', 439, 'kg', 80, 4.3, 'Multi-benefit detergent that removes stains and brightens whites.', 0],
        ['Rin Bar (250 g)', 'Detergent', 29, 'g', 200, 4.3, 'Reliable washing bar for white clothes and daily stain removal.', 0],
        ['Vim Dishwash Liquid (750 ml)', 'Dishwash', 149, 'ml', 120, 4.5, 'Active lime formula cuts grease and leaves dishes sparkling clean.', 0],
        ['Pril Lemon Dish Soap (500 ml)', 'Dishwash', 119, 'ml', 110, 4.3, 'Lemon-fresh dishwash gel, tough on grease and gentle on hands.', 5],
        ['Colin Glass Cleaner (500 ml)', 'Surface Cleaner', 129, 'ml', 100, 4.4, 'Streak-free glass and mirror cleaner spray with fresh fragrance.', 0],
        ['Lizol Floor Cleaner Floral (1 L)', 'Floor Cleaner', 199, 'litre', 90, 4.5, 'Disinfectant floor cleaner that kills 99.9% germs with floral scent.', 0],
        ['Harpic Power Plus Toilet Cleaner (500 ml)', 'Toilet Cleaner', 99, 'ml', 110, 4.4, 'Thick formula that removes limescale, rust, and stains from toilet bowls.', 0],
        ['Domex Multi-Surface Cleaner (500 ml)', 'Surface Cleaner', 89, 'ml', 105, 4.3, 'Bleach-based disinfectant for floors, tiles, and bathroom surfaces.', 0],
        ['Good Knight Power Activ+ (45 nights)', 'Pest Control', 89, 'pack', 130, 4.3, 'Mosquito repellent liquid refill for all-night protection inside rooms.', 0],
        ['All Out Jumbo (2 refills)', 'Pest Control', 149, 'pack', 120, 4.4, 'Fast-action mosquito repellent, works through the night silently.', 0],
        ['Scotch-Brite Scrub Sponge (3 pcs)', 'Cleaning Tools', 99, 'pack', 140, 4.5, 'Dual side sponge for tough scrubbing and gentle wiping.', 0],
        ['Hit Fly Spray (400 ml)', 'Pest Control', 199, 'ml', 95, 4.3, 'Instant-kill spray for flies and mosquitoes without strong odour.', 0],
        ['Savlon Antiseptic Liquid (500 ml)', 'Disinfectant', 189, 'ml', 100, 4.5, 'Multi-purpose antiseptic for wounds, laundry, and floor mopping.', 5],
        ['Tata Gliko Hand Wash (200 ml)', 'Hand Wash', 65, 'ml', 150, 4.2, 'Gentle moisturising hand wash with aloe vera and antibacterial agents.', 0],
        ['Lifebuoy Total Hand Wash (500 ml Pump)', 'Hand Wash', 149, 'ml', 140, 4.4, 'Activ Silver formula hand wash for 10x better germ protection.', 0],
    ],

    'Instant & Ready-to-Eat': [
        ['Maggi 2-Minute Noodles (12 pack)', 'Noodles', 199, 'pack', 150, 4.5, 'Iconic instant noodles with Masala tastemaker. Ready in 2 minutes.', 5],
        ['Yippee Mood Masala Noodles (6 pack)', 'Noodles', 90, 'pack', 130, 4.3, 'Non-sticky, long and tasty instant noodles with spicy masala.', 0],
        ['Top Ramen Smoodles Masala (6 pack)', 'Noodles', 95, 'pack', 120, 4.2, 'Wavy noodles with a smooth and spicy masala sauce mix.', 0],
        ['Knorr Classic Tomato Soup (40 g)', 'Soups', 35, 'g', 140, 4.3, 'Smooth and creamy tomato soup mix, ready in just 5 minutes.', 0],
        ['Knorr Mixed Vegetable Soup (44 g)', 'Soups', 40, 'g', 130, 4.2, 'Thick and hearty veg soup mix with real dried vegetables.', 0],
        ['Haldiram\'s Pav Bhaji (300 g Pouch)', 'Ready Meals', 149, 'g', 90, 4.4, 'Mumbai-style pav bhaji, microwave in 3 minutes. Serve with pav.', 0],
        ['MTR Pongal (300 g)', 'Ready Meals', 149, 'g', 85, 4.3, 'Authentic South Indian ven pongal, ready to heat and eat.', 5],
        ['MTR Upma (200 g)', 'Ready Meals', 99, 'g', 100, 4.2, 'Ready-to-heat rava upma with ghee and South Indian tempering.', 0],
        ['Gits Gulab Jamun Mix (175 g)', 'Dessert Mix', 89, 'g', 110, 4.4, 'Instant mix for soft, syrupy gulab jamuns. Ready in 15 minutes.', 0],
        ['MTR Gulab Jamun Mix (500 g)', 'Dessert Mix', 149, 'g', 100, 4.5, 'Party pack mix for fluffy gulab jamuns, soaked in sugar syrup.', 0],
        ['Gits Dhokla Mix (200 g)', 'Snack Mix', 79, 'g', 95, 4.3, 'Instant Gujarati dhokla mix, fluffy and spongy. Ready in 20 minutes.', 0],
        ['MTR Khaman Mix (200 g)', 'Snack Mix', 70, 'g', 90, 4.2, 'Soft and spongy khaman dhokla mix with tempering sachets included.', 0],
        ['Kitchens of India Dal Makhani (285 g)', 'Ready Meals', 165, 'g', 75, 4.5, 'ITC restaurant-quality dal makhani made with whole black lentils.', 0],
        ['Kitchens of India Butter Chicken (285 g)', 'Ready Meals', 175, 'g', 70, 4.4, 'Creamy tomato-based butter chicken curry, ready to heat and serve.', 5],
        ['Cup Noodles by Nissin (75 g)', 'Noodles', 45, 'g', 160, 4.2, 'Self-cooking cup noodles, just add boiling water. Spicy masala flavour.', 0],
        ['Patanjali Flakes (Corn Flakes) (500 g)', 'Breakfast Cereal', 149, 'g', 85, 4.2, 'Crispy golden corn flakes for a healthy and quick morning bowl.', 0],
        ['Kellogg\'s Chocos (1 kg)', 'Breakfast Cereal', 399, 'kg', 80, 4.4, 'Chocolate-coated whole-wheat puffs, loved by children at breakfast.', 0],
        ['Bagrry\'s Corn Flakes (800 g)', 'Breakfast Cereal', 289, 'g', 75, 4.3, 'Crunchy corn flakes with low sugar, great with cold or warm milk.', 0],
    ],
};

// ─── Image URL Pool ───────────────────────────────────────
const IMAGE_BASES = {
    'Fruits & Vegetables': [
        'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400',
        'https://images.unsplash.com/photo-1490885578174-acda8905c2c6?w=400',
        'https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?w=400',
    ],
    'Dairy & Eggs': [
        'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
        'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400',
    ],
    'Snacks & Beverages': [
        'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400',
        'https://images.unsplash.com/photo-1527150122806-f682d2fd8b09?w=400',
    ],
    'Atta, Rice & Dal': [
        'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
        'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400',
    ],
    'Oil, Ghee & Masala': [
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
    ],
    'Bakery & Biscuits': [
        'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400',
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
    ],
    'Frozen Food': [
        'https://images.unsplash.com/photo-1527590000983-94a673e4f4fe?w=400',
        'https://images.unsplash.com/photo-1624811544834-5b3e1b56adda?w=400',
    ],
    'Personal Care': [
        'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400',
        'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400',
    ],
    'Cleaning Essentials': [
        'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    ],
    'Instant & Ready-to-Eat': [
        'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400',
        'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400',
    ],
};

// ─── Main ─────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/groceerynewstore');

const run = async () => {
    try {
        console.log('⏳  Connected to MongoDB…');

        // ── 1. Upsert Categories ──────────────────────────
        console.log('\n📂  Upserting categories…');
        const categoryMap = {};

        for (const cat of CATEGORIES) {
            const doc = await Category.findOneAndUpdate(
                { name: cat.name },
                { $setOnInsert: cat },
                { upsert: true, returnDocument: 'after', runValidators: true }
            );
            categoryMap[cat.name] = doc._id;
            console.log(`   ✔  ${cat.name} → ${doc._id}`);
        }

        // ── 2. Build product documents ────────────────────
        console.log('\n📦  Building product list…');
        const products = [];

        for (const [catName, items] of Object.entries(PRODUCT_DATA)) {
            const catId    = categoryMap[catName];
            const imgPool  = IMAGE_BASES[catName] || ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'];

            for (const [name, subcategory, price, unit, stock, rating, description, discount] of items) {
                const basePrice = price;
                products.push({
                    name,
                    description,
                    category: catId,
                    price: basePrice,
                    basePrice,
                    currentPrice: basePrice,
                    unit,
                    stock,
                    image: pick(imgPool),
                    rating,
                    numReviews: Math.floor(Math.random() * 200) + 10,
                    isVisible: true,
                    isFeatured: Math.random() > 0.85,
                    tags: [catName.toLowerCase(), subcategory.toLowerCase(), name.split(' ')[0].toLowerCase()],
                    totalSold: Math.floor(Math.random() * 500),
                    priceSurgeFactor: 1.0,
                    lowStockThreshold: 5,
                });
            }
        }

        console.log(`   Total products to insert: ${products.length}`);

        // ── 3. Delete old products, insert new ───────────
        console.log('\n🗑️   Removing existing products…');
        await Product.deleteMany({});

        console.log('💾  Inserting new products…');
        await Product.insertMany(products);

        console.log(`\n✅  Done! ${products.length} products inserted across ${CATEGORIES.length} categories.`);
        process.exit(0);
    } catch (err) {
        console.error('❌  Error:', err.message);
        if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
        process.exit(1);
    }
};

if (process.argv[2] === '--clear') {
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/groceerynewstore').then(async () => {
        await Category.deleteMany({});
        await Product.deleteMany({});
        console.log('🗑️  All products and categories removed.');
        process.exit(0);
    });
} else {
    run();
}
