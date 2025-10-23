const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/kyc-approvals', async (req, res) => {
    try {
        const pending = await User.find({ kyc_status: 'pending' });
        const rejected = await User.find({ kyc_status: 'rejected' });

        const formatKYCData = (kycList) => {
            return kycList.map(user => ({
                id: user._id,
                name: user.name,
                address: user.address,
                aadhaar_front: user.aadhaar_front,
                aadhaar_back: user.aadhaar_back,
                license_front: user.license_front,
                license_back: user.license_back,
                status: user.kyc_status,
            }));
        };

        res.json({
            pending: formatKYCData(pending),
            rejected: formatKYCData(rejected),
        });
    } catch (error) {
        console.error('Error fetching KYC approvals:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/approve', async (req, res) => {
    const { id } = req.body;
    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.kyc_status = 'approved';
        await user.save();
        res.json({ message: 'KYC approved', id: user._id });
    } catch (error) {
        console.error('Error approving KYC:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }   
});

router.post('/reject', async (req, res) => {
    const { id } = req.body;
    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.kyc_status = 'rejected';
        await user.save();
        res.json({ message: 'KYC Rejected', id: user._id });
    } catch (error) {
        console.error('Error rejecting KYC:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }   
});

module.exports = router;
