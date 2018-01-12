# simpleBlockchainPrototype

1. Install nodeJS and npm version 4+

2. Then run in following dir "npm install"

3. HTTP_PORT=3001 P2P_PORT=6001 npm start

4. HTTP_PORT=3002 P2P_PORT=6002 PEERS=ws://localhost:6001 npm start

5. curl -H "Content-type:application/json" --data '{"data" : "Some data to the first block"}' http://localhost:3001/mineBlock


*To see all blockchain run in terminal: curl http://localhost:3001/blocks*

*To create new block run in terminal: curl -H "Content-type:application/json" --data '{"data" : "Some data to the first block"}' http://localhost:3001/mineBlock*

*Add peer: curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6001"}' http://localhost:3001/addPeer*

*All connected peers: curl http://localhost:3001/peers* 

