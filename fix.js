const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const hash = '$2b$10$HLCtY7eDG5CvC33SyRU8dOYJJns4eZtKIiYBjLsABaG7hrg5zLELu';

pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, 'admin@site.com'])
  .then(() => {
    console.log('Successfully updated password hash');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

