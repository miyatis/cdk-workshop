import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

// ec2に関するパッケージをインポート
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class CdkWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // vpcを宣言
    const vpc = new ec2.Vpc(this, 'BlogVpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
    });
  }
}

