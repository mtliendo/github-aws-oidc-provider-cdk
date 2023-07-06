#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { GithubOidcCdkStack } from '../lib/github-oidc-cdk-stack'

const app = new cdk.App()

new GithubOidcCdkStack(app, 'GithubOidcCdkStack', {
	env: {
		account: '842537737558',
		region: 'us-east-1',
	},
})
