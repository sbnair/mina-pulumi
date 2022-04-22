## instant-mina-node

Automation code for provisioning a Mina block producer or snarker node.

## Dependencies to run this app (Recommedned to run in Ubuntu 20.04)
1. Pulumi (Latest version or 3.28.0)
2. NodeJs (16+)
3. NPM (8.5 +)
4. kubectl
5. AWS CLI
6. typescript dependencies

## How to use

a. Create 3 files:

1. key.pub - Add your mina wallet public key
2. key - Add your mina wallet private key
3. password - Add your mina wallet password

b. Configure AWS cli with region, access key, secret key

c. Configure pulumi using these commands :
   
   1. pulumi config set aws:region ca-central-1
   2. pulumi up

It should work :)

