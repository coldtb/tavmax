/**
 * TavMax SMS OTP Service Helper
 */

interface SendSMSResult {
  success: boolean;
  message?: string;
}

export const sendSMS = async (phone: string, text: string): Promise<SendSMSResult> => {
  // Read SMS configs from Vite environment variables
  const apiKey = import.meta.env.VITE_SMS_API_KEY;
  const apiEndpoint = import.meta.env.VITE_SMS_API_ENDPOINT || 'https://api.sms.mn/send'; // Default or placeholder endpoint
  const senderName = import.meta.env.VITE_SMS_SENDER || 'TAVMAX';

  // If no API Key is configured, run in development mode (local logging)
  if (!apiKey) {
    console.log(`[SMS Development Mode] Send to ${phone}: "${text}"`);
    return { success: true, message: 'DEV_MODE' };
  }

  try {
    // Normal POST request to typical SMS Gateway APIs in Mongolia (e.g. UniSMS, Mocean, SMS.to)
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: phone.trim(),
        sender: senderName,
        message: text,
        // Some providers require different formats, e.g., msg: text, phone: phone
        msg: text,
        phone: phone.trim()
      }),
    });

    const data = await response.json();
    
    if (response.ok && (data.success || data.status === 'success' || data.code === 0)) {
      return { success: true };
    } else {
      console.error('SMS Gateway Error Response:', data);
      return { success: false, message: data.message || 'SMS Gateway returned an error' };
    }
  } catch (error: any) {
    console.error('Failed to communicate with SMS API:', error);
    return { success: false, message: error.message || 'Connection failed' };
  }
};
