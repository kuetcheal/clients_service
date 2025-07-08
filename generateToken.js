const jwt = require('jsonwebtoken');
require('dotenv').config();

const payload = {
  userId: 123, // tu peux mettre n'importe quelle donnée utile
  role: 'admin'
};

const token = jwt.sign(payload, process.env.JWT_SECRET, {
  expiresIn: '1h'
});

console.log('Voici votre token JWT :');
console.log(token);
