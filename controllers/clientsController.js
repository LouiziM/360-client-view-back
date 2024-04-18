const sql = require('mssql');
const dbConfig = require('../config/dbConn');
const axios = require('axios');

const getClients = async (req, res) => {
  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request().query('SELECT * FROM A_CUSTOMER');

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

function calculateRatio(customer, fields) {
  const totalFields = fields.length;
  const filledFields = fields.filter(field => customer[field]).length;
  return totalFields !== 0 ? (filledFields / totalFields) * 100 : 0;
}

const getCompletion = async (req, res) => {
  const { id } = req.params;
  const contact_fields = ['BIRTHDATE', 'PHONE', 'PHONEPRI', 'EMAIL', 'FAX'];
  const demographic_fields = ['CIVILITY', 'GENDER', 'NATIONALITY', 'CIN'];
  const geographic_fields = ['SITE', 'REGION', 'ADDRESS', 'ZIP', 'CITY', 'COUNTRY'];

  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM A_CUSTOMER WHERE [CUSTNO] = @id');
    const resultClient = result.recordset[0];

    if (resultClient) {
      // Calculate ratios
      const contact_ratio = Math.round(calculateRatio(resultClient, contact_fields));
      const demographic_ratio = Math.round(calculateRatio(resultClient, demographic_fields));
      const geographic_ratio = Math.round(calculateRatio(resultClient, geographic_fields));

      // Find missing fields
      const missing_contact_fields = findMissingFields(resultClient, contact_fields);
      const missing_demographic_fields = findMissingFields(resultClient, demographic_fields);
      const missing_geographic_fields = findMissingFields(resultClient, geographic_fields);

      return res.status(200).json({
       
        'Situation démographique': {
          'Completion Ratio': demographic_ratio,
          'Missing Fields': missing_demographic_fields
        },
        'Situation géographique': {
          'Completion Ratio': geographic_ratio,
          'Missing Fields': missing_geographic_fields
        }, 
        'Contact': {
          'Completion Ratio': contact_ratio,
          'Missing Fields': missing_contact_fields
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Client non trouvé"
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Les complétudes de données ne sont pas récupérées"
    });
  } finally {
    sql.close();
  }
};

function calculateRatio(customer, fields) {
  const filledFields = fields.filter(field => customer[field] !== null && customer[field] !== undefined);
  return (filledFields.length / fields.length) * 100;
}

function findMissingFields(customer, fields) {
  return fields.filter(field => customer[field] === null || customer[field] === undefined || customer[field] === '');
}


const getCountByRegion = async (req, res) => {
  try {
    const response = await axios.get(`http://127.0.0.1:5000/customers/customer-count-by-region`);
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
  getClients, getCompletion, getCountByRegion

};
