# 2FA Backend Requirements for Laravel API

## Overview
This document outlines the backend requirements for implementing Two-Factor Authentication (2FA) in the TMA Admin mobile application. The system supports both OTP (One-Time Password) via email/SMS and biometric authentication (Face ID/Touch ID).

## Database Schema Changes

### Users Table
Add the following columns:
```sql
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN two_factor_recovery_codes TEXT NULL;
ALTER TABLE users ADD COLUMN two_factor_confirmed_at TIMESTAMP NULL;
```

### Two Factor Devices Table
Create a new table for managing trusted devices:
```sql
CREATE TABLE two_factor_devices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255) NULL,
    biometric_token VARCHAR(255) NULL,
    trust_token VARCHAR(255) NULL,
    is_trusted BOOLEAN DEFAULT FALSE,
    trusted_until TIMESTAMP NULL,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_device (user_id, device_id)
);
```

### OTP Codes Table
Create a table for managing OTP codes:
```sql
CREATE TABLE otp_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(6) NOT NULL,
    type ENUM('email', 'sms') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_code (user_id, code, expires_at)
);
```

## API Endpoints

### 1. Login Endpoint Modification
**Endpoint:** `POST /api/auth/login`

**Current Response:**
```json
{
    "token": "string",
    "user": {...},
    "expires_at": "2024-01-01T00:00:00Z"
}
```

**Modified Response (when 2FA is enabled for user):**
```json
{
    "token": null,
    "user": null,
    "expires_at": null,
    "requires_2fa": true,
    "two_fa_methods": ["otp", "biometric"],
    "temp_token": "temporary-auth-token-for-2fa"
}
```

**Implementation Notes:**
- Check if user has `two_factor_enabled = true`
- If yes, generate a temporary token (valid for 5 minutes) instead of full auth token
- Send OTP automatically if OTP method is enabled
- Return available 2FA methods based on user's settings

### 2. 2FA Status Check
**Endpoint:** `GET /api/auth/2fa/status`

**Headers:** Requires authentication token

**Response:**
```json
{
    "enabled": true,
    "methods": ["otp", "biometric"],
    "biometric_enrolled": false,
    "trusted_devices": [
        {
            "id": "device_123",
            "name": "iPhone 14 Pro",
            "last_used": "2024-01-01T00:00:00Z",
            "created_at": "2024-01-01T00:00:00Z",
            "is_current": true
        }
    ]
}
```

### 3. Setup 2FA
**Endpoint:** `POST /api/auth/2fa/setup`

**Request:**
```json
{
    "method": "otp"
}
```

**Response:**
```json
{
    "secret": "JBSWY3DPEHPK3PXP",
    "qr_code": "data:image/png;base64,...",
    "backup_codes": [
        "XXXX-XXXX",
        "YYYY-YYYY"
    ]
}
```

**Implementation:**
- Generate TOTP secret using a library like `pragmarx/google2fa-laravel`
- Generate 8-10 backup codes
- Store encrypted in database
- Don't enable 2FA until first successful verification

### 4. Send OTP
**Endpoint:** `POST /api/auth/2fa/send`

**Request:**
```json
{
    "email": "user@example.com"
}
```

**Response:**
```json
{
    "sent": true,
    "message": "OTP code sent to your registered email"
}
```

**Implementation:**
- Generate 6-digit random code
- Store in `otp_codes` table with 5-minute expiry
- Send via email (or SMS if phone number provided)
- Rate limit: max 3 requests per 10 minutes

**Email Template Example:**
```html
Subject: Your TMA Admin Verification Code

Your verification code is: 123456

This code will expire in 5 minutes.

If you didn't request this code, please ignore this email.
```

### 5. Verify 2FA
**Endpoint:** `POST /api/auth/2fa/verify`

**Request (OTP):**
```json
{
    "method": "otp",
    "code": "123456",
    "device_id": "device_unique_id",
    "trust_device": true
}
```

**Request (Biometric):**
```json
{
    "method": "biometric",
    "biometric_token": "encrypted_token",
    "device_id": "device_unique_id"
}
```

**Response:**
```json
{
    "success": true,
    "token": "actual-auth-token",
    "expires_at": "2024-01-02T00:00:00Z",
    "user": {...},
    "trust_token": "trust-token-for-30-days"
}
```

**Implementation:**
- For OTP: Verify code against database, mark as used
- For Biometric: Verify biometric_token against stored device token
- If trust_device is true, generate trust_token valid for 30 days
- Generate full authentication token upon successful verification
- Log the authentication attempt for security auditing

### 6. Register Biometric Device
**Endpoint:** `POST /api/auth/2fa/biometric/register`

**Request:**
```json
{
    "user_id": 123,
    "device_id": "device_unique_id",
    "device_name": "iPhone 14 Pro"
}
```

**Response:**
```json
{
    "token": "unique_biometric_token_for_device"
}
```

**Implementation:**
- Generate unique token for the device
- Store in `two_factor_devices` table
- Encrypt the token before storage
- Return token to be stored securely on device

