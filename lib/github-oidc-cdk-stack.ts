import * as cdk from 'aws-cdk-lib'
import { OpenIdConnectProvider } from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

export class GithubOidcCdkStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props)

		// enable GitHub to securely connect to your AWS account
		// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services#adding-the-identity-provider-to-aws
		const provider = new OpenIdConnectProvider(this, 'GithubProvider', {
			url: 'https://token.actions.githubusercontent.com',
			thumbprints: [
				'6938fd4d98bab03faadb97b34396831e3780aea1',
				'1c58a3a8518e8759bf075b76b750d4f2df264fcd',
			],
			clientIds: ['sts.amazonaws.com'],
		})

		new cdk.CfnOutput(this, 'GithubOidcProviderArn', {
			value: provider.openIdConnectProviderArn,
		})
	}
}
