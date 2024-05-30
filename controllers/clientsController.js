const sql = require('mssql');
const dbConfig = require('../config/dbConn');
const axios = require('axios');

const getClients = async (req, res) => {
  let pool;
  const { page = 0, pageSize = 10, searchTerm = '' } = req.query;
  try {
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const offset = page * pageSize;

    const countQuery = `
      SELECT COUNT(*) AS TotalClients 
      FROM [A_CUSTOMER]
      WHERE (NAME2 LIKE '%${searchTerm}%' OR FIRSTNAME LIKE '%${searchTerm}%' OR CITY LIKE '%${searchTerm}%' OR ADDRESS LIKE '%${searchTerm}%') AND DATEDIFF(YEAR, DATECRE, GETDATE()) <= 5
    `;
    const countResult = await pool.request().query(countQuery);
    const totalClients = countResult.recordset[0].TotalClients;

    const result = await pool.request().query(`
      SELECT [dbo].[A_CUSTOMER].[CUSTNO] AS id,
      [dbo].[A_CUSTOMER].[CUSTNO],[dbo].[A_CUSTOMER].[NAME2],[dbo].[A_CUSTOMER].[FIRSTNAME],[dbo].[A_CUSTOMER].[ADDRESS],[dbo].[A_CUSTOMER].[ZIP],[dbo].[A_CUSTOMER].[CITY],
      [dbo].[A_CUSTOMER].[COUNTRY],[dbo].[A_CUSTOMER].[BIRTHDATE],[dbo].[A_CUSTOMER].[PHONE],[dbo].[A_CUSTOMER].[PHONEPRI],[dbo].[A_CUSTOMER].[EMAIL],[dbo].[A_CUSTOMER].[FAX],
      [dbo].[A_CUSTOMER].[CIVILITY],[dbo].[A_CUSTOMER].[DATECRE],[dbo].[A_CUSTOMER].[TYPECUST],[dbo].[A_CUSTOMER].[TYPECUST2],[dbo].[A_CUSTOMER].[ICE],[dbo].[A_CUSTOMER].[CIN],
      [dbo].[A_CUSTOMER].[INTERGROUPE],[dbo].[A_CUSTOMER].[SITE],[dbo].[A_CUSTOMER].[REGION],[dbo].[A_CUSTOMER].[GENDER],[dbo].[A_CUSTOMER].[NATIONALITY],[dbo].[A_CUSTOMER].[isFormatted],
      [dbo].[A_CUSTOMER].[isImputed],[dbo].[A_CUSTOMER].[LIBSITE],[dbo].[A_CUSTOMER].[SOLDE],[dbo].[A_CUSTOMER].[CREDIT_AUTORISE],[dbo].[A_CUSTOMER].[STATUT_FIN],
	    (SELECT TOP(1) [dbo].[W_F_FACTURE_COMMERCIAL_FINAL].[COMMERCIAL] FROM [dbo].[W_F_FACTURE_COMMERCIAL_FINAL] WHERE [dbo].[W_F_FACTURE_COMMERCIAL_FINAL].[NO_CLIENT] = [dbo].[A_CUSTOMER].[CUSTNO] 
      ORDER BY [dbo].[W_F_FACTURE_COMMERCIAL_FINAL].[DATE_FACTURE] DESC) AS COMMERCIAL
      FROM [dbo].[A_CUSTOMER]
      LEFT JOIN [dbo].[W_F_FACTURE_COMMERCIAL_FINAL] ON [dbo].[A_CUSTOMER].[CUSTNO] = [dbo].[W_F_FACTURE_COMMERCIAL_FINAL].[NO_CLIENT]
      WHERE ([dbo].[A_CUSTOMER].[CUSTNO] LIKE '%${searchTerm}%' 
      OR [dbo].[A_CUSTOMER].[NAME2] LIKE '%${searchTerm}%' 
      OR [dbo].[A_CUSTOMER].[FIRSTNAME] LIKE '%${searchTerm}%' 
      OR [dbo].[A_CUSTOMER].[CITY] LIKE '%${searchTerm}%' 
      OR [dbo].[A_CUSTOMER].[ADDRESS] LIKE '%${searchTerm}%') 
      AND DATEDIFF(YEAR, DATECRE, GETDATE()) <= 4
      GROUP BY [dbo].[A_CUSTOMER].[CUSTNO],[dbo].[A_CUSTOMER].[NAME2],[dbo].[A_CUSTOMER].[FIRSTNAME],[dbo].[A_CUSTOMER].[ADDRESS],[dbo].[A_CUSTOMER].[ZIP],[dbo].[A_CUSTOMER].[CITY]
      ,[dbo].[A_CUSTOMER].[COUNTRY],[dbo].[A_CUSTOMER].[BIRTHDATE],[dbo].[A_CUSTOMER].[PHONE],[dbo].[A_CUSTOMER].[PHONEPRI],[dbo].[A_CUSTOMER].[EMAIL],[dbo].[A_CUSTOMER].[FAX]
      ,[dbo].[A_CUSTOMER].[CIVILITY],[dbo].[A_CUSTOMER].[DATECRE],[dbo].[A_CUSTOMER].[TYPECUST],[dbo].[A_CUSTOMER].[TYPECUST2],[dbo].[A_CUSTOMER].[ICE],[dbo].[A_CUSTOMER].[CIN]
      ,[dbo].[A_CUSTOMER].[INTERGROUPE],[dbo].[A_CUSTOMER].[SITE],[dbo].[A_CUSTOMER].[REGION],[dbo].[A_CUSTOMER].[GENDER],[dbo].[A_CUSTOMER].[NATIONALITY],[dbo].[A_CUSTOMER].[isFormatted]
      ,[dbo].[A_CUSTOMER].[isImputed],[dbo].[A_CUSTOMER].[LIBSITE],[dbo].[A_CUSTOMER].[SOLDE],[dbo].[A_CUSTOMER].[CREDIT_AUTORISE],[dbo].[A_CUSTOMER].[STATUT_FIN]
      ORDER BY DATECRE DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY 
    `);

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(200).json({ success: true, message: 'Il y a pas de clients', data: [] });
    }

    res.status(200).json({ success: true, totalClients, data: result.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur interne du serveur" });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};

// const getClients = async (req, res) => {
//   try {
//     const pool = new sql.ConnectionPool(dbConfig);
//     await pool.connect();

//     const result = await pool.request().query(`
//       WITH CA AS (
//         SELECT NO_CLIENT, SUM(CA_VENTE_VEHICULE) AS CA FROM [W_F_FACTURE_COMMERCIAL_FINAL] GROUP BY NO_CLIENT
//         UNION
//         SELECT NO_CLIENT, SUM(CA) AS CA FROM [W_F_FACTURE_MAGASIN_ATELIER_FINAL] GROUP BY NO_CLIENT
//       ) SELECT * FROM [A_CUSTOMER] JOIN CA ON CA.NO_CLIENT = [A_CUSTOMER].CUSTNO 
//     `);

//     if (!result.recordset || result.recordset.length === 0) {
//       return res.status(400).json({ success: false, message: 'Il y a pas de clients' });
//     }

//     res.json(result.recordset);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: "Erreur interne du serveur" });
//   } finally {
//     sql.close();
//   }
// };

const getParcClient = async (req, res) => {
  const { numClient } = req.params;
  let pool;
  try {
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request()
      .input('numClient', sql.Int, numClient)
      .query(`SELECT * FROM ParcClient WHERE [NO_CLIENT_PROP] = @numClient ORDER BY DATE_FACTURE DESC`);

    const lastDateAchat = await pool.request()
      .input('numClient', sql.Int, numClient)
      .query(`SELECT MAX(DATE_FACTURE) AS LAST_DATE_ACHAT FROM [dbo].[W_F_FACTURE_COMMERCIAL_FINAL] WHERE [NO_CLIENT] = @numClient`);

    const lastCommercial = await pool.request()
      .input('numClient', sql.Int, numClient)
      .query(`SELECT TOP(1) COMMERCIAL FROM [dbo].[W_F_FACTURE_COMMERCIAL_FINAL] WHERE [NO_CLIENT] = @numClient ORDER BY [DATE_FACTURE] desc`);

    res.status(200).json({
      success: true,
      message: "Parc des Clients",
      data: result.recordset,
      dernierDateAchat: lastDateAchat?.recordset[0]?.LAST_DATE_ACHAT,
      dernierCommercial: lastCommercial?.recordset[0]?.COMMERCIAL
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur"
    });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

const getPassageSAV = async (req, res) => {
  const { numClient } = req.params;
  let pool;
  try {
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request()
      .input('numClient', sql.Int, numClient)
      .query(`
        SELECT CAST(ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS INT) AS id, * FROM [dbo].[PassageSAV] WHERE [NO_CLIENT] = @numClient
        ORDER BY [SENTIMENT] DESC
      `);

    res.status(200).json({
      success: true,
      message: "Passage SAV",
      data: result.recordset
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur"
    });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// function calculateRatio(customer, fields) {
//   const totalFields = fields.length;
//   const filledFields = fields.filter(field => customer[field]).length;
//   return totalFields !== 0 ? (filledFields / totalFields) * 100 : 0;
// }

function calculateRatio(customer, fields) {
  const filledFields = fields.filter(field => customer[field] !== null && customer[field] !== undefined && customer[field] !== '');
  return (filledFields.length / fields.length) * 100;
}

function findMissingFields(customer, fields) {
  return fields.filter(field => customer[field] === null || customer[field] === undefined || customer[field] === '');
}

const getCompletion = async (req, res) => {
  const { id } = req.params;
  let pool;
  const contact_fields = ['PHONE', 'PHONEPRI', 'EMAIL'];
  const demographic_fields = ['NAME2', 'FIRSTNAME', 'BIRTHDATE', 'CIVILITY', 'GENDER', 'NATIONALITY', 'CIN'];
  const geographic_fields = ['LIBSITE', 'REGION', 'ADDRESS', 'ZIP', 'CITY', 'COUNTRY'];

  try {
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM A_CUSTOMER WHERE [CUSTNO] = @id');
    const resultCA = await pool.request().input('id', sql.Int, id).query(`
      WITH CA AS(
        select NO_CLIENT, SUM(CA_VENTE_VEHICULE) AS CA from [W_F_FACTURE_COMMERCIAL_FINAL] WHERE NO_CLIENT = @id GROUP BY NO_CLIENT
        UNION
        select NO_CLIENT, SUM(CA) AS CA from [W_F_FACTURE_MAGASIN_ATELIER_FINAL] WHERE NO_CLIENT = @id GROUP BY NO_CLIENT
      )
      SELECT SUM(CA) AS Total_CA FROM CA
    `)
    if (!result?.recordset[0]) {
      return res.status(400).json({
        success: false,
        message: "Client non trouvé"
      });
    }
    // Calculate ratios
    const contact_ratio = Math.round(calculateRatio(result?.recordset[0], contact_fields));
    const demographic_ratio = Math.round(calculateRatio(result?.recordset[0], demographic_fields));
    const geographic_ratio = Math.round(calculateRatio(result?.recordset[0], geographic_fields));

    // Find missing fields
    const missing_contact_fields = findMissingFields(result?.recordset[0], contact_fields);
    const missing_demographic_fields = findMissingFields(result?.recordset[0], demographic_fields);
    const missing_geographic_fields = findMissingFields(result?.recordset[0], geographic_fields);

    return res.status(200).json({
      success: true,
      chiffreAffaires: resultCA?.recordset[0]?.Total_CA || 0,
      data: [{
        label: 'Contact',
        percentage: contact_ratio,
        missingFields: missing_contact_fields
      },
      {
        label: 'Situation démographique',
        percentage: demographic_ratio,
        missingFields: missing_demographic_fields
      },
      {
        label: 'Situation géographique',
        percentage: geographic_ratio,
        missingFields: missing_geographic_fields
      }]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur"
    });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};

const  getSatisfaction = async (req, res) => {
  const { numClient } = req.params;
  let pool;
  try {
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const resultEnquetes = await pool.request()
      .input('numClient', sql.Int, numClient)
      .query(`
        SELECT COUNT(*) AS ENQUETES
        FROM [dbo].[A_SATISFACTION] WHERE ID_CLIENT = @numClient
      `);

    const resultReclamation = await pool.request()
      .input('numClient', sql.Int, numClient)
      .query(`
        SELECT COUNT(*) AS RECLAMATIONS FROM [dbo].[A_CLAIM]
        LEFT JOIN [dbo].[A_CUSTOMER] ON [dbo].[A_CUSTOMER].[CUSTNO] = CAST([dbo].[A_CLAIM].[idclient] AS INT)
        WHERE [idclient] = CAST(@numClient AS VARCHAR)
      `);

    const result = await pool.request()
      .input('numClient', sql.Int, numClient)
      .query(`
      SELECT [ID_CLIENT]
      ,AVG((CASE WHEN [DETAIL_A10] = 'Très satisfait' THEN 3
      WHEN [DETAIL_A10] = 'Satisfait' THEN 2
      WHEN [DETAIL_A10] = 'Insatisfait' THEN 1
      WHEN [DETAIL_A10] = 'Très insatisfait' THEN 0
      ELSE NULL END)) AS SCORE
      FROM [CDP].[dbo].[A_SATISFACTION] where ID_CLIENT = @numClient
      GROUP BY ID_CLIENT
      `);

    res.status(200).json({
      success: true,
      message: "Satisfaction",
      reclamations: resultReclamation?.recordset[0]?.RECLAMATIONS || 0,
      enquetes: resultEnquetes?.recordset[0]?.ENQUETES || 0,
      data: result.recordset[0]
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur"
    });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
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
  getClients, getCompletion, getCountByRegion, getParcClient, getPassageSAV, getSatisfaction
};
