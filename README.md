# simpleBlockchainPrototype

1. Install nodeJS version 9+ and npm version 2+

2. Run in console "git clone https://github.com/edrygka/simpleBlockchainPrototype"

3. Then run in following dir "npm install"

4. And run "npm start"

In your directory would created "mydb" directory with(leveldb database) and genesis functions that genereted key pair and gives you coin. There are 2 keys in db: 'accounts' which has an array of all accounts info and 'transactions' which has an array of all transactions that was created.

*To generate new key pair run in terminal: curl http://localhost:3000/createAccount *

*To create new transaction: http://localhost:3001/createTX and input your publick and private keys*



