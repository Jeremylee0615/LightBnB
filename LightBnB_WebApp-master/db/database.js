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
 .query(`
  SELECT reservations.*, properties.*, avg(property_reviews.rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id 
  WHERE reservations.guest_id = $1 AND end_date < now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY start_date
  LIMIT $2;
  `, [guest_id, limit]
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
  
  // 2 added WHERE 1=1 to make the codes simpler 
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  WHERE 1=1 
  `;

  // 3
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `AND city LIKE $${queryParams.length} `;
  }
  
  //minimum price per night (Input is multiplied by 100 to make the data into cents instead of dollars)
  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);

    queryString += `AND cost_per_night > $${queryParams.length} `;
  }
    
  //maixmum price per night (Input is multiplied by 100 to make the data into cents instead of dollars)
  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    queryString += `AND cost_per_night < $${queryParams.length } `;
  }

  // 4-a to make the codes simpler 
  queryString += `GROUP BY properties.id `; 

  //minimum rating
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `HAVING avg(rating) >= $${queryParams.length} `;
  }

  // 4-b
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;
  
  // 5
  console.log(queryString, queryParams);

  // 6
  
  return pool
  .query(queryString, queryParams)
  .then((result) => result.rows);
  
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  //1 queryString(INSERTs)
  const queryString = `
  INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms) 
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
  RETURNING *;`  

  //2 queryParams(arrays)
  const queryParams = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night,
    property.street,
    property.city,
    property.province,
    property.post_code,
    property.country,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms,
  ];  

  return pool
  .query(
    queryString,
    queryParams
  )
  .then((result) => {
    return result.rows;
  })
  .catch((err) => {
    console.log(err.message);
  });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
