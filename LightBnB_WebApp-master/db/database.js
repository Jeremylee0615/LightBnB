const { Pool } = require('pg');

const pool = new Pool({
  user: 'labber',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

const properties = require("./json/properties.json");
const users = require("./json/users.json");

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool
  .query(`SELECT * FROM users where email = $1;`, [email])
  .then ((result) => {
    if(!result.rows.length) {
      return(null)
    };
    
    return result.rows[0];
  })

  .catch((err) => {
    console.log(err.message);
  });
};


/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
  .query(`SELECT * FROM users where id = $1;`, [id])
  .then ((result) => {
    if(!result.rows.length) {
      return(null)
    };
    
    return result.rows[0];
  })

  .catch((err) => {
    console.log(err.message);
  });
};


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
 return pool
 .query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *`,
 [user.name, user.email, user.password])
 
 .then ((result) => {
    if(!result.rows.length) {
      return(null)
    };
  
  return result.rows[0];
})

  .catch((err) => {
    console.log(err.message);
  });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
 return pool
 .query(
  `SELECT reservations.*, properties.* id, avg(property_reviews.rating) as average_rating
  FROM reservations
  JOIN properties ON properties.id = reservations.property_id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = 1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date 
  LIMIT $1;`, [limit]
 )
 .then((result) => {
    return result.rows;
 })

  .catch((err) => {
    console.log(err.message);
  });
};




/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  // 1
  const queryParams = [];
  
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // 3
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }
  
  //minimum price per night 
  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night);
    if (queryParams.length >= 2) {
      queryString += `AND cost_per_night > $${queryParams.length} `;
    } else {
      queryString += `WHERE cost_per_night > $${queryParams.length} `;
    }
  }

  //maixmum price per night
  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night);
    if (queryParams.length >= 2) {
      queryString += `AND cost_per_night < $${queryParams.length} `;
    } else {
      queryString += `WHERE cost_per_night < $${queryParams.length} `
    }
  }

  //minimum rating
  if (options.minimum_rating > 0) {
    queryParams.push(options.minimum_rating);
    if (queryParams.length >= 2) {
      queryString += `AND rating > $${queryParams.length}`;
    } else {
      queryString += `WHERE rating > $${queryParams.length}`;
    }
  }

  // 4
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;
  
  // 5
  console.log(queryString, queryParams);

  // 6
  return pool
  .query(queryString, queryParams)
  .then((res) => res.rows);
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
