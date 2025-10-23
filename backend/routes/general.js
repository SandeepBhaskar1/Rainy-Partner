const express = require('express');
const mongoose = require('mongoose');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Products collection (temporary, should be in separate model)
const getProducts = async () => {
  const db = mongoose.connection.db;
  const products = await db.collection('products').find({}).toArray();
  return products;
};

// Get products
router.get('/products', asyncHandler(async (req, res) => {
  const products = await getProducts();
  res.json(products.map(product => ({
    code: product.code,
    name: product.name,
    short_desc: product.short_desc,
    specs: product.specs,
    mrp: product.mrp,
    image: product.image
  })));
}));

// Refresh products (force reload from default data)
router.post('/products/refresh', asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;
  
  // Replace products collection
  await db.collection('products').deleteMany({});
  await db.collection('products').insertMany(defaultProducts);

  res.json({
    message: 'Products refreshed successfully',
    count: defaultProducts.length
  });
}));

// Get system configuration
router.get('/config', asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;
  const config = await db.collection('config').findOne({ id: 'system_config' });
  
  if (!config) {
    // Return default config
    const defaultConfig = {
      id: 'system_config',
      install_fee_default: 500,
      io_earning_per_job: 300, 
      si_earning_per_job: 800
    };
    res.json(defaultConfig);
  } else {
    res.json(config);
  }
}));

module.exports = router;