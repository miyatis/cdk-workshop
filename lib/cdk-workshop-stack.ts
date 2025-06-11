import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { readFile, readFileSync } from "fs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';

export class CdkWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'BlogVpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
    });

    const webServer1 = new ec2.Instance(this, 'WordPressServer1', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    const script = readFileSync("./lib/resources/user-data.sh", "utf8");
    webServer1.addUserData(script);

    webServer1.connections.allowFromAnyIpv4(ec2.Port.tcp(80));

    new CfnOutput(this, "WordPressServer1PublicIPAddress", {
      value: `http://${webServer1.instancePublicIp}`,
    })

    const dbInstance = new rds.DatabaseInstance(this, 'WordPressDB', {
      vpc,
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0_36,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      databaseName: 'wordpress',
    });

    dbInstance.connections.allowDefaultPortFrom(webServer1);

    const lb = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc,
      internetFacing: true,
    });

    const listener = lb.addListener('Listener', {
      port: 80,
      open: true,
    })

    listener.addTargets('WordPressTarget', {
      port: 8080,
      targets: [new targets.InstanceTarget(webServer1, 80)],
      healthCheck: { path: '/wp-includes/images/blank.gif'},
    });

    webServer1.connections.allowFrom(lb, ec2.Port.tcp(80));
  }
}

