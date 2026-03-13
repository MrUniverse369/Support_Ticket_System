-- =========================================================
-- Support Ticket System Database Schema
-- =========================================================

-- ------------------- Users Table ------------------------
CREATE TABLE IF NOT EXISTS Users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL -- e.g., 'support', 'admin'
);

-- ------------------- Tickets Table ----------------------
CREATE TABLE IF NOT EXISTS Tickets (
    ticket_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'closed'
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
    created_by INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    assigned_to INT REFERENCES Users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- --------------- Ticket Comments Table ------------------
CREATE TABLE IF NOT EXISTS TicketComments (
    comment_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES Tickets(ticket_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);