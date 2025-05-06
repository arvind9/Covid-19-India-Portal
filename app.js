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
    response.status(401)
    response.send('Invalid user')
  } else {
    const ifPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (ifPasswordMatched === true) {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'arvind')
      response.send({jwtToken})
    } else {
      response.status(401)
      response.send('Invalid password')
    }
  }
})

const authentication = (request, response, next) => {
  let jwtToken;
  const authenticationHeader = request.headers['authorization']
  if (authenticationHeader !== undefined){
      jwtToken = authenticationHeader.split(" ")[1]
  }
  if (authenticationHeader === undefined){
    response.status(401)
    response.send("Invalid JWT Token")
  }else{
    jwt.verify(jwtToken, "arvind", async (error, payload)=>{
      if (error){
        response.status(401)
        response.send("Invalid JWT Token")
      }else{
        next()
      }
    })
  }
}

// API - 2 GET 
app.get('/states/', authentication, async (request, response)=>{
  const 
})
