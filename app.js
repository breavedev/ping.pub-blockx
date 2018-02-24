const bodyParser = require('body-parser')
const events = require('events')
const fs = require('fs')

const functions = require('./functions.js')

const p2p_port = process.env.P2P_PORT || 3001
const http_port = process.env.HTTP_PORT || 3000
//const initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : []
const AS = "I love blockchain coin"
const event = new events.EventEmitter() 

//TODO: add unit test, logger


function init_p2p_server(){
    const server = require('http').createServer()
    const io = require('socket.io')(server)
    // need to recieve transaction from web interface
    // need to recieve transaction from other peers
    // need to validate transaction by account database
    // need to validate signature of transaction

    event.on('newTX', data => {
        // Get new purpose for transaction
        const sign = String(data.sign)
        const from = String(data.from)
        const amount = Number(data.amount)
        const to = String(data.to)
        //Check if we have the same account in database
        functions.checkAccountForExist(from).then(response => {
            console.log(response)
            //If signature is valid and address has enough coins
            functions.checkForEnoughCoins(from, amount, result => {
                if(result == true){
                    // verify sender's signature
                    functions.verifySignature(AS, from, sign, res => {
                        if(res == true){
                            functions.checkAccountForExist(to).then(res => {
                                console.log(res)
                                // compare transaction and push in blockchain
                                functions.createTx(to, from, amount, result => {
                                    console.log(result)
                                })
                            })
                        }
                    })
                }
            })
        })
    })

    server.listen(p2p_port, () => console.log('Listening p2p server on port: ' + p2p_port))
}

function init_webinterface(){
    const app = require('express')()
    const server = require('http').Server(app)
    const io = require('socket.io')(server)

    let urlencodedParser = bodyParser.urlencoded({extended: false})

    //====================================genesis function=========================================
    functions.genesisStart(10000).then(() => {
            // create transaction 
        app.post('/createTX', urlencodedParser, (req, res) => {
            if(!req.body) return res.sendStatus(400)
            //sign TX
            event.emit('newTX', {sign: "signature", from: req.body.pubKey, amount: req.body.amount, to: req.body.recipAddr})
            res.send("Your transaction will be broadcast...")
        })

        app.get('/createTX', (req, res) => {
            fs.readFile(__dirname + '/views/createTX.html', 'utf8', (err, text) => res.send(text))
        })

        // create key pair
        app.get('/createAccount', (req, res) => {
            functions.createKeyPair(result => {
                res.send(result)
            })
        })

        server.listen(http_port, () => console.log('Listening http on port: ' + http_port))
    })
}

init_p2p_server()
init_webinterface()
