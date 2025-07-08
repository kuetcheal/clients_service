const db = require('../services/db');
const bcrypt = require('bcrypt');

const AuthModel = {
  register: async ({ email, password }, callback) => {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.query(
        'INSERT INTO users (email, password) VALUES (?, ?)',
        [email, hashedPassword],
        callback
      );
    } catch (error) {
      callback(error, null);
    }
  },

  findByEmail: (email, callback) => {
    db.query('SELECT * FROM users WHERE email = ?', [email], callback);
  }
};

module.exports = AuthModel;
