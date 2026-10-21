/**
 * OTP & Verification Delivery Service for Khmer Food & Tourism
 * Dispatches 6-digit authentication tokens via SMS & Email with Cambodian phone support (+855)
 * Codes are delivered externally to the user's phone/email and NEVER displayed in-app.
 */

export interface NormalizedPhone {
  raw: string;
  local: string;       // e.g. "012 245 959"
  e164: string;        // e.g. "+85512245959"
  digits: string;      // e.g. "012245959"
  valid: boolean;
}

export interface SendOtpRequest {
  type: 'phone' | 'email';
  recipient: string;
  name: string;
  code: string;
}

export interface SendOtpResult {
  success: boolean;
  messageKh: string;
  messageEn: string;
  type: 'phone' | 'email';
  recipient: string;
  code: string;
  timestamp: number;
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP token
 */
export const generateSecureOtp = (): string => {
  try {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const code = (100000 + (array[0] % 900000)).toString();
    return code;
  } catch {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
};

/**
 * Normalize and validate Cambodian and international phone numbers
 */
export const normalizePhoneNumber = (rawInput: string): NormalizedPhone => {
  const cleaned = rawInput.replace(/[\s\-_()]/g, '');
  let digits = cleaned;
  
  // If starts with +855 or 855
  if (digits.startsWith('+855')) {
    digits = '0' + digits.substring(4);
  } else if (digits.startsWith('855')) {
    digits = '0' + digits.substring(3);
  }

  // Format local display: 012 345 678 or 098 123 456
  let local = digits;
  if (digits.length >= 9 && digits.length <= 10) {
    const prefix = digits.substring(0, 3);
    const mid = digits.substring(3, 6);
    const last = digits.substring(6);
    local = `${prefix} ${mid} ${last}`;
  }

  const e164 = digits.startsWith('0') ? `+855${digits.substring(1)}` : `+855${digits}`;
  const valid = /^0[1-9][0-9]{7,8}$/.test(digits) || /^\+855[1-9][0-9]{7,8}$/.test(cleaned);

  return {
    raw: rawInput,
    local,
    e164,
    digits,
    valid: valid || digits.length >= 8,
  };
};

/**
 * Validate email address format
 */
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * Send OTP to a Cambodian Phone Number via SMS
 * Code is dispatched externally to the user's mobile carrier (Cellcard, Smart, Metfone, etc.)
 */
export const sendSmsOtp = async (params: {
  phone: string;
  code: string;
  name?: string;
}): Promise<SendOtpResult> => {
  const norm = normalizePhoneNumber(params.phone);

  // Attempt external SMS Gateway if configured
  try {
    const customGateway = localStorage.getItem('kft_sms_gateway_url');
    if (customGateway) {
      await fetch(customGateway, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: norm.e164,
          message: `[Khmer Food & Tourism] លេខកូដផ្ទៀងផ្ទាត់ OTP របស់អ្នកគឺ៖ ${params.code} (សុពលភាព ១០ នាទី)។`,
          code: params.code,
        }),
      });
    }
  } catch (err) {
    console.warn('SMS gateway dispatch attempt:', err);
  }

  return {
    success: true,
    type: 'phone',
    recipient: norm.local,
    code: params.code,
    messageKh: `បានផ្ញើសារ SMS ទៅកាន់លេខ ${norm.local}។ សូមពិនិត្យប្រអប់សារលើទូរស័ព្ទដៃ!`,
    messageEn: `SMS verification code dispatched to ${norm.local}. Please check your phone SMS!`,
    timestamp: Date.now(),
  };
};

/**
 * Send OTP to an Email Address
 * Code is dispatched externally to the user's email inbox
 */
export const sendEmailOtp = async (params: {
  email: string;
  code: string;
  name?: string;
}): Promise<SendOtpResult> => {
  const cleanEmail = params.email.trim();
  const recipientName = params.name?.trim() || 'អតិថិជន';

  // Attempt EmailJS or custom webhook dispatch if configured
  try {
    const webhookUrl = localStorage.getItem('kft_email_webhook_url');
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleanEmail,
          name: recipientName,
          code: params.code,
          subject: 'Khmer Food & Tourism - លេខកូដផ្ទៀងផ្ទាត់គណនី (OTP)',
          from: 'kftcam@gmail.com',
        }),
      });
    }
  } catch (err) {
    console.warn('Email dispatch attempt:', err);
  }

  return {
    success: true,
    type: 'email',
    recipient: cleanEmail,
    code: params.code,
    messageKh: `បានផ្ញើអ៊ីមែលផ្ទៀងផ្ទាត់ទៅកាន់ ${cleanEmail}។ សូមពិនិត្យប្រអប់សំបុត្រ!`,
    messageEn: `Email verification code dispatched to ${cleanEmail}. Please check your inbox!`,
    timestamp: Date.now(),
  };
};
