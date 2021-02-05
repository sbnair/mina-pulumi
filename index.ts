import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as kx from "@pulumi/kubernetesx";
import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";


import * as fs from 'fs';
import * as YAML from 'yaml'


const vpc = new awsx.ec2.Vpc("mina-vpc", {});

// Create an EKS cluster.
const cluster = new eks.Cluster("mina-private-chain", {
    vpcId: vpc.id,
    subnetIds: vpc.publicSubnetIds,
    instanceType: "c5.2xlarge",
    desiredCapacity: 1,

})

const public_key = fs.readFileSync('key.pub', 'utf8');
const private_key = fs.readFileSync('key', 'utf8');
const private_key_password = fs.readFileSync('password', 'utf8').replace(/\n/g, '');

const minaKey = new kx.Secret("mina-secret", {
    stringData: {
      "key": private_key,
      "pub": public_key
    }
}, { provider: cluster.provider });

const block_producer_helm_values_file = fs.readFileSync('block_producer_values.yaml', 'utf8')
const block_producer_helm_values = YAML.parse(block_producer_helm_values_file)
const blockProducer = new k8s.helm.v2.Chart("block-producer", {
    //chart: "block-producer",
    //fetchOpts: {
      //repo: "https://coda-charts.storage.googleapis.com" },
    path: "../mina/helm/block-producer",
    values: {
        "testnetName": "testworld",
        "coda": {
            "image": "minaprotocol/mina-daemon-baked:0.3.0-5493fe3-encore-6fe6a3e",
            "privkeyPass": private_key_password,
            "logLevel": "info",
            "persistentStorage": true,
            "runtimeConfig": '{ "daemon": { "log-block-creation": false, "super-catchup": true }}',
            "seedPeers": [ "/dns4/seed-one.testworld.o1test.net/tcp/10001/p2p/12D3KooWJ9mNdbUXUpUNeMnejRumKzmQF15YeWwAPAhTAWB6dhiv",
                "/ip4/35.245.75.74/tcp/10001/p2p/12D3KooWAFFq2yEQFFzhU5dt64AWqawRuomG9hL8rSmm5vxhAsgr",
                "/ip4/34.86.189.237/tcp/10517/p2p/12D3KooWPc8xqjGRpbAkL5TyQCXjuBjF6TDNFSw5n42t1fjPgdAw",
                "/ip4/34.86.233.91/tcp/10508/p2p/12D3KooWFuJM1d6K18WJ929Vc7mWsN4swfzskC5xFZnpnNDFGMDh",
                "/ip4/34.86.27.124/tcp/10514/p2p/12D3KooWRdk6F1p77bW8ahEZCQYJ2Yo8kmKLBsxNJXxCR42XjTqu",
                "/ip4/34.86.29.4/tcp/10506/p2p/12D3KooWFjJiKbAdVJooiLRCeQyumbKmDU4kXjYrkNfZ8jD7CmDS",
                "/ip4/34.86.68.2/tcp/10504/p2p/12D3KooWEzXZK4ohXF3PM53hvzGhs2nqSxYXRsca9AutisunJaZY",
                "/ip4/34.86.87.116/tcp/10510/p2p/12D3KooWLSwJ8Gc4iLyW48FoQPwM6ZDLt948THTjv1PDms1rsGE5" ],
        },
        "nodeSelector": {"preemptible": false},
        "blockProducerConfigs": [
            { "name": "my-block-producer",
              "privateKeySecret": minaKey.metadata.name,
              "externalPort": 1 }
        ]
    }
}, { providers: { "kubernetes": cluster.provider } });


// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
export const clusterName = cluster.eksCluster.name;
