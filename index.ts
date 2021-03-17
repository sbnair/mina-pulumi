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
            "image": "minaprotocol/mina-daemon-baked:1.1.3-48401e9",
            "privkeyPass": private_key_password,
            "logLevel": "info",
            "persistentStorage": true,
            "runtimeConfig": '{ "daemon": { "log-block-creation": false }}',
            "seedPeersURL": "https://storage.googleapis.com/mina-seed-lists/mainnet_seeds.txt",
            "seedPeers": [],
        },
        "nodeSelector": {"preemptible": false},
        "blockProducerConfigs": [
            { "name": "my-block-producer",
              "privateKeySecret": minaKey.metadata.name,
              "externalPort": 1 }
        ]
    }
}, { providers: { "kubernetes": cluster.provider } });

const sidecar = new k8s.helm.v2.Chart("sidecar", {
    //chart: "block-producer",
    //fetchOpts: {
      //repo: "https://coda-charts.storage.googleapis.com" },
    path: "./sidecar-chart",
}, { providers: { "kubernetes": cluster.provider } });


// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
export const clusterName = cluster.eksCluster.name;
