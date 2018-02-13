const bodyParser = require('body-parser')
const fs = require('fs')
const events = require('events')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const CryptoJS = require("crypto-js")

const forTX = new FileSync('transactions.json')
const TX = low(forTX)

const forAcc = new FileSync('accounts.json')
const Acc = low(forAcc)

const p2p_port = process.env.P2P_PORT || 3001
const http_port = process.env.HTTP_PORT || 3000
//const initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : []
const AxelString = "I love AXEL coin"
const event = new events.EventEmitter() 

//cryptography
const { randomBytes } = require('crypto')
const secp256k1 = require('secp256k1')

//init public database
TX.defaults({ transactions: []})
    .write()

Acc.defaults({ accounts: []})
    .write()

//get latest TX record
function getLastTX(){
    let count = TX.get('transactions')
      .size()
      .value()
    return TX.get(`transactions[${count-1}]`).value()
}

// Get last account record
function getLastAc(){
    let count = Acc.get('accounts')
        .size()
        .value()
    return Acc.get(`accounts[${count-1}]`).value()
}

// get balance by account
async function getBalanceByAccount(_address){
    let result
    let i = Acc.get('accounts').size().value()-1
    for(i; i>=0; i--){
      result = Acc.get('accounts')
        .find({id: i, address: _address})
        .value()
      if(result) return result.balance
    }
    return null
}

function init_p2p_server(){
    const server = require('http').createServer()
    const io = require('socket.io')(server)
    // need to recieve transaction from web interface
    // need to recieve transaction from other peers
    // need to validate transaction by account database
    // need to validate signature of transaction

    event.on('newTX', data => {
        if(verifySignature(AxelString, data.pubKey, data.sign) == true){
            createTx(data.recipient, data.publicKey, data.amount)
            
        }
    })

    server.listen(p2p_port, () => console.log('Listening p2p server on port: ' + p2p_port))
}

function init_webinterface(){
    const app = require('express')()
    const server = require('http').Server(app)
    const io = require('socket.io')(server)

    let urlencodedParser = bodyParser.urlencoded({extended: false})

        // create transaction 
    app.post('/createTX', urlencodedParser, (req, res) => {
        if(!req.body) return res.sendStatus(400)
        //sign TX
        event.emit('newTX', {sign: "signature", publicKey: req.body.pubKey, amount: req.body.amount, recipient: req.body.recipAddr})
        res.send("Your transaction will be broadcast...")
    })

    app.get('/createTX', (req, res) => {
        fs.readFile(__dirname + '/views/createTX.html', 'utf8', (err, text) => res.send(text))
    })

    // create key pair
    app.get('/createAccount', (req, res) => {
        createKeyPair(result => {
            res.send(result)
        })
    })

    server.listen(http_port, () => console.log('Listening http on port: ' + http_port))
    //====================================genesis function=========================================
    genesisStart(10000)
}

// create Key pair
function createKeyPair(callback){
    let privKey, keyPair
    do {
        privKey = randomBytes(32)
    } while (!secp256k1.privateKeyVerify(privKey))
    let pubKey = secp256k1.publicKeyCreate(privKey)
    keyPair = {privKey: privKey.toString('hex'),pubKey: pubKey.toString('hex')}//TODO: right format for address
    return callback(keyPair)
}

// start genesis
function genesisStart(_amount){
    createKeyPair(result => {
        //TODO: FIX THIS КОСТЫЛЬ
        let index = 0, id = 0
        let prevHash = CryptoJS.SHA256(0).toString()
        //let sign = "signature"
        let time = new Date()
        let pubKey = result.pubKey
        let from = "genesis"
        let hash = calculateTxHash(index, prevHash, time, pubKey, from, _amount)
        console.log(`\n Genesis start \n public key = ${result.pubKey} \n private key = ${result.privKey}\n`)
        TX.get('transactions')
            .push({index: index, prevHash: prevHash, time: time, to: pubKey, from: from, amount: _amount, hash: hash})
            .write()
        Acc.get('accounts')
            .push({id: id, address: pubKey, balance: _amount})
            .write()
    })
}

// create new account record if not exist
async function checkAccountForExist(_address){
    let result = Acc.get('accounts')
        .find({address: _address})
        .value()
    if(!result)
    {
        let _id = getLastAc().id + 1
        Acc.get('accounts').push({id: _id, address: _address, balance: 0}).write()
    }
}

// create transaction
function createTx(_to, _from, _amount){
    //TODO: add signature param
    let _index = getLastTX().index + 1
    let _prevHash = getLastTX().hash
    let _time = new Date()
    let amount = Number(_amount)
    let _hash = calculateTxHash(_index, _prevHash, _time, _to, _from, _amount)
    checkAccountForExist(_from)
    getBalanceByAccount(_from).then((balance_from) => {
        //if account exist and have enough money
        if(balance_from >= amount){
            checkAccountForExist(_to)
            TX.get('transactions')
                .push({index: _index, prevHash: _prevHash, time: _time, to: _to, from: _from, amount: amount, hash: _hash})
                .write()
            let _id = getLastAc().id + 1
            Acc.get('accounts')
                .push({id: _id, address: _from, balance: balance_from - amount})
                .write()
            getBalanceByAccount(_to).then(balance_to => {
                _id = getLastAc().id + 1
                Acc.get('accounts')
                    .push({id: _id, address: _to, balance: balance_to + amount})
                    .write()
            })
        }
        // if account not exist and would be created
    })  
}

function verifySignature(msg, pubKey, sign){
    return true
}

function IOValidator(pubkey){
    //validate by inputs and outputs
    return true
}

// calculate transaction hash
function calculateTxHash(index, previousHash, timestamp, sign, to, from, amount){
    return CryptoJS.SHA256(index + previousHash + timestamp + sign + to + from + amount).toString()
}

init_p2p_server()
init_webinterface()