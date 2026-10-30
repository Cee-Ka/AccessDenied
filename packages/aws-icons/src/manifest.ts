/**
 * The curated icon list. Only icons mapped to a game node type, dock entry or
 * concept belong here. `sources` lists candidate file names from the official
 * AWS Architecture Icons package (names vary slightly between releases);
 * `scripts/sync-icons.mjs` copies the first match to `svg/<key>.svg`.
 */

export type IconCategory = 'compute' | 'storage' | 'database' | 'security' | 'networking' | 'management' | 'general';

export interface IconEntry {
  /** Accessible service name, read by screen readers */
  name: string;
  category: IconCategory;
  sources: string[];
}

export const ICON_MANIFEST = {
  iam_user: { name: 'IAM User', category: 'general', sources: ['Res_User_48_Light.svg', 'Res_User_48.svg'] },
  iam_role: {
    name: 'IAM Role',
    category: 'security',
    sources: ['Res_AWS-Identity-Access-Management_Role_48.svg', 'Res_AWS-Identity-and-Access-Management_Role_48.svg'],
  },
  ec2: { name: 'Amazon EC2', category: 'compute', sources: ['Arch_Amazon-EC2_48.svg'] },
  lambda: { name: 'AWS Lambda', category: 'compute', sources: ['Arch_AWS-Lambda_48.svg'] },
  cognito: { name: 'Amazon Cognito', category: 'security', sources: ['Arch_Amazon-Cognito_48.svg'] },
  external_vendor: { name: 'External Caller', category: 'general', sources: ['Res_Users_48_Light.svg', 'Res_Users_48.svg'] },
  s3: { name: 'Amazon S3', category: 'storage', sources: ['Arch_Amazon-Simple-Storage-Service_48.svg'] },
  dynamodb: { name: 'Amazon DynamoDB', category: 'database', sources: ['Arch_Amazon-DynamoDB_48.svg'] },
  rds: { name: 'Amazon RDS', category: 'database', sources: ['Arch_Amazon-RDS_48.svg'] },
  kms: { name: 'AWS KMS', category: 'security', sources: ['Arch_AWS-Key-Management-Service_48.svg'] },
  secrets_manager: { name: 'AWS Secrets Manager', category: 'security', sources: ['Arch_AWS-Secrets-Manager_48.svg'] },
  aws_account: { name: 'AWS Account', category: 'management', sources: ['AWS-Account_32.svg'] },
  organizations: { name: 'AWS Organizations', category: 'management', sources: ['Arch_AWS-Organizations_48.svg'] },
  vpc: { name: 'Amazon VPC', category: 'networking', sources: ['Virtual-private-cloud-VPC_32.svg'] },
  subnet_private: { name: 'Private Subnet', category: 'networking', sources: ['Private-subnet_32.svg'] },
  subnet_public: { name: 'Public Subnet', category: 'networking', sources: ['Public-subnet_32.svg'] },
  nat_gw: { name: 'NAT Gateway', category: 'networking', sources: ['Res_Amazon-VPC_NAT-Gateway_48.svg'] },
  vpc_endpoint: { name: 'VPC Endpoint', category: 'networking', sources: ['Res_Amazon-VPC_Endpoints_48.svg'] },
} as const satisfies Record<string, IconEntry>;

export type IconKey = keyof typeof ICON_MANIFEST;

export const ICON_KEYS = Object.keys(ICON_MANIFEST) as IconKey[];
