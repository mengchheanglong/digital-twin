import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import { badRequest, successResponse, serverError, tooManyRequests } from "@/lib/api-response";
import { validateEmail, validatePassword } from "@/lib/validation";
import { MongoRateLimiter } from "@/lib/rate-limit";
import { getClientIp, readJsonBody } from "@/lib/request";

export const dynamic = "force-dynamic";

interface ResetPasswordPayload {
  email?: string;
  otp?: string;
  newPassword?: string;
}

const resetPasswordLimiter = new MongoRateLimiter('reset-password', 60 * 1000, 10);

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    if (!(await resetPasswordLimiter.check(ip))) {
      return tooManyRequests("Too many reset attempts. Please try again later.");
    }

    await dbConnect();

    const parsed = await readJsonBody<ResetPasswordPayload>(req);
    if (parsed.ok === false) return parsed.response;

    const email = String(parsed.data.email || "").trim().toLowerCase();
    const otp = String(parsed.data.otp || "").trim();
    const newPassword = String(parsed.data.newPassword || "").trim();

    if (!email || !otp || !newPassword) {
      return badRequest("Email, OTP, and new password are required.");
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return badRequest(emailValidation.message);
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return badRequest(validation.message);
    }

    if (!/^\d{6}$/.test(otp)) {
      return badRequest("Invalid OTP or expired.");
    }

    const user = await User.findOne({
      email,
      resetPasswordToken: { $exists: true, $ne: null },
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return badRequest("Invalid OTP or expired.");
    }

    const otpMatches = await bcrypt.compare(otp, String(user.resetPasswordToken || ""));
    if (!otpMatches) {
      return badRequest("Invalid OTP or expired.");
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Record when the password was changed so tokens issued before this
    // moment are treated as revoked.
    user.passwordChangedAt = new Date();

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return successResponse("Password has been reset successfully.");

  } catch (error) {
    return serverError(error, "Error resetting password");
  }
}
