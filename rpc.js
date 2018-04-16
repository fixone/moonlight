const config = require('./config')
const ln = require('./lightning')
const debug = require('debug')('app:rpc')
const express = require('express')
var router = express.Router()

//helper fn to validate router is ok
router.get('/check',(req,res)=>res.status(200).json(config.errors['OK']))

//catch all function
router.use((req,res)=>{
    
    if(req.url.length>1) {
        let params = req.url.substring(1).split("/")
        
        let method = params.splice(0,1)[0]
        if(config.notAllowed != null && Array.isArray(config.notAllowed) 
            && config.notAllowed.indexOf(method) >= 0) {
            return res.status(403).json(config.errors['NOT_ALLOWED'])
        }

        
        if(req.body != null && Object.keys(req.body).length > 0) {
            let rb = req.body
            if(!Array.isArray(rb)) { //body is sent as a JSON object
                rb = []
                Object.keys(req.body).forEach(element => {
                    rb.push(element+"="+req.body[element])
                });
            }
            if(Array.isArray(params)) {
                params = params.concat(rb)
            } else {
                params = rb
            }
        }
        
        
        debug("calling %s with args %o",method,params)

        ln.client.call(method,params)
        .then(rx => {
            debug("sendnig call result %o",rx)
            res.json(rx)
        })
        .catch(e => {
            debug("Error calling %s:%o",method,e)
            res.status(500).json(e)
        })
    } else {
        res.status(404).json(config.errors['NOT_FOUND'])
    }
    
    
})

module.exports = router