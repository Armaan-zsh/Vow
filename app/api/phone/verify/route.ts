// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const VerifyOTPSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),
  code: z.string().length(6, 'Code must be 6 digits')
});

// In-memory store for demo - use Redis in production
const otpStore = new Map<string, { code: string; expires: number; attempts: number }>();

export async function verifyPhoneOTP(phone: string, code: string): Promise<boolean> {
  const stored = otpStore.get(phone);
  
  if (!stored) {
    return false;
  }

  // Check if expired
  if (Date.now() > stored.expires) {
    otpStore.delete(phone);
    return false;
  }

  // Check attempts (max 3)
  if (stored.attempts >= 3) {
    otpStore.delete(phone);
    return false;
  }

  // Verify code
  if (stored.code !== code) {
    stored.attempts++;
    return false;
  }

  // Success - clean up
  otpStore.delete(phone);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code } = VerifyOTPSchema.parse(body);

    const isValid = await verifyPhoneOTP(phone, code);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Phone verified successfully' 
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}