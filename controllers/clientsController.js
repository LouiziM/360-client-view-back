const sql = require('mssql');
const dbConfig = require('../config/dbConn'); 
const axios = require('axios');

const getClients = async (req, res) => {
  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request().query('SELECT * FROM customer');

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(204).json({ message: 'No clients found' });
    }

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    sql.close();
  }
};


const getCompletion = async (req, res) => {
  const { id } = req.params;

  try {
    const response = await axios.get(`http://127.0.0.1:5000/customers/completion/${id}`);

    res.json(response.data);
  } catch (error) {
    if (error.response) {
    
      res.status(error.response.status).json({ message: error.response.data });
    } else if (error.request) {
      res.status(500).json({ message: 'No response received from the server' });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};


module.exports = {
  getClients,getCompletion,

};
