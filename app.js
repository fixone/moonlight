const config = require('./config')
const ln = require('./lightning')
//database - mostly for tokens
const db = require('knex')(config.knex)
///express stuff here
const bodyParser = require('body-parser')
const express = require('express')
const app = express()
app.use(bodyParser.json())
//logging & authorization & basic error handling function
app.use((error,req,res,next) => {
    
    console.log("Request for",req.url,"@",new Date().getTime())
    if(error) {
        return res.status(error.status).json({errorCode:99,errorMessage:error.type+" "+error.message})
    }
    if(req.headers["x-auth-key"] != '111') {
        return res.status(401).json(config.errors['UNAUTHORIZED'])
    }
    next()
})

app.use(config.rpcMountPoint || '/rpc',require('./rpc'))
app.use(config.apiMountPoint || '/api',require('./api'))

const port = process.env.PORT || 3000

app.listen(port, () => console.log('API started on port '+port))


