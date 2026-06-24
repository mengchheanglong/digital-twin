import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import { badRequest, successResponse, serverError, tooManyRequests } from "@/lib/api-response";
import { sendEmail } from "@/lib/email";
import { MongoRateLimiter } from "@/lib/rate-limit";
import { validateEmail } from "@/lib/validation";
import { getClientIp, readJsonBody } from "@/lib/request";

export const dynamic = "force-dynamic";

// 5 requests per minute per IP
const forgotPasswordLimiter = new MongoRateLimiter('forgot-password', 60 * 1000, 5);

interface ForgotPasswordPayload {
  email?: string;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    if (!(await forgotPasswordLimiter.check(ip))) {
      return tooManyRequests("Too many requests. Please try again later.");
    }

    await dbConnect();

    const parsed = await readJsonBody<ForgotPasswordPayload>(req);
    if (parsed.ok === false) return parsed.response;

    const email = String(parsed.data.email || "").trim().toLowerCase();

    if (!email) {
      return badRequest("Email is required.");
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return badRequest(emailValidation.message);
    }

    const user = await User.findOne({ email });

    if (!user) {
      // For security, don't reveal if user exists.
      return successResponse("If an account with that email exists, we have sent a password reset link.");
    }

    // Generate 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();
    
    user.resetPasswordToken = await bcrypt.hash(otp, 10);
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await user.save();

    // Send email (logs to console in simplified mode)
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4a5568;">Password Reset Request</h2>
          <p>You requested a password reset for your Digital Twin account.</p>
          <p>Your verification code is:</p>
          <h1 style="color: #5b8def; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          <p>This code will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `
    });

    return successResponse("Code sent to your email (check server console).");

  } catch (error) {
    return serverError(error, "Error processing forgot password request");
  }
}
