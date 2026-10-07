DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    category VARCHAR(100),
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- admin user with password 'Admin123!' (hashed with bcrypt 10 rounds)
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin', 'admin@site.com', '$2b$10$Wp23pT/gT/hK5XwWpG.4/.N9950bZ4pS6Q/8Qx2Z7L7b7U9M/9i.a', 'admin');

-- sample products
INSERT INTO products (name, description, price, stock, category, image_url) VALUES
('Laptop', 'High performance laptop', 999.99, 10, 'Electronics', 'https://via.placeholder.com/300x200?text=Laptop'),
('Smartphone', 'Latest smartphone model', 699.99, 15, 'Electronics', 'https://via.placeholder.com/300x200?text=Smartphone'),
('Headphones', 'Noise-cancelling headphones', 199.99, 20, 'Accessories', 'https://via.placeholder.com/300x200?text=Headphones'),
('Keyboard', 'Mechanical keyboard', 89.99, 30, 'Accessories', 'https://via.placeholder.com/300x200?text=Keyboard'),
('Mouse', 'Wireless gaming mouse', 59.99, 25, 'Accessories', 'https://via.placeholder.com/300x200?text=Mouse'),
('Monitor', '4K UHD Monitor', 349.99, 12, 'Electronics', 'https://via.placeholder.com/300x200?text=Monitor'),
('Desk Chair', 'Ergonomic office chair', 149.99, 8, 'Furniture', 'https://via.placeholder.com/300x200?text=Chair'),
('Desk', 'Standing desk', 299.99, 5, 'Furniture', 'https://via.placeholder.com/300x200?text=Desk');