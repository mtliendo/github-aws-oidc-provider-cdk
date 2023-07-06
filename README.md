# CDK OpenID Connect Provider

This is a CDK (AWS Cloud Development Kit) stack that creates an OpenID Connect (OIDC) provider using the AWS CDK in TypeScript. This is not only useful to avoid manually click through the AWS console (clickops), but mainly to prevent storing long-lived credentials in things like GitHub Actions.

The created provider can be associated with a role that is used [for such deployments](https://github.com/aws-actions/configure-aws-credentials/tree/master/).

## Overview

The code creates an instance of the `OpenIdConnectProvider` class to define an OIDC provider. The provider is named 'GithubProvider' and configured with the following properties:

- **URL**: The URL of the OIDC provider is set to 'https://token.actions.githubusercontent.com'. This URL represents the GitHub Actions token service.

- **Thumbprints**: An array of [thumbprint values](https://github.blog/changelog/2023-06-27-github-actions-update-on-oidc-integration-with-aws/) is provided to identify the associated certificates. In this case, the thumbprints are '6938fd4d98bab03faadb97b34396831e3780aea1' and '1c58a3a8518e8759bf075b76b750d4f2df264fcd'. These thumbprints uniquely identify the certificates related to the OIDC provider.

- **Client IDs**: The client ID is set to ['sts.amazonaws.com']. This indicates that the OIDC provider is specifically configured for use by the AWS Security Token Service (STS).

## Prerequisites

- AWS CDK should be installed. If not, please refer to the AWS CDK documentation for installation instructions.

## Usage

1. Install the necessary dependencies by running `npm install` or `yarn install`.

2. Update the `bin/github-oidc-cdk.ts` file to your preferred `account` and `region`.

3. Deploy the CDK stack locally using the appropriate commands for your environment (e.g., `npx aws-cdk deploy`).

In addition to creating the OpenID Connect provider, the stack includes an additional line that creates a CloudFormation output using the `cdk.CfnOutput` class.

The ARN can be retrieved after deploying the CDK stack and provides a unique identifier for the OIDC provider resource.

## Purpose

On its own, this stack simply creates the provider. This is because the associated role should be scope to a specific repo.

So after deploying, the provider ARN will be displayed in the console. This should be something like:

```ts
arn:aws:iam::1234567890:oidc-provider/token.actions.githubusercontent.com
```

Now, in projects where you want to make use of this provider (say to have a GitHub action deploy your app), you can create a deployment stack that references the ARN of this provider:

```ts
const provider = OpenIdConnectProvider.fromOpenIdConnectProviderArn(
	this,
	'GithubProvider',
	`arn:aws:iam::1234567890:oidc-provider/token.actions.githubusercontent.com`
)
```

> 🗒️ Another reason why this Provider is in its own repo is because an AWS account can't have providers with the same URL, they're meant to be referenced once created.

From there, you can create a Principal for the provider so that it can be associated with a role that the GitHub action can assume:

```ts
const GitHubPrincipal = new OpenIdConnectPrincipal(provider).withConditions({
	StringLike: {
		'token.actions.githubusercontent.com:sub': `repo:${ghUsername}/${repoName}:*`,
	},
})

new Role(this, 'GitHubActionsRole', {
	assumedBy: GitHubPrincipal,
	description:
		'Role assumed by GitHubPrincipal for deploying from CI using aws cdk',
	// this name is what gets referenced in the github action (see below example)
	roleName: `my-cool-github-ci-role`,
	maxSessionDuration: cdk.Duration.hours(1),
	inlinePolicies: {
		CdkDeploymentPolicy: new PolicyDocument({
			assignSids: true,
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['sts:AssumeRole'],
					resources: [`arn:aws:iam::1234567890:role/cdk-*`],
				}),
			],
		}),
	},
})
```

With all that in place, you can successfully deploy your GitHub actions without specifying long-lived secret credentials:

```yml
jobs:
  deploy_aws_cdk:
    runs-on: ubuntu-latest
    # There permissions are needed
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Checkout repo
        uses: actions/checkout@v3

      - uses: actions/setup-node@v2
        with:
          node-version: '16'
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Assume role using OIDC
        uses: aws-actions/configure-aws-credentials@master
        with:
          role-to-assume: arn:aws:iam::1234567890:role/my-cool-github-ci-role
          aws-region: us-east-1

      - name: cdk diff
        run: npx aws-cdk diff

      - name: cdk deploy
        run: npx aws-cdk deploy --all
```

## Additional Resources

- AWS CDK documentation: [https://docs.aws.amazon.com/cdk/](https://docs.aws.amazon.com/cdk/)
- OpenID Connect (OIDC) specification: [https://openid.net/connect/](https://openid.net/connect/)
- GitHub Action (configure-aws-credentials): [https://github.com/aws-actions/configure-aws-credentials/tree/master/](https://github.com/aws-actions/configure-aws-credentials/tree/master/)
- OpenId with AWS: [https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services#configuring-the-role-and-trust-policy](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services#configuring-the-role-and-trust-policy)

Feel free to customize and extend this stack based on your specific use case and requirements.
