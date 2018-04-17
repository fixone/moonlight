const config = require('./config')
const ln = require('./lightning')
const db = require('knex')(config.knex)

const debug = require('debug')('app:api')
const nanoid = require('nanoid')

const express = require('express')
var router = express.Router()

router.post('/invoice',(req,res) => {
    if(req.body != null) {
        if(req.body.amount != null) {//amount is in satoshi
            let amount = parseInt(req.body.amount)
            if(amount > 0){
                amount = amount * 1000 //to msat
            } else {
                return res.send(500).json(config.errors['INVOICE_AMOUNT'])
            }
            let label = req.body.label || nanoid()
            let description = req.body.description || ("Lightning Payment order "+label)
            ln.client.call("invoice",[amount,label,description])
            .then(rx => {
                res.status(200).json(Object.assign({},config.errors['OK'],{id:label,description:description},rx))
                db('requests')
                .insert({result:JSON.stringify(rx),id:label,'url':req.url,payment_hash:rx.payment_hash,expires_at:rx.expires_at,bolt11:rx.bolt11,type:config.types.INVOICE})
                .then(x => debug("response %s saved %o",label,x))
                .catch(ee => debug("error on insert %o",ee))
            })
            .catch(e => {
                debug("error calling 'invoice' %o",e)
                res.status(500).json(Object.assign( {errorCode:e.error.code,errorMessage:e.error.message},e))}
            )

        } else {
            res.status(500).json(config.errors['INVOICE_AMOUNT'])
        }
    } else {
        res.status(500).json(config.errors['ERROR'])    
    }
})

router.post('/pay', (req,res) => {
    if(req.body != null) {
        if(req.body.bolt11 != null && req.body.bolt11.length > 0) {
            ln.client.call("decodepay",[req.body.bolt11])
            .then(rx => {
                let id = nanoid()
                debug("decodepay %o",rx)
                db('requests')
                    .insert({result:JSON.stringify(rx),id:id,'url':req.url,payment_hash:rx.payment_hash,expires_at:(rx.created_at+rx.expiry),bolt11:req.body.bolt11,type:config.types.PAYMENT})
                    .then(x => debug("response %s saved %o",id,x))
                    .catch(ee => debug("error on insert %o",ee))
                ln.client.call("pay",[req.body.bolt11, req.body.msatoshi,
                    req.body.description, req.body.riskfactor || 1.0, req.body.maxfeepercent || 1.0,config.defaultTimeout])
                .then( prx => {
                    let rsp = Object.assign({id:id},config.errors['OK'],rx,prx)
                    res.status(200).json(rsp)
                    

                })
                .catch(e => res.status(500).json(Object.assign({id:id,errorCode:e.error.code,errorMessage:e.error.message},rx,e)))
            })
            .catch(e => res.status(500).json(Object.assign({errorCode:e.error.code,errorMessage:e.error.message},e)))
        } else {
            res.status(500).json(config.errors['BOLT_MISSING'])
        }
    } else {
        res.status(500).json(config.errors['ERROR'])
    }
})

router.get("/invoice/:id", (req,res) => {
    debug("getting invoice %s",req.params.id)
    ln.client.call('listinvoices',[req.params.id])
    .then(rx => res.status(200).json(Object.assign({},config.errors['OK'],rx.invoices)))
    .catch(e => res.status(500).json(Object.assign({errorCode:e.error.code,errorMessage:e.error.message},e)))
})

router.get("/payment/:id", (req,res) => {
    debug("getting payment %s",req.params.id)
    ln.client.call('listpayments',[req.params.id])
    .then(rx => res.status(200).json(Object.assign({},config.errors['OK'],rx.payments)))
    .catch(e => res.status(500).json(Object.assign({errorCode:e.error.code,errorMessage:e.error.message},e)))
})

module.exports = router