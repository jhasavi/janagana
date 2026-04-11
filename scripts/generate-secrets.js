const crypto = require('crypto');

console.log('Generating secure secrets for janagana...');
console.log('');
console.log('JWT_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('');
console.log('MEMBER_JWT_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('');
console.log('Copy the above values to your .env file');
console.log('Replace the current JWT_SECRET=replace_me and MEMBER_JWT_SECRET=replace_me');
