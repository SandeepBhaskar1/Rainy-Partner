const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const {
  generateAdminToken,
  generateToken,
  generateAdminRefreshToken,
  verifyAdminToken,
} = require("../middleware/auth");
const { APIError, asyncHandler } = require("../middleware/errorHandler");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const router = express.Router();

const otpStorage = new Map();

const TEST_PHONE = "9876543210";
const TEST_OTP = "720477";

const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`Generated OTP: ${otp}`);
  return otp;
};

const sendOTPViaSMS = async (phone, otp) => {
  try {
    console.log("📤 Sending OTP via Fast2SMS:", { phone, otp });

    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "dlt",
        sender_id: "RAINYP",
        message: "202126",
        variables_values: otp,
        flash: 0,
        numbers: phone,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Sending OTP to:", phone, "via Fast2SMS API");

    console.log("✅ Fast2SMS Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Fast2SMS Error:", error.response?.data || error.message);
    throw new Error("Failed to send OTP");
  }
};

router.post(
  "/send-otp",
  [
    body("identifier")
      .matches(/^[6-9]\d{9}$/)
      .withMessage("Please provide a valid 10-digit Indian phone number"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        detail: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { identifier } = req.body;

    if (identifier === TEST_PHONE) {
      otpStorage.set(identifier, {
        otp: TEST_OTP,
        expires: Date.now() + 30 * 60 * 1000,
      });
      console.log(`📱 Test OTP for ${identifier}: ${TEST_OTP}`);

      return res.json({
        message: "OTP sent successfully",
        ...(process.env.NODE_ENV === "development" && { otp: TEST_OTP }),
      });
    }

    const otp = generateOTP();

    otpStorage.set(identifier, {
      otp,
      expires: Date.now() + 5 * 60 * 1000,
    });

    try {
      await sendOTPViaSMS(identifier, otp);
      console.log(`📱 OTP for ${identifier}: ${otp}`);

      res.json({
        message: "OTP sent successfully",
        ...(process.env.NODE_ENV === "development" && { otp }),
      });
    } catch (err) {
      otpStorage.delete(identifier);
      console.error("Error sending OTP:", err);
      return res
        .status(500)
        .json({ detail: "Failed to send OTP", error: err.message });
    }
  })
);

router.post(
  "/verify-otp",
  [
    body("identifier")
      .matches(/^[6-9]\d{9}$/)
      .withMessage("Please provide a valid phone number"),
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be 6 digits"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        detail: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { identifier, otp } = req.body;

    const otpData = otpStorage.get(identifier);
    if (!otpData || otpData.expires < Date.now()) {
      otpStorage.delete(identifier);
      return res.status(400).json({ detail: "OTP expired or invalid" });
    }

    if (otpData.otp !== otp) {
      return res.status(400).json({ detail: "Invalid OTP" });
    }

    otpStorage.delete(identifier);

    let user = await User.findByPhone(identifier);

    if (!user) {
      if (identifier === TEST_PHONE) {
        user = new User({
          phone: identifier,
          name: "Test Plumber - Google Review",
          email: "testplumber@rainyfilters.com",
          role: "PLUMBER",
          needs_onboarding: false,
          kyc_status: "approved",
          agreement_status: true,
          trust: 100,
          approvedAt: new Date(),
          address: {
            address: "Test Address, MG Road",
            city: "Bangalore",
            district: "Bangalore Urban",
            state: "Karnataka",
            pin: "560001",
          },
          service_area_pin: ["560001", "560002", "560003"],
          experience: 5,
          tools: ["Wrench", "Plunger", "Pipe Cutter", "Drill Machine"],
          aadhaar_number: "XXXX-XXXX-1234",
          plumber_license_number: "TEST-LIC-001",
        });
      } else {
        user = new User({
          phone: identifier,
          role: "PLUMBER",
          needs_onboarding: true,
          kyc_status: "pending",
        });
      }
      await user.save();
      console.log(`👤 New plumber registered: ${identifier}`);
    } else if (identifier === TEST_PHONE) {
      console.log(`Test account login: ${identifier}`);
      user.kyc_status = "approved";
      user.needs_onboarding = false;
      user.agreement_status = true;
      user.approvedAt = user.approvedAt || new Date();
    }

    user.last_login = new Date();
    await user.save();

    const accessToken = generateToken(user);

    const userData = {
      id: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      needs_onboarding: user.needs_onboarding,
      kyc_status: user.kyc_status,
      access_token: accessToken,
      agreement_status: user.agreement_status,
    };

    res.json({
      message: "Login successful",
      access_token: accessToken,
      user: userData,
    });
  })
);

router.post(
  "/admin-register",
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("name").optional().trim(),
    body("phone")
      .optional()
      .matches(/^[6-9]\d{9}$/)
      .withMessage("Please provide a valid 10-digit Indian phone number"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        detail: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { email, password, name, phone } = req.body;

    const existingAdmin = await User.findOne({ email, role: "ADMIN" });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ detail: "Admin with this email already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const admin = new User({
      name: name || "Administrator",
      email,
      phone: phone || "9999999999",
      password_hash,
      role: "ADMIN",
      needs_onboarding: false,
      kyc_status: "approved",
    });

    await admin.save();

    const accessToken = generateToken(admin);

    res.status(201).json({
      message: "Admin registered successfully",
      access_token: accessToken,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  })
);

