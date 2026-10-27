-- =======================================================
-- PondyCollect Sample Seed Data
-- Passwords are all hashed with bcrypt (salt rounds = 10)
-- Default password for all seed accounts: Password@123
-- =======================================================

USE pondycollect_db;

-- Clear previous sample data safely if needed
-- Note: Foreign key constraints cascade deletes from users table
DELETE FROM users WHERE email IN (
    'john.doe@pondycollect.com',
    'priya.s@pondycollect.com',
    'alex.admin@pondycollect.com',
    'sarah.c@pondycollect.com'
);

-- 1. Insert Admins
INSERT INTO users (name, email, password, role) VALUES
('Alex Mercer', 'alex.admin@pondycollect.com', '$2b$10$3zoQNIDcRKA3j3jaOkK/luym3kfTKIxTKYil9J0.zGKK6Jwdy13aG', 'admin'),
('Sarah Connor', 'sarah.c@pondycollect.com', '$2b$10$3zoQNIDcRKA3j3jaOkK/luym3kfTKIxTKYil9J0.zGKK6Jwdy13aG', 'admin');

-- Link Admin profiles using LAST_INSERT_ID() or subqueries
INSERT INTO admins (user_id, department, designation, phone)
SELECT id, 'Operations Management', 'Director of Operations', '+91 98765 43210'
FROM users WHERE email = 'alex.admin@pondycollect.com';

INSERT INTO admins (user_id, department, designation, phone)
SELECT id, 'Information Technology', 'Chief Systems Architect', '+91 98765 43211'
FROM users WHERE email = 'sarah.c@pondycollect.com';

-- 2. Insert Employees
INSERT INTO users (name, email, password, role) VALUES
('John Doe', 'john.doe@pondycollect.com', '$2b$10$3zoQNIDcRKA3j3jaOkK/luym3kfTKIxTKYil9J0.zGKK6Jwdy13aG', 'employee'),
('Priya Sharma', 'priya.s@pondycollect.com', '$2b$10$3zoQNIDcRKA3j3jaOkK/luym3kfTKIxTKYil9J0.zGKK6Jwdy13aG', 'employee');

-- Link Employee profiles
INSERT INTO employees (user_id, department, designation, phone)
SELECT id, 'Inventory & Logistics', 'Senior Catalog Specialist', '+91 98765 43212'
FROM users WHERE email = 'john.doe@pondycollect.com';

INSERT INTO employees (user_id, department, designation, phone)
SELECT id, 'Customer Support', 'Lead Support Specialist', '+91 98765 43213'
FROM users WHERE email = 'priya.s@pondycollect.com';
