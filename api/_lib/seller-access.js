import { timingSafeEqual } from 'node:crypto';

const suppliedCode = (request) => request.headers?.['x-seller-access-code'];

const matches = (received, expected) => {
  const receivedValue = Buffer.from(String(received || ''));
  const expectedValue = Buffer.from(expected);
  return (
    receivedValue.length === expectedValue.length &&
    timingSafeEqual(receivedValue, expectedValue)
  );
};

export const requireSellerAccess = (request, response) => {
  const expectedCode = process.env.SELLER_ACCESS_CODE;
  if (!expectedCode) {
    response.status(503).json({
      error: 'Seller access is not configured. Ask the site owner to add it first.',
    });
    return false;
  }
  if (!matches(suppliedCode(request), expectedCode)) {
    response.status(401).json({
      error: 'That seller access code is not recognized.',
    });
    return false;
  }
  return true;
};