router.post(
  "/admin-login",
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  asyncHandler(async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          detail: errors.array()[0].msg,
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;
      console.log("Login attempt for:", email);

      const admin = await User.findOne({ email, role: "ADMIN" });
      if (!admin) {
        return res.status(401).json({ detail: "Admin account not found" });
      }

      const isMatch = await bcrypt.compare(password, admin.password_hash);
      if (!isMatch) {
        return res.status(401).json({ detail: "Invalid email or password" });
      }

      admin.last_login = new Date();
      await admin.save();

      const accessToken = generateAdminToken(admin);
      const refreshToken = generateAdminRefreshToken(admin);

      res.cookie("access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        maxAge: 15 * 60 * 1000,
      });

      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      console.log("✅ Cookies set successfully");
      console.log("Response headers:", res.getHeaders());

      res.status(200).json({
        success: true,
        message: "Admin login successful",
        token: accessToken,
        admin: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      });
    } catch (error) {
      console.error("❌ Login Error:", error);
      res.status(500).json({
        detail: "Internal server error",
        error: error.message,
      });
    }
  })
);

router.post(
  "/coordinator-login",
  [
    body("identifier")
      .trim()
      .notEmpty()
      .withMessage("Email or phone number is required"),
    body("password").trim().notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier, password } = req.body;

    try {
      console.log("📩 Login request received:", { identifier });

      const coordinator = await User.findOne({
        $or: [{ email: identifier }, { phone: identifier }],
      });

      if (!coordinator) {
        console.log("❌ Coordinator not found");
        return res.status(404).json({ message: "Coordinator not found" });
      }

      console.log(
        "✅ Found coordinator:",
        coordinator.email || coordinator.phone
      );

      if (coordinator.role !== "COORDINATOR") {
        console.log("🚫 Unauthorized role:", coordinator.role);
        return res.status(403).json({ message: "Unauthorized user type." });
      }

      const isMatch = await bcrypt.compare(password, coordinator.password_hash);
      console.log("🔐 Password match result:", isMatch);

      if (!isMatch) {
        return res.status(401).json({ message: "Invalid password." });
      }

      coordinator.last_login = new Date();
      await coordinator.save();

      const accessToken = generateAdminToken(coordinator);
      const refreshToken = generateAdminRefreshToken(coordinator);

      res.cookie("access_token", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "Strict",
        maxAge: 15 * 60 * 1000,
      });

      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      console.log("✅ Login successful for:", coordinator.name);

      return res.status(200).json({
        message: "Login successful",
        token: accessToken,
        coordinator: {
          id: coordinator._id,
          name: coordinator.name,
          email: coordinator.email,
          phone: coordinator.phone,
          role: coordinator.role,
        },
      });
    } catch (error) {
      console.error("💥 Coordinator login error:", error);
      return res
        .status(500)
        .json({ message: "Server error", error: error.message });
    }
  }
);

router.post(
  "/refresh-token",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({ detail: "No refresh token provided" });
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET_KEY
      );

      const user = await User.findById(decoded.id).select(
        "+refreshTokenVersion"
      );

      if (!user || !user.is_active) {
        return res.status(401).json({ detail: "User not found or inactive" });
      }

      if (
        user.refreshTokenVersion &&
        decoded.version !== user.refreshTokenVersion
      ) {
        return res
          .status(401)
          .json({ detail: "Refresh token has been revoked" });
      }

      const newAccessToken = generateAdminToken(user);
      const newRefreshToken = generateAdminRefreshToken(user);

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        path: "/",
      };

      res.cookie("access_token", newAccessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie("refresh_token", newRefreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        access_token: newAccessToken,
        expires_in: 900,
      });
    } catch (error) {
      res.clearCookie("refresh_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        path: "/",
      });

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ detail: "Refresh token expired" });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ detail: "Invalid refresh token" });
      }

      console.error("❌ Refresh token error:", error.message);
      return res.status(401).json({ detail: "Token refresh failed" });
    }
  })
);

router.get("/verify", async (req, res) => {
  try {
    const token = req.cookies.access_token;
    if (!token) {
      return res
        .status(401)
        .json({ loggedIn: false, message: "No access token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await User.findById(decoded.id).select("-password_hash");

    if (!user) {
      return res
        .status(401)
        .json({ loggedIn: false, message: "User not found" });
    }

    res.status(200).json({
      loggedIn: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Error verifying token:", err.message);
    return res
      .status(500)
      .json({ loggedIn: false, message: "Token verification failed" });
  }
});

router.post(
  "/admin-logout",
  asyncHandler(async (req, res) => {
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      path: "/",
    });

    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      path: "/",
    });

    res.status(200).json({ success: true, message: "Logged out successfully" });
  })
);

module.exports = router;
