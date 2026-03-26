import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import { badRequest, successResponse, serverError } from "@/lib/api-response";
import { validatePassword } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await dbConnect();

    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return badRequest("Email, OTP, and new password are required.");
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return badRequest(validation.message);
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordToken: otp,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return badRequest("Invalid OTP or expired.");
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return successResponse("Password has been reset successfully.");

  } catch (error) {
    return serverError(error, "Error resetting password");
  }
}
