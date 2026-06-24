import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import { badRequest, successResponse, serverError } from "@/lib/api-response";
import { validateEmail, validatePassword } from "@/lib/validation";
import { MongoRateLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { getClientIp, readJsonBody, requiredString, validateFields } from "@/lib/request";

export const dynamic = "force-dynamic";

const resetPasswordLimiter = new MongoRateLimiter('reset-password', 60 * 1000, 10);

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    const rateLimit = await resetPasswordLimiter.checkDetailed(ip);
    if (!rateLimit.allowed) {
      return rateLimitResponse("Too many reset attempts. Please try again later.", rateLimit);
    }

    await dbConnect();

    const parsed = await readJsonBody<Record<string, unknown>>(req);
    if (parsed.ok === false) return parsed.response;

    const fields = validateFields(parsed.data, {
      email: requiredString("Email", { message: "Email, OTP, and new password are required." }),
      otp: requiredString("OTP", { message: "Email, OTP, and new password are required." }),
      newPassword: requiredString("New password", {
        message: "Email, OTP, and new password are required.",
      }),
    });
    if (fields.ok === false) return fields.response;

    const email = fields.data.email.toLowerCase();
    const otp = fields.data.otp;
    const newPassword = fields.data.newPassword;

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
