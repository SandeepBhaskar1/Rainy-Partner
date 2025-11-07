const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/', async (req, res) => {

  try {
    const {
      phone,
      name,
      address,
      city,
      district,
      state,
      pin,
      service_area_pin,
      experience,
      tools,
      aadhaar_number,
      plumber_license_number,
      profile,
      aadhaar_front,
      aadhaar_back,
      license_front,
      license_back, } = req.body;

    if (!name || !address || !city || !pin || !district || !state || !service_area_pin || !experience || !tools || !aadhaar_number  || !profile || !aadhaar_front || !aadhaar_back ) {
      return res.status(400).json({ message: 'All fields are required.' })
    }

    const updateUser = await User.findOneAndUpdate(
      { phone },
      {
        $set: {
        name,
        address: {
          address,
          city,
          district,
          state,
          pin,
        },
        service_area_pin,
        experience,
        tools,
        aadhaar_number,
        plumber_license_number,
        profile,
        aadhaar_front,
        aadhaar_back,
        license_front,
        license_back,
        needs_onboarding: false,
        kyc_status: 'pending',
        updated_at: new Date(),
      },
    }
    );

    if(!updateUser){
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(201).json({ message: 'Onboarding completed successfully.', user: updateUser });
  } catch (error) {
    console.error('Onboarding error:', error.message, error.stack);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }}
);


router.get('/:_id', async (req, res) => {
  try {
    const user = await User.findById( req.params._id );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Fetch user error:', error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const response = await User.find();
    res.status(200).json({response})
  } catch (error) {
    console.error('Error fetching users', error);
  }
});

module.exports = router;