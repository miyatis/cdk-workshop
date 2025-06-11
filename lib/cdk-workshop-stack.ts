import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from "aws-cdk-lib/aws-rds";
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';

import { WebServerInstance } from './constructs/web-server-instance';

export class CdkWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'BlogVpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
    });

    const webServer1 = new WebServerInstance(this, 'WordPressServer1', {
      vpc,
    });

    const webServer2 = new WebServerInstance(this, 'WordPressServer2', {
      vpc,
    });

    const dbInstance = new rds.DatabaseInstance(this, 'WordPressDB', {
      vpc,
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0_36,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      databaseName: 'wordpress',
      multiAz: true,
    });

    dbInstance.connections.allowDefaultPortFrom(webServer1.instance);
    dbInstance.connections.allowDefaultPortFrom(webServer2.instance);

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
      targets: [new targets.InstanceTarget(webServer1.instance, 80),
        new targets.InstanceTarget(webServer2.instance, 80)],
      healthCheck: { path: '/wp-includes/images/blank.gif'},
    });

    webServer1.instance.connections.allowFrom(lb, ec2.Port.tcp(80));
    webServer2.instance.connections.allowFrom(lb, ec2.Port.tcp(80));
  }
}

