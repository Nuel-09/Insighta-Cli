const crypto = require("crypto");

const base64url = (buf) =>
  buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const generateVerifier = () => base64url(crypto.randomBytes(32));

const challengeFromVerifier = (verifier) => {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64url(hash);
};

module.exports = { generateVerifier, challengeFromVerifier };
