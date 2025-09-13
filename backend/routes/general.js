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
  
  // Default products data
  const defaultProducts = [
    {
      code: "FL-80",
      name: "Rainy Filter FL-80",
      short_desc: "Up to 80 sq ft roof area",
      specs: "Capacity: 80 sq ft, Flow Rate: 2 LPH",
      mrp: 6755,
      image: "https://cdn.emergentpagetagent.com/job_plumber-connect/artifacts/vfuk0hgz_FL%2080.jpg"
    },
    {
      code: "FL-150", 
      name: "Rainy Filter FL-150",
      short_desc: "Up to 150 sq ft roof area",
      specs: "Capacity: 150 sq ft, Flow Rate: 4 LPH", 
      mrp: 8166,
      image: "https://cdn.emergentpagetagent.com/job_plumber-connect/artifacts/vfuk0hgz_FL%20150.jpg"
    },
    {
      code: "FL-250",
      name: "Rainy Filter FL-250", 
      short_desc: "Up to 250 sq ft roof area",
      specs: "Capacity: 250 sq ft, Flow Rate: 6 LPH",
      mrp: 10832,
      image: "https://cdn.emergentpagetagent.com/job_plumber-connect/artifacts/vfuk0hgz_FL%20250.jpg"
    },
    {
      code: "FL-350",
      name: "Rainy Filter FL-350",
      short_desc: "Up to 350 sq ft roof area", 
      specs: "Capacity: 350 sq ft, Flow Rate: 8 LPH",
      mrp: 16319,
      image: "https://cdn.emergentpagetagent.com/job_plumber-connect/artifacts/vfuk0hgz_FL%20350.jpg"
    },
    {
      code: "FL-500",
      name: "Rainy Filter FL-500",
      short_desc: "Up to 500 sq ft roof area",
      specs: "Capacity: 500 sq ft, Flow Rate: 10 LPH", 
      mrp: 21110,
      image: "https://cdn.emergentpagetagent.com/job_plumber-connect/artifacts/vfuk0hgz_FL%20500.jpg"
    }
  ];

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