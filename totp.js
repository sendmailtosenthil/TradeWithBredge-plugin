let totp = new OTPAuth.TOTP({
    issuer: "ACME",
    label: "AngelOne",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: ANGEL_TOTP_SECRET,
  });
  
  