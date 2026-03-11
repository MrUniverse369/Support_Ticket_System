const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pg = require('pg');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Serve frontend
app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// PostgreSQL
const db = new pg.Client({
    user: process.env.DBUSER,
    host: process.env.DBHOST,
    password: process.env.DBPASSWORD,
    database: process.env.DB,
    port: process.env.DBPORT
});

db.connect()
.then(()=>console.log("Connected to PostgreSQL"))
.catch(err=>console.error(err));

/* =====================
   GET ALL TICKETS
===================== */

app.get('/tickets', async (req,res)=>{

    try{

        const result = await db.query(`
            SELECT 
                t.ticket_id,
                t.title,
                t.description,
                t.priority,
                t.status,
                t.created_at,
                u1.name AS created_by,
                u2.name AS assigned_to
            FROM tickets t
            LEFT JOIN users u1 ON t.created_by = u1.user_id
            LEFT JOIN users u2 ON t.assigned_to = u2.user_id
            ORDER BY t.created_at DESC
        `)

        res.json(result.rows)

    }catch(err){

        console.error(err)
        res.status(500).json({error:"Server error"})

    }

})

/* =====================
   CREATE TICKET
===================== */

app.post('/tickets', async (req,res)=>{

    const {title,description,priority,created_by} = req.body

    try{

        const result = await db.query(

            `INSERT INTO tickets 
            (title,description,priority,created_by)
            VALUES ($1,$2,$3,$4)
            RETURNING *`,

            [title,description,priority,created_by]

        )

        res.json(result.rows[0])

    }catch(err){

        console.error(err)
        res.status(500).json({error:"Could not create ticket"})

    }

})

/* =====================
   ASSIGN USER
===================== */

app.patch('/tickets/:id/assign', async (req,res)=>{

    const {id} = req.params
    const {assigned_to} = req.body

    try{

        const result = await db.query(

            `UPDATE tickets
             SET assigned_to=$1,
             updated_at=NOW()
             WHERE ticket_id=$2
             RETURNING *`,

            [assigned_to,id]

        )

        res.json(result.rows[0])

    }catch(err){

        console.error(err)
        res.status(500).json({error:"Assignment failed"})

    }

})

/* =====================
   COMPLETE TICKET
===================== */

app.patch('/tickets/:id/status', async (req,res)=>{

    const {id} = req.params
    const {status} = req.body

    try{

        const result = await db.query(

            `UPDATE tickets
             SET status=$1,
             updated_at=NOW()
             WHERE ticket_id=$2
             RETURNING *`,

            [status,id]

        )

        res.json(result.rows[0])

    }catch(err){

        console.error(err)
        res.status(500).json({error:"Status update failed"})

    }

})

/* =====================
   ADD COMMENT
===================== */

app.post('/tickets/:id/comments', async (req,res)=>{

    const {id} = req.params
    const {user_id,comment} = req.body

    try{

        const result = await db.query(

            `INSERT INTO comments
            (ticket_id,user_id,comment)
            VALUES ($1,$2,$3)
            RETURNING *`,

            [id,user_id,comment]

        )

        res.json(result.rows[0])

    }catch(err){

        console.error(err)
        res.status(500).json({error:"Comment failed"})

    }

})

/* =====================
   GET COMMENTS
===================== */

app.get('/tickets/:id/comments', async (req,res)=>{

    const {id} = req.params

    try{

        const result = await db.query(

            `SELECT 
                c.comment_id,
                c.comment,
                c.created_at,
                u.name
             FROM comments c
             JOIN users u
             ON c.user_id = u.user_id
             WHERE ticket_id=$1
             ORDER BY created_at ASC`,

            [id]

        )

        res.json(result.rows)

    }catch(err){

        console.error(err)
        res.status(500).json({error:"Could not fetch comments"})

    }

})

/* =====================
   DASHBOARD STATS
===================== */

app.get('/dashboard', async (req,res)=>{

    try{

        const result = await db.query(

            `SELECT status, COUNT(*) 
             FROM tickets
             GROUP BY status`

        )

        res.json(result.rows)

    }catch(err){

        console.error(err)
        res.status(500).json({error:"Dashboard error"})

    }

})

app.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}`)
})