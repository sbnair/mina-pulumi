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
    instanceType: "c5.large",
    desiredCapacity: 2,

})

const public_key = fs.readFileSync('key.pub', 'utf8');
const private_key = fs.readFileSync('key', 'utf8');
const private_key_password = fs.readFileSync('password', 'utf8');

const minaKey = new kx.Secret("mina-secret", {
    stringData: {
      "key": private_key,
      "pub": public_key
    }
}, { provider: cluster.provider });

const block_producer_helm_values_file = fs.readFileSync('block_producer_values.yaml', 'utf8')
const block_producer_helm_values = YAML.parse(block_producer_helm_values_file)
const blockProducer = new k8s.helm.v2.Chart("block-producer", {
//    chart: "block-producer",
    //fetchOpts: {
      //repo: "https://coda-charts.storage.googleapis.com" },
    path: "../mina/helm/block-producer",
    values: {
        "testnetName": "testworld",
        "coda": {
            "image": "minaprotocol/mina-daemon-baked:0.2.11-d075f83-testworld-d075f83",
            "privkeyPass": private_key_password,
            "logLevel": "info",
            "runtimeConfig": '{ "daemon": { "log-block-creation": false, "super-catchup": true }}',
            "seedPeers": [ "/dns4/seed-one.testworld.o1test.net/tcp/10001/p2p/12D3KooWJ9mNdbUXUpUNeMnejRumKzmQF15YeWwAPAhTAWB6dhiv",
                "/dns4/seed-two.testworld.o1test.net/tcp/10001/p2p/12D3KooWFcGGeUmbmCNq51NBdGvCWjiyefdNZbDXADMK5CDwNRm5",
                "/ip4/104.198.77.98/tcp/10516/p2p/12D3KooWKatyUTf78AWcxoK3Gt1JdrmyXjHvZVnxH2uBziKFdPEt",
                "/ip4/35.222.191.7/tcp/10517/p2p/12D3KooWMNkjkUWGuJoopGX2J91wNuhb4FGJ99BdA6ZivM7bVDex"]
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
