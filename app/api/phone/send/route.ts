// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { Twilio } from 'twilio';
import { z } from 'zod';

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const SendOTPSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format')
});

// In-memory store for demo - use Redis in production
const otpStore = new Map<string, { code: string; expires: number; attempts: number }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = SendOTPSchema.parse(body);

    // Rate limiting - max 3 OTP requests per phone per hour
    const rateLimitKey = `otp_rate:${phone}`;
    // Implementation would check Redis rate limit here

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(phone, { code, expires, attempts: 0 });

    // Send SMS via Twilio
    await client.messages.create({
      body: `Your ReadFlex verification code is: ${code}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    return NextResponse.json({ 
      success: true, 
      message: 'OTP sent successfully' 
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}