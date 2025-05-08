const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')

let db = null

const intializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error:${e.message}`)
    precess.exit(1)
  }
}

intializeDBAndServer()

//  API - 1 POST METHOD WITH AUTHENTICATION
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const hashedPassword = await bcrypt.hash(password, 10)
  const getUserQuery = `SELECT * FROM user WHERE username='${username}'`
  const dbUser = await db.get(getUserQuery)

  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const ifPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (ifPasswordMatched === true) {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'arvind')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

const authentication = (request, response, next) => {
  let jwtToken
  const authenticationHeader = request.headers['authorization']
  if (authenticationHeader !== undefined) {
    jwtToken = authenticationHeader.split(' ')[1]
  }
  if (authenticationHeader === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'arvind', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

// API - 2 GET ALL STATES
app.get('/states/', authentication, async (request, response) => {
  const listOfAllStatesQuery = `SELECT state_id as stateId, state_name as stateName, population FROM state`
  const statesList = await db.all(listOfAllStatesQuery)
  response.send(statesList)
})

// API - GET STATES WITH STATEID
app.get('/states/:stateId/', authentication, async (request, response) => {
  const {stateId} = request.params
  const getRequestedStateQuery = `
  SELECT 
    state_id as stateId, state_name as stateName, population 
  FROM 
    state 
  WHERE 
    state_id=${stateId}`
  const requestedState = await db.get(getRequestedStateQuery)
  response.send(requestedState)
})

// API - 4 POST METHOD
app.post('/districts/', authentication, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const cteateDistrictQuery = `
  INSERT INTO 
    district (district_name, state_id, cases, cured, active, deaths) 
  VALUES 
    ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});`
  await db.run(cteateDistrictQuery)
  response.send('District Successfully Added')
})

// API - 5 GET WITH DIST.ID
app.get(
  '/districts/:districtId/',
  authentication,
  async (request, response) => {
    const {districtId} = request.params
    const getDistrictDetailsQuery = `
  SELECT 
    district_id as districtId, district_name as districtName, state_id as stateId, cases, cured, active, deaths
  FROM 
    district
  WHERE
    district_id=${districtId};
  `
    const districts = await db.all(getDistrictDetailsQuery)
    response.send(...districts)
  },
)

// API - 6 DELETE METHOD
app.delete(
  '/districts/:districtId/',
  authentication,
  async (request, response) => {
    const {districtId} = request.params
    const deleteDistrictQuery = `
  DELETE FROM 
    district 
  WHERE 
    district_id=${districtId};`
    await db.run(deleteDistrictQuery)
    response.send('District Removed')
  },
)

// API - 7 PUT METHOD
app.put(
  '/districts/:districtId/',
  authentication,
  async (request, response) => {
    const {districtId} = request.params
    const updateDistrict = request.body
    const {districtName, stateId, cases, cured, active, deaths} = updateDistrict
    const updateDistrictQuery = `
  UPDATE 
    district 
  SET 
    district_name='${districtName}', state_id=${stateId}, cases=${cases}, cured=${cured}, active=${active}, deaths=${deaths} 
  WHERE 
    district_id=${districtId} `
    await db.run(updateDistrictQuery)
    response.send('District Details Updated')
  },
)

// API - 8 GET METHOD
app.get(
  '/states/:stateId/stats/',
  authentication,
  async (request, response) => {
    const {stateId} = request.params
    const statisticsCasesDistrictQuery = `
  SELECT 
    SUM(cases) as totalCases, SUM(cured) as totalCured, SUM(active) as totalActive, SUM(deaths) as totalDeaths 
  FROM 
    district
  WHERE 
    state_id=${stateId} `
    const totalCases = await db.all(statisticsCasesDistrictQuery)
    response.send(...totalCases)
  },
)

module.exports = app
