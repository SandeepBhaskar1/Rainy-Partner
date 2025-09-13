const express = require('express');
const verifyPlumberToken = require('../middleware/auth');
const products = require('../models/products');

const router = express.Router();
router.get('/', async (req, res) => {
  console.log("=== MAIN ROUTE HIT ===");
  console.log("Request received at:", new Date().toISOString());
  
  try {
    console.log("About to query database...");
    const product = await products.find({});
    console.log("Raw query result:", product);
    console.log("Number of products found:", product.length);
    
    if (product.length > 0) {
      console.log("First product keys:", Object.keys(product[0]));
      console.log("First product:", JSON.stringify(product[0], null, 2));
    }
    
    res.json(product);
  } catch (error) {
    console.error("=== ERROR ===", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;