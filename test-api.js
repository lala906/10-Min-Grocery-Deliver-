const http = require('http');
const data = JSON.stringify({
  name: "Test User",
  phone: "1234567890",
  email: "test@example.com",
  password: "password123",
  shopName: "Test Shop",
  address: { street: "123", city: "Test", state: "ST", postalCode: "12345" },
  location: { lat: 10, lng: 20 },
  category: "kirana",
  shopFrontImage: "http://example.com/img.png",
  aadhaarNumber: "123456789012",
  aadhaarImage: "http://example.com/aadhaar.png",
  panNumber: "ABCDE1234F",
  panImage: "http://example.com/pan.png",
  accountHolderName: "Test User",
  accountNumber: "123456789",
  ifscCode: "TEST0000123"
});

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/shops/register-with-kyc',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let resData = '';
  res.on('data', chunk => { resData += chunk; });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', resData);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(data);
req.end();
