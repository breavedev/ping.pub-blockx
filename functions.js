const CryptoJS = require("crypto-js")
const level = require('level')  
const path = require('path')
const assert = require('assert')

const dbPath = process.env.DB_PATH || path.join(__dirname, 'mydb')

const options = {
  valueEncoding: 'json'
}

const db = level(dbPath, options)

//cryptography
const { randomBytes } = require('crypto')
const secp256k1 = require('secp256k1')

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

//returns all records in _key
const getRecords = _key => {
    return new Promise((res, rej) => {
        db.get(_key, (err, value) => {
            if(err) rej(err)
            res(value)
        })
    })
}

// get last record from _key
const getLastRecord = _key => {
    return new Promise((res, rej) => {
        getRecords(_key).then(mas => res(mas[mas.length-1]))
    })
}

// put data to database
const putRecord = (_key, _value) => {// TODO: auto increment index/id
    return new Promise((res, rej) => {
        // get all data in _key
        getRecords(_key).then((all_array) => {
            // push record to array
            all_array.push(_value)
            // push all array to database
            db.put(_key, all_array, err => {
                if(err) rej(err)
                res("Successfuly put record")
            })
        })
    })
}

// get balance by address
const getBalanceByAddress = _address => {
    return new Promise((res, rej) => {
        getRecords('accounts').then(array_accounts => {
            let i = array_accounts.length - 1
            for(i; i>=0; i--){  
                if(array_accounts[i].address == _address){
                    res(array_accounts[i].balance)
                    return
                }
            }// add reject returns
            res('Has not the same address in database')
        })
    })
}


function verifySignature(msg, pubKey, sign, callback){
    return callback(true)
}

function IOValidator(pubkey){
    //validate by inputs and outputs
    return true
}

// calculate transaction hash
const calculateTxHash = (index, previousHash, timestamp, sign, to, from, amount) => CryptoJS.SHA256(index + previousHash + timestamp + sign + to + from + amount).toString()

// compose tx and put to 'accounts' and 'transactions'
const createTx = (to, from, amount, callback) => {
    const _amount = Number(amount)
    getLastRecord('transactions').then(tx => {
        const _index = Number(tx.index) + 1
        const _prevHash = tx.hash.toString()
        const _time = new Date()
        const _to = to.toString()
        const _from = from.toString()
        const _hash = calculateTxHash(_index, _prevHash, _time, _to, _from, _amount)
        // push transaction in database
        putRecord('transactions', {index: _index, prevHash: _prevHash, time: _time, to: _to, from: _from, amount: _amount, hash: _hash}).then(response => {
            console.log("transaction "+response)
            getBalanceByAddress(_from).then(balance_from => {
                getLastRecord('accounts').then(last_account => {
                // decrease sender's balance
                    let _id = last_account.id + 1
                    const newBalanceFrom = balance_from - _amount
                    putRecord('accounts', {id: _id, address: _from, balance: newBalanceFrom}).then(respomse => {
                        console.log("account from "+respomse)
                        getBalanceByAddress(_to).then(balance_to => {
                            // increase recipient balance
                            ++_id
                            const newBalanceTo = balance_to + _amount
                            putRecord('accounts', {id: _id, address: _to, balance: newBalanceTo}).then(res => {
                                console.log("account to "+res)
                                return callback("success transaction pushed in database")
                            })
                        })
                    })
                })
            })
        })
    })
}

// check address for exist in table 'accounts'
const checkAccountForExist = _address => {
    return new Promise((res, rej) => {
      // get all records
        getRecords('accounts').then(result => {
            // looping array to check record with correct address
            for(i = 0; i < result.length; i++){
                // if has the same address in table
                if(result[i].address == _address){
                    //TODO: logger
                    res("The same address had been founded")
                    return
                }
            }
            putRecord('accounts', {id: result.length, address: _address, balance: 0}).then(() => {
                //TODO: logget
                res("New addres had been created")
            })
        })
    })
}

// Genesis transaction
const genesisStart = amount => {
    return new Promise((res, rej) => {
        getRecords('accounts').then(array => {
            // if tables is exist but empty
            if(array.length == 0){
                // compose genesis tx and push in database
                composeGenesisTx(amount).then(result => {
                    //TODO: logger
                    res(result) 
                })
            }
            res("Tables are not empty")
        }, // if table doesn't exist
        err => {
            // create empty tables 'transactions' and 'accounts'
            createDbKeys().then(() => {
                // compose genesis tx and push in database
                composeGenesisTx(amount).then(result => {
                    //TODO: logger
                    res(result)
                })
            })
        })
    })
}

// put genesis transaction to database
const composeGenesisTx = amount => {
    return new Promise((res, rej) => {
        createKeyPair(result => {
            const _amount = Number(amount)
            const _index = 0, _id = 0
            const _prevHash = CryptoJS.SHA256(0).toString()
            const _time = new Date()
            const _to = result.pubKey
            const _from = 'Genesis'
            const _hash = calculateTxHash(_index, _prevHash, _time, _to, _from, _amount)
            putRecord('transactions', {index: _index, prevHash: _prevHash, timestamp: _time, to: _to, from: _from, amount: _amount, hash: _hash}).then(() => {
                putRecord('accounts', {id: _id, address: _to, balance: _amount}).then(() => {
                    getBalanceByAddress(_to).then(balance => {
                        console.log(`\n Genesis start \n public key = ${result.pubKey} \n private key = ${result.privKey}\n and balance = ${balance} coins \n`)
                    })
                    res({result})
                })
            })
        })
    })
}

// creates 'transactions' and 'accounts' tables as empty arrays 
const createDbKeys = () => {
    return new Promise((res, rej) => {
        db.put('transactions', [], err => {
            if(err) rej(err)
            db.put('accounts', [], error => {
                if(error) rej(error)
                    res('Tables created successfuly')
            })
        })
    })
}

// Check for enough coin
const checkForEnoughCoins = (_pubkey, _amount, callback) => {
    const from = _pubkey
    const amount = Number(_amount)
    getBalanceByAddress(from).then(balance => {
        if(balance >= amount) return callback(true)
        return callback(false)
    }) 
}

module.exports = {
    createKeyPair: createKeyPair,
    getRecords: getRecords,
    getLastRecord: getLastRecord,
    putRecord: putRecord,
    getBalanceByAddress: getBalanceByAddress,
    verifySignature: verifySignature,
    calculateTxHash: calculateTxHash,
    createTx: createTx,
    checkAccountForExist: checkAccountForExist,
    genesisStart: genesisStart,
    composeGenesisTx: composeGenesisTx,
    createDbKeys: createDbKeys,
    checkForEnoughCoins: checkForEnoughCoins
  }