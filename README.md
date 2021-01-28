# Mina Pulumi

A pulumi script to deploy a Mina validator on Amazon EKS. In prototype stage for now.

## How to use

Create 3 files:

* `key.pub` containing your Testworld public key
* `key` containing your encrypted Testworld private key
* `password` containing your Testworld key password

Download the prerequisites: Pulumi, AWS CLI, and kubectl.

Install the typescript dependencies:

```
yarn install
```

Login to AWS with the CLI, then do:

```
pulumi up
```

It will create a Mina block producer and run it with your key.
