const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

router.post('/', async (req, res) => {
  try {
    const { client, model_purchased } = req.body;

    if (!client || !client.name || !client.phone || !client.address || !client.city ||
      !client.district ||
      !client.state ||
      !client.pincode || !model_purchased) {
      return res.status(400).json({ message: 'Client info and model_purchased are required' });
    }

    const newLead = new Lead({
      client: {
        name: client.name,
        phone: client.phone,
        address: client.address,
        city: client.city,
        district: client.district,
        state: client.state,
        pincode: client.pincode,
      },
      model_purchased,
    });

    await newLead.save();

    res.status(201).json({ message: 'Lead created successfully', lead: newLead });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', async (req, res) => {
    try {
        const leads = await Lead.find().sort({ created_at: -1 });   
        res.json(leads);
        console.log(leads);
        
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
