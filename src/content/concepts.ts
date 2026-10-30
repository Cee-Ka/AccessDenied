/**
 * Concept glossary: the single source of truth for how the game explains
 * AWS services and IAM ideas. Used by info popovers, concept tags, the
 * Round 0 guide and the "Ask your agent" prompt.
 *
 * Writing rules: short sentences, plain words, at most ~80 words per body.
 */

import { EvaluationStage, NodeType } from '../types/engine';

export interface Concept {
  id: string;
  title: string;
  /** One sentence. Also used as the part's role in tutor prompts. */
  summary: string;
  body: string;
  example?: string;
  docsUrl?: string;
}

const DOCS = 'https://docs.aws.amazon.com';

const ENTRIES: Concept[] = [
  // ── Core ideas ────────────────────────────────────────────────
  {
    id: 'principal',
    title: 'Principal',
    summary: 'Who is making the request: a user, a role, or a service acting for you.',
    body: 'Every request in AWS comes from a principal. It can be a person (IAM user), a role that an app or service takes on, or an outside account. AWS first asks "who is calling?" and then checks what that caller may do.',
    docsUrl: `${DOCS}/IAM/latest/UserGuide/intro-structure.html`,
  },
  {
    id: 'resource',
    title: 'Resource',
    summary: 'The thing being called: a bucket, a table, a key, or a role.',
    body: 'A resource is what the request wants to touch. Each one has an ARN, a unique name like arn:aws:s3:::my-bucket. Policies list ARNs to say which resources an action may use.',
    docsUrl: `${DOCS}/IAM/latest/UserGuide/reference-arns.html`,
  },
  {
    id: 'connection',
    title: 'Connection',
    summary: 'An arrow from the caller to the thing it calls.',
    body: 'Draw an arrow from the part that sends the request to the part that answers it. Direction matters. An arrow from the bucket to the app does not let the app call the bucket. Select an arrow and choose "Reverse direction" to flip it.',
  },
  {
    id: 'network',
    title: 'Network Path',
    summary: 'Whether a request can physically reach its target at all.',
    body: 'Before any permission check, the request needs a route. Parts must be connected. Private subnets cannot be reached from the internet. Private compute needs a NAT gateway or a VPC endpoint to reach AWS services. No route means a timeout, not a 403.',
    docsUrl: `${DOCS}/vpc/latest/userguide/how-it-works.html`,
  },
  {
    id: 'identity_policy',
    title: 'Identity Policy',
    summary: 'A policy attached to a user or role that lists what it may do.',
    body: 'An identity policy travels with the caller. It says "this role may do these actions on these resources." In the same account, an Allow here is usually enough. Keep it narrow: name exact actions and exact ARNs instead of "*".',
    example: '{ "Effect": "Allow", "Action": "s3:GetObject", "Resource": "arn:aws:s3:::invoices/*" }',
    docsUrl: `${DOCS}/IAM/latest/UserGuide/access_policies_identity-vs-resource.html`,
  },
  {
    id: 'resource_policy',
    title: 'Resource Policy',
    summary: 'A policy attached to the resource that lists who may use it.',
    body: 'A resource policy lives on the bucket, key or table. It has a Principal field that names who may call it. "Principal": "*" means anyone on the internet. For cross-account access, both this policy and the caller\'s identity policy must allow the request.',
    example: '{ "Effect": "Allow", "Principal": { "AWS": "arn:aws:iam::111122223333:role/WebRole" }, "Action": "s3:GetObject", "Resource": "arn:aws:s3:::invoices/*" }',
    docsUrl: `${DOCS}/IAM/latest/UserGuide/access_policies_identity-vs-resource.html`,
  },
  {
    id: 'trust_policy',
    title: 'Trust Policy',
    summary: 'The part of a role that says who may assume it.',
    body: 'A role is useless until someone assumes it. The trust policy decides who can. It names a principal and the sts:AssumeRole action. Add conditions, such as sts:ExternalId, so only the right caller gets in.',
    docsUrl: `${DOCS}/IAM/latest/UserGuide/id_roles_terms-and-concepts.html`,
  },
  {
    id: 'permission_boundary',
    title: 'Permission Boundary',
    summary: 'A ceiling on what a user or role can ever be allowed to do.',
    body: 'A boundary does not grant anything. It caps. A request must be allowed by the identity policy AND fit inside the boundary. Use it when you let someone create roles: even if they write a broad policy, the boundary stops it from going further.',
    docsUrl: `${DOCS}/IAM/latest/UserGuide/access_policies_boundaries.html`,
  },
  {
    id: 'scp',
    title: 'Service Control Policy (SCP)',
    summary: 'An organization-wide guardrail that limits every account below it.',
    body: 'SCPs are set by AWS Organizations. They apply to every principal in the account, even admins. Like a boundary, they never grant access. A Deny in an SCP wins over any Allow. Use them for rules like "no regions outside the EU".',
    docsUrl: `${DOCS}/organizations/latest/userguide/orgs_manage_policies_scps.html`,
  },
  {
    id: 'explicit_deny',
    title: 'Explicit Deny',
    summary: 'A Deny statement that matches, which beats every Allow.',
    body: 'AWS checks every attached policy for a matching Deny first. If one matches, the request stops there. No Allow anywhere can undo it. That makes Deny a safe way to block something for sure.',
    example: '{ "Effect": "Deny", "Action": "s3:DeleteObject", "Resource": "*" }',
    docsUrl: `${DOCS}/IAM/latest/UserGuide/reference_policies_evaluation-logic.html`,
  },
  {
    id: 'implicit_deny',
    title: 'Implicit Deny',
    summary: 'The default answer when nothing says Allow.',
    body: 'AWS starts from "no". If no policy allows the request, it is denied, even with no Deny statement. Most 403 errors in real life are implicit denies: an action or ARN is simply missing from the Allow.',
    docsUrl: `${DOCS}/IAM/latest/UserGuide/reference_policies_evaluation-logic.html`,
  },
  {
    id: 'condition_keys',
    title: 'Conditions',
    summary: 'Extra checks on a statement, like "only from this IP" or "only this tenant".',
    body: 'A Condition block makes a statement apply only when the request matches. For example StringEquals on sts:ExternalId, or Bool on aws:MultiFactorAuthPresent. If the condition fails, the statement is skipped, as if it was not there.',
    example: '"Condition": { "StringEquals": { "sts:ExternalId": "ac-9841-sec" } }',
    docsUrl: `${DOCS}/IAM/latest/UserGuide/reference_policies_elements_condition.html`,
  },
  {
    id: 'least_privilege',
    title: 'Least Privilege',
    summary: 'Give each part only the actions and resources it really needs.',
    body: 'Wildcards like "s3:*" or "Resource": "*" make things work fast. They also hand an attacker everything once a key leaks. Name the exact actions and ARNs. If something breaks, add only what is missing.',
    docsUrl: `${DOCS}/IAM/latest/UserGuide/best-practices.html`,
  },
  {
    id: 'block_public_access',
    title: 'S3 Block Public Access',
    summary: 'An S3 switch that overrides any policy that would make data public.',
    body: 'Even if a bucket policy says "Principal": "*", Block Public Access stops anonymous requests. Turn it on for every bucket that is not a public website. Then grant access to named roles instead.',
    docsUrl: `${DOCS}/AmazonS3/latest/userguide/access-control-block-public-access.html`,
  },
  {
    id: 'imdsv2',
    title: 'IMDSv2',
    summary: 'The safer instance metadata service that needs a session token.',
    body: 'Every EC2 instance can read its own role credentials from 169.254.169.254. With IMDSv1, a simple GET is enough, so an SSRF bug can steal them. IMDSv2 needs a PUT for a token first, and a hop limit of 1 keeps it inside the instance.',
    docsUrl: `${DOCS}/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html`,
  },
  {
    id: 'ssrf',
    title: 'SSRF',
    summary: 'Tricking a server into making a request on the attacker\'s behalf.',
    body: 'Server-side request forgery happens when an app fetches a URL the user supplies. The attacker points it at internal addresses, like the metadata service, and reads the answer. The fix is layered: IMDSv2, and a role that can do very little.',
  },
  {
    id: 'external_id',
    title: 'sts:ExternalId',
    summary: 'A shared secret a vendor must send when assuming your role.',
    body: 'A vendor uses one AWS account for all its customers. Without an ExternalId, another customer could give the vendor your role ARN and read your data. Require a unique ExternalId in the trust policy so only requests made for you work.',
    docsUrl: `${DOCS}/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html`,
  },
  {
    id: 'confused_deputy',
    title: 'Confused Deputy',
    summary: 'A trusted middleman is tricked into using its access for someone else.',
    body: 'The vendor is trusted by many customers. An attacker asks the vendor to act on a role that is not theirs. The vendor has the right to assume it, so it does. ExternalId and source conditions stop this.',
    docsUrl: `${DOCS}/IAM/latest/UserGuide/confused-deputy.html`,
  },
  {
    id: 'pass_role',
    title: 'iam:PassRole',
    summary: 'Permission to hand a role to a service, like a new Lambda.',
    body: 'Whoever can pass a role can run code with that role\'s power. If a developer may pass any role, they can launch a Lambda with the admin role and become admin. Limit PassRole to the exact role ARNs they need.',
    docsUrl: `${DOCS}/IAM/latest/UserGuide/id_roles_use_passrole.html`,
  },
  {
    id: 'leading_keys',
    title: 'dynamodb:LeadingKeys',
    summary: 'A condition that limits which partition keys a caller may read.',
    body: 'In a shared table, each tenant\'s rows start with their own key. A condition on dynamodb:LeadingKeys lets a role touch only rows whose key matches. Then a tenant asking for another tenant\'s key is denied by IAM itself.',
    docsUrl: `${DOCS}/amazondynamodb/latest/developerguide/specifying-conditions.html`,
  },
  {
    id: 'kms_key_policy',
    title: 'KMS Key Policy',
    summary: 'The resource policy on an encryption key; it must exist for anyone to use the key.',
    body: 'KMS is strict. If the key policy does not trust the account root, IAM policies alone cannot grant access to the key. Data encrypted with it, like a secret, then fails with 403 even when the caller can read the secret.',
    docsUrl: `${DOCS}/kms/latest/developerguide/key-policies.html`,
  },
  {
    id: 'budget',
    title: 'Monthly Budget',
    summary: 'Your design must cost this much per month or less for three stars.',
    body: 'Every part has a monthly price. Secure and working is two stars. Doing it within budget is the third. The first design that holds is rarely the cheapest one.',
  },

  // ── Services (one per node type) ──────────────────────────────
  {
    id: 'iam_user',
    title: 'IAM User',
    summary: 'A long-lived identity for one person or tool, with its own keys.',
    body: 'Users have passwords or access keys that do not expire on their own. That makes them easy to leak. Prefer roles for apps and services, and require MFA for people.',
    docsUrl: `${DOCS}/IAM/latest/UserGuide/id_users.html`,
  },
  {
    id: 'iam_role',
    title: 'IAM Role',
    summary: 'An identity that apps and services assume to get short-lived credentials.',
    body: 'A role has two sides. The trust policy says who may assume it. The identity policy says what it may do once assumed. EC2 instances and Lambda functions run as roles.',
    docsUrl: `${DOCS}/IAM/latest/UserGuide/id_roles.html`,
  },
  {
    id: 'ec2',
    title: 'Amazon EC2',
    summary: 'A virtual server that runs your app with an attached role.',
    body: 'An EC2 instance gets credentials for its role from the metadata service. Anyone who can make the instance send requests may be able to read them, so turn on IMDSv2 and keep the role small.',
    docsUrl: `${DOCS}/AWSEC2/latest/UserGuide/concepts.html`,
  },
  {
    id: 'lambda',
    title: 'AWS Lambda',
    summary: 'A function that runs on demand with an execution role.',
    body: 'Lambda runs your code without servers. Each function has an execution role. If it runs inside a private subnet, it needs a NAT gateway or VPC endpoint to reach other AWS services.',
    docsUrl: `${DOCS}/lambda/latest/dg/welcome.html`,
  },
  {
    id: 'cognito',
    title: 'Amazon Cognito',
    summary: 'Signs users in and hands them temporary, per-user AWS credentials.',
    body: 'An identity pool maps each signed-in user to a role. Policy variables like ${cognito-identity.amazonaws.com:sub} let one role give every user access to only their own data.',
    docsUrl: `${DOCS}/cognito/latest/developerguide/identity-pools.html`,
  },
  {
    id: 'external_vendor',
    title: 'External Caller',
    summary: 'Someone outside your account: a vendor, a customer, or an attacker.',
    body: 'Outside callers come from the internet or another AWS account. They can never reach private subnets directly. Your resource and trust policies decide whether they get anything at all.',
  },
  {
    id: 's3',
    title: 'Amazon S3',
    summary: 'Object storage for files, with a bucket policy that controls access.',
    body: 'S3 stores files in buckets. Access comes from the caller\'s identity policy, the bucket policy, or both. Block Public Access is the safety net that stops a bucket from going public by mistake.',
    docsUrl: `${DOCS}/AmazonS3/latest/userguide/Welcome.html`,
  },
  {
    id: 'dynamodb',
    title: 'Amazon DynamoDB',
    summary: 'A fast key-value database where IAM can limit access row by row.',
    body: 'DynamoDB tables are read by partition key. IAM conditions like dynamodb:LeadingKeys can restrict which keys a caller may read, which keeps tenants apart in a shared table.',
    docsUrl: `${DOCS}/amazondynamodb/latest/developerguide/Introduction.html`,
  },
  {
    id: 'rds',
    title: 'Amazon RDS',
    summary: 'A managed relational database.',
    body: 'RDS runs databases like PostgreSQL and MySQL. Keep it out of public subnets. With IAM database authentication, callers need rds-db:connect on the database user ARN.',
    docsUrl: `${DOCS}/AmazonRDS/latest/UserGuide/Welcome.html`,
  },
  {
    id: 'kms',
    title: 'AWS KMS',
    summary: 'Manages encryption keys; every use of a key is an IAM-checked call.',
    body: 'Encrypted data is only as open as its key. Reading an encrypted secret needs kms:Decrypt on the key too. The key policy must trust the account before IAM policies can grant that.',
    docsUrl: `${DOCS}/kms/latest/developerguide/overview.html`,
  },
  {
    id: 'secrets_manager',
    title: 'AWS Secrets Manager',
    summary: 'Stores passwords and API keys, encrypted with a KMS key.',
    body: 'Secrets Manager hands secrets to code at runtime. Callers need secretsmanager:GetSecretValue on the secret and kms:Decrypt on the key that encrypts it.',
    docsUrl: `${DOCS}/secretsmanager/latest/userguide/intro.html`,
  },
  {
    id: 'aws_account',
    title: 'AWS Account',
    summary: 'A hard boundary for resources, billing and permissions.',
    body: 'Requests inside one account need one Allow. Requests across accounts need an Allow on both sides. Organizations group accounts and apply SCPs to them.',
    docsUrl: `${DOCS}/accounts/latest/reference/accounts-welcome.html`,
  },
  {
    id: 'vpc',
    title: 'Amazon VPC',
    summary: 'Your private network in AWS, split into subnets.',
    body: 'A VPC holds your servers and functions. Public subnets can reach the internet directly. Private subnets cannot be reached from the internet and need a NAT gateway or endpoint to call out.',
    docsUrl: `${DOCS}/vpc/latest/userguide/what-is-amazon-vpc.html`,
  },
  {
    id: 'subnet',
    title: 'Subnet',
    summary: 'A slice of a VPC that is either public or private.',
    body: 'Put anything users should not reach directly in a private subnet. That removes a whole class of attacks before IAM is even checked.',
    docsUrl: `${DOCS}/vpc/latest/userguide/configure-subnets.html`,
  },
  {
    id: 'nat_gw',
    title: 'NAT Gateway',
    summary: 'Lets private compute call the internet and AWS APIs, for a fee per GB.',
    body: 'A NAT gateway works, but it costs a base fee plus a charge on every gigabyte. For S3 and DynamoDB, a free gateway endpoint does the same job privately.',
    docsUrl: `${DOCS}/vpc/latest/userguide/vpc-nat-gateway.html`,
  },
  {
    id: 'vpc_endpoint',
    title: 'VPC Endpoint',
    summary: 'A private route from your VPC to an AWS service, with its own policy.',
    body: 'Gateway endpoints for S3 and DynamoDB are free. Traffic never crosses the internet. An endpoint policy can also limit which buckets or tables are reachable through it.',
    docsUrl: `${DOCS}/vpc/latest/privatelink/concepts.html`,
  },
];

export const CONCEPTS: Record<string, Concept> = Object.fromEntries(ENTRIES.map(c => [c.id, c]));

/** Glossary entry for each evaluation trace stage. */
export const STAGE_CONCEPT: Record<EvaluationStage, string> = {
  NETWORK: 'network',
  EXPLICIT_DENY: 'explicit_deny',
  SCP: 'scp',
  RESOURCE_POLICY: 'resource_policy',
  TRUST_POLICY: 'trust_policy',
  IDENTITY_POLICY: 'identity_policy',
  PERMISSION_BOUNDARY: 'permission_boundary',
  CONDITION: 'condition_keys',
};

/** Glossary entry for each inspector policy tab. */
export const POLICY_TAB_CONCEPT = {
  identity: 'identity_policy',
  resource: 'resource_policy',
  trust: 'trust_policy',
  boundary: 'permission_boundary',
  scp: 'scp',
} as const;

export function getConcept(id: string): Concept | undefined {
  return CONCEPTS[id];
}

export function getServiceConcept(type: NodeType): Concept {
  return CONCEPTS[type];
}