### 7. Disable 2FA
**Endpoint:** `DELETE /api/auth/2fa/disable`

**Request:**
```json
{
    "verification_code": "123456"
}
```

**Response:**
```json
{
    "disabled": true
}
```

**Implementation:**
- Require current password or OTP code for verification
- Set `two_factor_enabled = false`
- Clear all related tokens and trusted devices
- Send notification email about 2FA being disabled

### 8. Manage Trusted Devices
**Endpoint:** `DELETE /api/auth/2fa/trusted-devices/{device_id}`

**Response:**
```json
{
    "removed": true
}
```

## Security Considerations

### 1. OTP Security
- OTP codes should be 6 digits minimum
- Expire after 5 minutes
- Allow maximum 3 attempts before locking
- Implement rate limiting (3 OTPs per 10 minutes)
- Each code can only be used once

### 2. Biometric Token Security
- Tokens should be cryptographically secure (use `Str::random(60)`)
- Store hashed versions in database (use bcrypt)
- Rotate tokens periodically (every 90 days)
- Invalidate tokens on password change

### 3. Trust Token Security
- Valid for 30 days maximum
- Should be revoked if:
  - Password is changed
  - 2FA is disabled
  - Suspicious activity detected
- Store device fingerprint for additional verification

### 4. Rate Limiting
Implement rate limiting for all 2FA endpoints:
- `/auth/2fa/send`: 3 requests per 10 minutes
- `/auth/2fa/verify`: 5 attempts per 10 minutes
- `/auth/2fa/setup`: 5 requests per hour

### 5. Audit Logging
Log all 2FA-related activities:
```php
// Example audit log entry
[
    'user_id' => $user->id,
    'action' => '2fa_verification',
    'method' => 'otp',
    'status' => 'success',
    'ip_address' => $request->ip(),
    'user_agent' => $request->userAgent(),
    'device_id' => $request->input('device_id'),
    'timestamp' => now()
]
```

## Laravel Implementation Tips

### 1. Middleware for 2FA
Create a middleware to check 2FA status:
```php
class RequireTwoFactor
{
    public function handle($request, Closure $next)
    {
        $user = $request->user();

        if ($user && $user->two_factor_enabled) {
            // Check if user has completed 2FA
            if (!$request->session()->get('2fa_verified')) {
                return response()->json([
                    'message' => '2FA verification required',
                    'requires_2fa' => true
                ], 403);
            }
        }

        return $next($request);
    }
}
```

### 2. OTP Generation
```php
private function generateOTP($user)
{
    $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

    OtpCode::create([
        'user_id' => $user->id,
        'code' => Hash::make($code),
        'type' => 'email',
        'expires_at' => now()->addMinutes(5)
    ]);

    return $code;
}
```

### 3. Trust Token Validation
```php
private function validateTrustToken($user, $token, $deviceId)
{
    $device = TwoFactorDevice::where('user_id', $user->id)
        ->where('device_id', $deviceId)
        ->where('trust_token', hash('sha256', $token))
        ->where('trusted_until', '>', now())
        ->first();

    if ($device) {
        $device->update(['last_used_at' => now()]);
        return true;
    }

    return false;
}
```

## Testing Requirements

### Test Cases to Implement:
1. Login with 2FA disabled - should work normally
2. Login with 2FA enabled - should require verification
3. OTP verification with correct code - should succeed
4. OTP verification with expired code - should fail
5. OTP verification with wrong code - should fail
6. Biometric token verification - should succeed with valid token
7. Trust device for 30 days - should skip 2FA on subsequent logins
8. Revoke trusted device - should require 2FA again
9. Rate limiting - should block after exceeding limits
10. 2FA disable - should require verification

## Response Status Codes
- `200` - Successful operation
- `201` - Resource created (e.g., OTP sent)
- `400` - Bad request (invalid input)
- `401` - Unauthorized (invalid credentials)
- `403` - Forbidden (2FA required but not completed)
- `422` - Unprocessable entity (validation errors)
- `429` - Too many requests (rate limited)

## Environment Variables
Add to `.env`:
```env
TWO_FACTOR_ENABLED=true
OTP_EXPIRY_MINUTES=5
TRUST_DEVICE_DAYS=30
MAX_OTP_ATTEMPTS=3
OTP_LENGTH=6
RATE_LIMIT_OTP_SEND=3
RATE_LIMIT_WINDOW_MINUTES=10
```

## Email Configuration
Ensure email is properly configured for sending OTP codes:
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your-username
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@templemanchester.co.uk
MAIL_FROM_NAME="TMA Admin"
```

## Migration Priority
1. Create database tables
2. Implement `/auth/login` modification
3. Implement `/auth/2fa/send` and `/auth/2fa/verify`
4. Implement `/auth/2fa/status`
5. Implement biometric endpoints
6. Add trust device functionality
7. Implement audit logging
8. Add rate limiting
9. Complete testing

## Support Contact
For any questions or clarifications about these requirements, please contact the mobile development team.

---

**Note:** All sensitive data (tokens, OTP codes, etc.) should be properly encrypted in the database and transmitted over HTTPS only.