const express = require('express');
const path = require('path');
const { format } = require("date-fns");
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const dotenv = require('dotenv');
const cors = require('cors');
const {v4 : uuidv4} = require('uuid')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { off } = require('process');

const app = express();
app.use(express.json()); 
app.use(cors());
require('dotenv').config();

console.log({jwt: process.env.JWT_SECRET})

const dbPath = path.join(__dirname, 'jobPortal.db');
let db;

const initializeDbTOServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        app.listen(5000, () => console.log("Server running on port 5000"));
    } catch (error) {
        console.log(error.message);
        process.exit(1);
    }
}

initializeDbTOServer();

const Authenticate = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No token provided." });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        const errors = {
            TokenExpiredError: "Session expired. Please log in again.",
            JsonWebTokenError: "Invalid token. Please log in again."
        };

        return res.status(403).json({ error: errors[err.name] || "Authentication failed." });
    }
};


// User Register
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    console.log(username, email, password);
    
    try {
        const checkUserQuery = `SELECT * FROM user WHERE username=? OR email=?`
        const checkUser = await db.get(checkUserQuery, [username, email]);

        if (checkUser) {
            return res.status(400).json({ error: 'Username or Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 5);

        const addNewUserQuery = `INSERT INTO user (user_id, username, email, password) VALUES (?, ?, ?,?)`
        await db.run(addNewUserQuery,[uuidv4(), username, email, hashedPassword])

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//User Login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const checkUserQuery = `SELECT * FROM user WHERE email=?`
        const checkUser = await db.get(checkUserQuery,[email])

        if (checkUser === undefined) {
            return res.status(400).json({ error: 'Email not exists' });
        }

        const isPasswordValid = await bcrypt.compare(password, checkUser.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        const token = jwt.sign({ userId: checkUser.user_id }, process.env.JWT_SECRET, { expiresIn: '10d' });

        res.status(200).json({ message: 'Login successful', user_id: checkUser.user_id, username: checkUser.username, token });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Post new Job
app.post('/job/add', Authenticate, async (req, res) => {
    try {
        const { user_id,
                company_name,
                logo_url, 
                job_position, 
                monthly_salary, 
                job_type, 
                remote_office, 
                location, 
                job_description, 
                about_company, 
                skills_required, 
                additional_info } = req.body;
        
        const formattedDate = format(new Date(), "dd-MM-yyyy");

        const checkJobQuery = `SELECT * FROM job_list WHERE company_name=? AND job_position=? AND user_id=?`;
        const existingJob = await db.get(checkJobQuery, [company_name, job_position, user_id]);
        
        if (existingJob) {
            return res.status(400).json({ error: 'You have already posted this job.' });
        }

        const addNewJobQuery = `
            INSERT INTO job_list (
                job_id,
                user_id,
                company_name, 
                logo_url, 
                job_position, 
                monthly_salary, 
                job_type, 
                remote_office, 
                location, 
                job_description, 
                about_company, 
                skills_required, 
                additional_info,
                job_posted ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
        await db.run(addNewJobQuery, [
            uuidv4(),
            user_id,
            company_name,
            logo_url, 
            job_position, 
            monthly_salary, 
            job_type, 
            remote_office, 
            location, 
            job_description, 
            about_company, 
            skills_required, 
            additional_info,
            formattedDate
        ])
        res.status(201).json({ message: 'Job posted successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Error posting job' });
    }
});


// Get All Jobs
app.get('/job/get', async (req, res) => {
    const { jobId, page = 1 } = req.query; 
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        if (jobId) {
            const getJobQuery = `SELECT * FROM job_list WHERE job_id = ?;`;
            const getJob = await db.get(getJobQuery, [jobId]);
            res.status(200).json(getJob);
        } else {
            const getJobQuery = `SELECT * FROM job_list LIMIT ? OFFSET ?;`;
            const getJob = await db.all(getJobQuery, [limit, offset]);
            const countQuery = `SELECT COUNT(*) AS total FROM job_list;`;
            const countResult = await db.get(countQuery);
            totalJobs = countResult.total;

            res.status(200).json({jobs: getJob, totalPages: Math.ceil(totalJobs / limit) });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error fetching jobs' });
    }
});


// Update Job
app.put('/job/update/:id', Authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            company_name,
            logo_url, 
            job_position, 
            monthly_salary, 
            job_type, 
            remote_office, 
            location, 
            job_description, 
            about_company, 
            skills_required, 
            additional_info,
        } = req.body;
        
        
        let updateFields = [];
        let values = [];

        if (company_name) { updateFields.push("company_name = ?"); values.push(company_name); }
        if (logo_url) { updateFields.push("logo_url = ?"); values.push(logo_url); }
        if (job_position) { updateFields.push("job_position = ?"); values.push(job_position); }
        if (monthly_salary) { updateFields.push("monthly_salary = ?"); values.push(monthly_salary); }
        if (job_type) { updateFields.push("job_type = ?"); values.push(job_type); }
        if (remote_office) { updateFields.push("remote_office = ?"); values.push(remote_office); }
        if (location) { updateFields.push("location = ?"); values.push(location); }
        if (job_description) { updateFields.push("job_description = ?"); values.push(job_description); }
        if (about_company) { updateFields.push("about_company = ?"); values.push(about_company); }
        if (skills_required) { updateFields.push("skills_required = ?"); values.push(skills_required); }
        if (additional_info) { updateFields.push("additional_info = ?"); values.push(additional_info); }

        // Ensure at least one field is being updated
        if (updateFields.length === 0) {
            return res.status(400).json({ error: "No fields provided for update" });
        }

        values.push(id); // Add job_id to values array

        const jobUpdateQuery = `UPDATE job_list SET ${updateFields.join(', ')} WHERE job_id = ?`;
        await db.run(jobUpdateQuery, values);
        
        res.json({ message: 'Job updated successfully' });
    } catch (error) {
        console.error("Error updating job:", error);
        res.status(500).json({ error: 'Error updating job' });
    }
});


// Delete Job
app.delete('/job/delete/:id', Authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const deleteQuery = `DELETE FROM job_list WHERE job_id = ?`
        await db.run(deleteQuery, [id])
        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting job' });
    }
});

//add apply job
app.post('/job/apply', Authenticate, async (req, res) => {
    try {
        const { user_id, job_id, company_name, logo_url, job_position, applied_date } = req.body;

        if (!user_id || !job_id || !company_name || !logo_url || !job_position || !applied_date) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const applyJobQuery = `
            INSERT INTO applied_jobs (apply_id, user_id, job_id, company_name, logo_url, job_position, applied_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?);
        `;

        const checkAppliedQuery = `SELECT * FROM applied_jobs WHERE user_id=? AND job_id=?`;
        const alreadyApplied = await db.get(checkAppliedQuery, [user_id, job_id]);

        if (alreadyApplied) {
            return res.status(400).json({ error: 'You have already applied for this job' });
        }

        await db.run(applyJobQuery, [
            uuidv4(),
            user_id,
            job_id,
            company_name,
            logo_url,
            job_position,
            applied_date
        ]);

        res.status(201).json({ message: "Job applied successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Error applying for job" });
    }
});

// get apply jobs
app.get('/job/applied/:user_id', Authenticate, async (req, res) => {
    try {
        const { user_id } = req.params;
        
        const getAppliedJobsQuery = `
            SELECT * FROM applied_jobs 
            WHERE user_id = ? 
            ORDER BY applied_date DESC;
        `;

        const jobs = await db.all(getAppliedJobsQuery, [user_id]);

        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: "Error fetching applied jobs" });
    }
});

//delete apply jobs
app.delete('/job/applied/delete/:apply_id', Authenticate, async (req, res) => {
    try {
        const { apply_id } = req.params;
        
        const checkQuery = `SELECT * FROM applied_jobs WHERE apply_id = ?`;
        const jobExists = await db.get(checkQuery, [apply_id]);

        if (!jobExists) {
            return res.status(404).json({ error: "Applied job not found!" });
        }

        const deleteQuery = `DELETE FROM applied_jobs WHERE apply_id = ?`;
        await db.run(deleteQuery, [apply_id]);

        res.json({ message: "Applied job deleted successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting applied job" });
    }
});