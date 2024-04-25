//3
require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const sql = require('mssql');
const dbConfig = require('./config/dbConn');
const { hashPassword } = require('./utils/hashPassword');

const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const { logger } = require('./middleware/logEvents');
const errorHandler = require('./middleware/errorHandler');
const verifyJWT = require('./middleware/verifyJWT');
const cookieParser = require('cookie-parser');
const credentials = require('./middleware/credentials');
const PORT = process.env.PORT || 4004;

// custom middleware logger
app.use(logger);

// Handle options credentials check - before CORS!
// and fetch cookies credentials requirement
app.use(credentials);

// Cross Origin Resource Sharing
app.use(cors(corsOptions));

// built-in middleware to handle urlencoded form data
app.use(express.urlencoded({ extended: false }));

// built-in middleware for json 
app.use(express.json());

//middleware for cookies
app.use(cookieParser());

//serve static files
app.use('/', express.static(path.join(__dirname, '/public')));

// routes
app.use('/', require('./routes/root'));
app.use('/register', require('./routes/register'));
app.use('/auth', require('./routes/auth'));
app.use('/logout', require('./routes/logout'));
app.use('/users', require('./routes/api/users'));
app.use('/clients', require('./routes/clients'));

app.use(verifyJWT);

// Middleware to create default admin user if no users exist
const createDefaultAdminUser = async () => {
    let pool;
    try {
        pool = new sql.ConnectionPool(dbConfig);
        await pool.connect();

        // Check if there are any users in the database
        const result = await pool.query`SELECT * FROM [dbo].[Users] Where roles = 1`;
        const userCount = result.recordset.length;

        if (userCount === 0) {
            const password = await hashPassword('999999*+');
            const defaultAdminUser = {
                username: '999999',
                password: password,
                roles: 1,
                active: 1
            }

            try {
                await pool.request()
                    .input('username',  sql.VarChar(255), defaultAdminUser.username)
                    .input('password', sql.VarChar(255), defaultAdminUser.password)
                    .input('roles', sql.Int, defaultAdminUser.roles)
                    .input('active', sql.Bit, defaultAdminUser.active)
                    .query(`INSERT INTO dbo.Users(
                        [username], [password], [roles], [active]
                    ) VALUES (
                        @username, @password, @roles, @active
                    )`);
                console.log('Default admin user created');
            } catch (error) {
                console.error("Erreur d'initialisation Administrateur", error);
                // res.status(500).json({ message: 'Internal server error' });
            }
        }
        // next();
    } catch (error) {
        console.error('SQL error:', error);
        // res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
};

createDefaultAdminUser();

app.all('*', (req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'views', '404.html'));
    } else if (req.accepts('json')) {
        res.json({ "error": "404 Not Found" });
    } else {
        res.type('txt').send("404 Not Found");
    }
});

app.use(errorHandler);


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

