"use strict";

/**
 * Email validation utility for Legendin.
 * Validates email format according to common patterns and restrictions.
 */

const EMAIL_VALIDATION = {
  // Maximum length for email addresses
  MAX_LENGTH: 254,

  // Minimum length for email addresses
  MIN_LENGTH: 5,

  // Maximum local part (before @)
  MAX_LOCAL_PART_LENGTH: 64,

  // Maximum domain part (after @)
  MAX_DOMAIN_LENGTH: 253,

  // Allowed characters in local part (simplified)
  LOCAL_PART_REGEX: /^[a-zA-Z0-9._%+-]+$/,

  // Domain part regex (simplified validation)
  DOMAIN_REGEX: /^[a-zA-Z0-9.-]+$/,

  // Top-level domain pattern
  TLD_REGEX: /
    \.(?:
      (?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)\.(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)|
      (?:[a-zA-Z0-9]{2,})
    )\z
  /i
};

/**
 * Validates an email address format.
 *
 * @param email - The email address to validate
 * @returns {boolean} - True if the email is valid, false otherwise
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmedEmail = email.trim();

  // Check length constraints
  if (trimmedEmail.length < EMAIL_VALIDATION.MIN_LENGTH) {
    return false;
  }

  if (trimmedEmail.length > EMAIL_VALIDATION.MAX_LENGTH) {
    return false;
  }

  // Check for exactly one @ symbol
  const atIndex = trimmedEmail.indexOf('@');
  if (atIndex === -1 || atIndex === 0 || atIndex === trimmedEmail.length - 1) {
    return false;
  }

  const localPart = trimmedEmail.substring(0, atIndex);
  const domainPart = trimmedEmail.substring(atIndex + 1);

  // Validate local part
  if (localPart.length > EMAIL_VALIDATION.MAX_LOCAL_PART_LENGTH) {
    return false;
  }

  if (!EMAIL_VALIDATION.LOCAL_PART_REGEX.test(localPart)) {
    return false;
  }

  // Validate domain part
  if (domainPart.length > EMAIL_VALIDATION.MAX_DOMAIN_LENGTH) {
    return false;
  }

  if (!EMAIL_VALIDATION.DOMAIN_REGEX.test(domainPart)) {
    return false;
  }

  // Check for dots in domain (at least one dot except for localhost)
  if (!domainPart.includes('.') && domainPart !== 'localhost') {
    return false;
  }

  const domainParts = domainPart.split('.');

  // Validate each part of the domain
  for (let i = 0; i < domainParts.length; i++) {
    const part = domainParts[i];

    // Check for empty parts
    if (part.length === 0) {
      return false;
    }

    // Check each part length
    if (part.length > 63) {
      return false;
    }

    // Check for consecutive dots
    if (part.includes('..')) {
      return false;
    }
  }

  // Validate top-level domain
  const tld = domainParts[domainParts.length - 1];
  if (!EMAIL_VALIDATION.TLD_REGEX.test(`.${tld}`)) {
    return false;
  }

  return true;
}

module.exports = {
  isValidEmail
};