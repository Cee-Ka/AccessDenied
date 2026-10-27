# AccessDenied — Cloud & AWS IAM Architecture Game Specification (`plan.md`)

**AccessDenied** is an interactive, browser-based cloud architecture and security simulation game inspired by [GonnaCrash](https://gonnacrash.com/). While GonnaCrash tests whether a distributed system can survive traffic spikes without crashing, **AccessDenied** tests whether an AWS architecture can serve legitimate business workloads while surviving real-world IAM privilege escalation, SSRF token theft, cross-account confused deputy attacks, and cloud billing traps.

## 1. Product Vision & Core Gameplay Loop

### Core Design Tension
In production AWS environments, engineers constantly balance two opposing forces:
1. **Over-permissive configurations** (`"Action": "*"`, `"Resource": "*"`, public S3 buckets, IMDSv1) make features work immediately but expose the organization to catastrophic breaches and data exfiltration.
2. **Over-restrictive policies** (broken trust policies, conflicting [Service Control Policies (SCPs)](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html), missing KMS key permissions, isolated subnets without endpoints) lock down security but cause immediate `403 AccessDenied` or `ConnectionTimeout` production outages.

### The 4-Step Gameplay Loop
1. **Inspect Scenario & Threat Intel**: Each round presents an initial architecture on an interactive whiteboard canvas, a monthly AWS budget cap, legitimate business traffic requirements, and an incoming "Threat / Audit Twist."
2. **Architect & Harden**: Players drag and drop AWS compute, storage, network, and IAM nodes onto the board, wire connections, toggle security controls (e.g., S3 Block Public Access, EC2 IMDSv2), and edit JSON IAM policies in a side drawer.
3. **Run Simulation**: Clicking **Simulate** sends animated request packets across the canvas:
   - **Green packets (Legitimate Workloads)**: Application API calls, database reads/writes, S3 object fetches, cross-account CI/CD deployments.
   - **Red packets (Adversary / Exploit Vectors)**: Attacker probes attempting SSRF metadata extraction, `iam:PassRole` privilege escalation, S3 bucket enumeration, or cross-tenant DynamoDB queries.
4. **Diagnose, Fix & Optimize**: If a legitimate packet fails with `403 AccessDenied` or an exploit packet succeeds in exfiltrating data, the offending node highlights in red and the **IAM Coach** explains the exact evaluation step or network hop that failed.

### 3-Star Rating Criteria

| Star Tier | Requirement | Evaluation Metric |
| :--- | :--- | :--- |
| **1 Star (Functional)** | Business Continuity | 100% of legitimate workload requests return `200 OK` (zero `403 AccessDenied` or network timeouts). |
| **2 Stars (Secure)** | Zero Breaches | 100% of adversary exploit payloads are blocked (`Explicit Deny` or `Implicit Deny`) and zero wildcard privilege escalations exist. |
| **3 Stars (Optimal)** | Cost & Least Privilege | Monthly infrastructure cost stays within the target budget AND policies contain zero unused permissions or wildcard resource ARNs. |

## 2. Game Modes

| Mode | Purpose | Mechanics |
| :--- | :--- | :--- |
| **Learn** | Guided Campaign | Progressive rounds where each level teaches a single AWS IAM or cloud security primitive (e.g., Bucket Policies vs. IAM Roles, Permission Boundaries, KMS Key Policies). |
| **Incidents (Questions)** | Real-World Post-Mortems & SAA-C03 Challenges | Full-scale architectural scenarios modeled after famous cloud breaches and AWS Solutions Architect / Security Specialty exam trade-offs. |
| **Sandbox** | Freeform Policy & Architecture Lab | Unlimited canvas where users build custom multi-account AWS setups, define custom IAM JSON policies, and inject custom request/exploit streams to test evaluation paths. |

## 3. Canvas Components & Node Specifications

Every component on the board exposes connection ports, configuration toggles, a monthly cost, and an optional policy document slot.

### Identity & Compute Nodes (Principals)

| Component | Base Cost | Configurable Properties | Attached Policy Types |
| :--- | :--- | :--- | :--- |
| **IAM User** | $0/mo | MFA Enabled (`bool`), Access Key Age, Group Memberships | Identity Policy, Permission Boundary |
| **IAM Role** | $0/mo | Max Session Duration, `sts:ExternalId` requirement | Trust Policy (`AssumeRolePolicyDocument`), Identity Policy, Permission Boundary |
| **EC2 Instance** | $15/mo | Metadata Service (`IMDSv1` vs `IMDSv2` hop limit), Subnet placement | Instance Profile (links 1 IAM Role), Security Group |
| **AWS Lambda** | $5/mo | VPC Attachment (`Unattached` vs `Private Subnet`), Environment KMS encryption | Execution Role (links 1 IAM Role) |
| **Cognito Identity Pool** | $0/mo | Authenticated vs Unauthenticated role mapping, Principal Tags (`cognito-identity.amazonaws.com:sub`) | Role Mapping Rules |
| **External Vendor Account** | $0/mo | 12-digit AWS Account ID, Spoofable Tenant ID | Outbound `sts:AssumeRole` caller |

### Data & Resource Nodes

| Component | Base Cost | Configurable Properties | Attached Policy Types |
| :--- | :--- | :--- | :--- |
| **S3 Bucket** | $5/mo | Block Public Access (4 toggles), Object Ownership (ACLs disabled), Default Encryption (`SSE-S3` vs `SSE-KMS`) | Bucket Policy (Resource-based Policy) |
| **DynamoDB Table** | $10/mo | Partition Key (`PK`), Sort Key (`SK`), Encryption key reference | Resource-based Policy, Fine-grained Condition Keys (`dynamodb:LeadingKeys`, `dynamodb:Select`) |
| **RDS Database** | $30/mo | Publicly Accessible (`bool`), IAM DB Authentication (`bool`), Multi-AZ (`bool`) | Security Group, Resource ARN for `rds-db:connect` |
| **KMS Customer Managed Key** | $1/mo + API usage | Automatic Key Rotation (`bool`), Multi-Region (`bool`) | KMS Key Policy (Required for root/IAM delegation) |
| **Secrets Manager** | $2/mo | Rotation Lambda link, KMS Encryption Key link | Resource Policy |

### Network & Governance Containers

| Component | Base Cost | Function in Simulation |
| :--- | :--- | :--- |
| **AWS Organization / OU** | $0/mo | Wraps AWS Account containers; enforces attached **Service Control Policies (SCPs)** across all child principals. |
| **VPC & Subnets** | $0/mo | Public vs. Private routing isolation; blocks direct internet ingress to private compute nodes. |
| **NAT Gateway** | $32/mo + data | Allows private subnet compute (Lambda/EC2) to reach public AWS APIs, but incurs heavy data processing charges. |
| **VPC Gateway Endpoint (S3/DynamoDB)** | $0/mo | Routes private VPC traffic directly to S3 or DynamoDB without traversing a NAT Gateway; supports Endpoint Policies. |
| **VPC Interface Endpoint (PrivateLink)** | $7/mo | Provides private IP connectivity to KMS, Secrets Manager, or STS inside a private subnet; supports Security Groups and Endpoint Policies. |

## 4. Deterministic Simulation Engine Design

The core differentiator of **AccessDenied** is a pure, client-side TypeScript engine that faithfully implements the official [AWS IAM Policy Evaluation Logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html) combined with network reachability checks.

### Phase A: Network Reachability Check
Before evaluating IAM permissions, each simulated packet verifies whether a valid network path exists from `SourceNode` to `TargetResource`:
1. **Ingress Path**: If an external user or attacker targets a node inside a Private Subnet without an ALB/API Gateway or public route, the packet drops (`NETWORK_UNREACHABLE`).
2. **Egress Path**: If a Lambda or EC2 inside a Private Subnet calls an AWS service (`s3:*`, `kms:*`, `sts:*`), the engine checks for an attached **NAT Gateway** or matching **VPC Endpoint**.
3. **Security Group & NACL Check**: Validates protocol/port rules on compute and RDS nodes.

### Phase B: IAM Policy Evaluation Pipeline
For every request tuple `(Principal, Action, Resource, RequestContext)`, the engine evaluates policies in strict sequence:

1. **Default Decision**: Start at `IMPLICIT_DENY`.
2. **Explicit Deny Sweep**: Evaluate all applicable policies (SCPs, Resource Policies, Identity Policies, Permission Boundaries, VPC Endpoint Policies, Session Policies). If **any** statement matches with `Effect: "Deny"`, immediately return `EXPLICIT_DENY` and cite the blocking policy ID.
3. **Organizations SCP Check**: If the principal belongs to an account under an Organization OU with SCPs attached, verify that **every** ancestor SCP from Root to Account contains an `Effect: "Allow"` for the action/resource. If not, return `IMPLICIT_DENY (Blocked by SCP)`.
4. **Resource-Based Policy Check**:
   - **Same-Account Request**: If the target resource (e.g., S3 Bucket or KMS Key) explicitly grants `Allow` to the specific principal ARN in its Resource Policy, and no Permission Boundary blocks it, mark identity/resource grant as satisfied (Note: KMS Key Policies **must** allow the root account to enable IAM policies).
   - **Cross-Account Request**: Both the Principal's Identity Policy AND the Target's Resource Policy (or Assumed Role Trust Policy) must explicitly evaluate to `Allow`.
5. **Identity-Based Policy Check**: Verify at least one attached Managed or Inline policy on the Principal grants `Effect: "Allow"`.
6. **Permission Boundary Check**: If a Permission Boundary is attached to the IAM User or Role, verify the boundary also grants `Effect: "Allow"`. If missing, return `IMPLICIT_DENY (Clipped by Permission Boundary)`.
7. **Condition Block Evaluator**: Evaluate all `Condition` operators against `RequestContext`:
   - `StringEquals` / `StringLike` (e.g., `sts:ExternalId`, `aws:PrincipalTag/department`, `s3:prefix`)
   - `ArnEquals` / `ArnLike` (e.g., `aws:SourceArn`)
   - `IpAddress` / `NotIpAddress` (e.g., `aws:SourceIp`)
   - `Bool` (e.g., `aws:SecureTransport`, `aws:MultiFactorAuthPresent`)
   - `NumericLessThanEquals` (e.g., `ec2:MetadataHttpPutResponseHopLimit`)
   - `ForAllValues:StringEquals` (e.g., `dynamodb:LeadingKeys`, `dynamodb:Attributes`)

### Phase C: Multi-Step Exploit Chain Resolution
Adversary packets can chain up to 3 hops during a simulation run:
- **Chain 1 (IMDSv1 SSRF)**: `External Attacker` -> `HTTP GET http://169.254.169.254/latest/meta-data/iam/security-credentials/` on `EC2` -> steals `EC2 Instance Role` credentials -> executes `s3:GetObject` on `ProductionBucket`.
- **Chain 2 (`iam:PassRole` Escalation)**: `Compromised Dev User` -> calls `iam:PassRole` with `AdminRole` + `lambda:CreateFunction` -> invokes new Lambda -> executes `dynamodb:Scan` on `CustomerPII`.
- **Chain 3 (Confused Deputy)**: `Attacker` -> registers victim's Role ARN in `ThirdPartyVendor` -> triggers `ThirdPartyVendor` to call `sts:AssumeRole` without matching `sts:ExternalId` -> exfiltrates S3 data.

## 5. Level Progression & Curriculum ("Learn" Track)

| Round | Level Title | Core AWS Concept | Initial Broken Setup | Twist / Attack Vector | Target Solution |Budget |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **The Leaky Bucket** | S3 Bucket Policies vs Block Public Access | Web server writes PDF invoices to S3 with `"Principal": "*"` on `s3:GetObject`. | Botnet scrapes sequential invoice URLs. | Enable S3 Block Public Access; restrict Bucket Policy principal to the Web Server's IAM Role ARN. | $20/mo |
| **2** | **The Metadata Heist** | [EC2 IMDSv2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html) & Least Privilege | EC2 instance runs a URL previewer with `IMDSv1` enabled and `AmazonS3FullAccess`. | Attacker sends SSRF payload to `169.254.169.254`, steals role token, dumps private S3 bucket. | Enforce `IMDSv2` (`HttpTokens: required`, hop limit 1) and scope role to specific bucket prefix. | $25/mo |
| **3** | **The Confused Deputy** | Cross-Account Trust & `sts:ExternalId` | Analytics vendor role trusts vendor's AWS account ID (`111122223333`) with no conditions. | Rival customer on the same analytics vendor supplies your Role ARN and reads your S3 data. | Add `Condition: {"StringEquals": {"sts:ExternalId": "ac-9841-sec"}}` to the Role Trust Policy. | $20/mo |
| **4** | **Shadow Admin** | `iam:PassRole` & Permission Boundaries | CI/CD developer role has `iam:*` and `lambda:*` to deploy serverless functions. | Compromised dev workstation passes `OrganizationAdminRole` to a custom Lambda and escalates privileges. | Restrict `iam:PassRole` resource to `arn:aws:iam::*:role/lambda-exec-*` and attach a Permission Boundary. | $15/mo |
| **5** | **Tenant Hopping** | Fine-Grained DynamoDB Conditions | Multi-tenant SaaS app queries `Documents` DynamoDB table using shared Lambda role. | Tenant A crafts request querying Tenant B's Partition Key (`TENANT#B`). | Use Cognito Identity Pool mapped role with `dynamodb:LeadingKeys: ["${cognito-identity.amazonaws.com:sub}"]`. | $15/mo |
| **6** | **The Silent Lockout** | KMS Key Policies & Encryption | Secrets Manager secret encrypted with custom KMS CMK; Lambda has `secretsmanager:GetSecretValue` but gets `403`. | Production deployment fails because Lambda lacks `kms:Decrypt` and KMS Key Policy lacks role trust. | Grant `kms:Decrypt` on the CMK ARN and include `kms:ViaService` condition in the policy. | $10/mo |
| **7** | **The NAT Gateway Trap** | VPC Endpoints & Cost Optimization | Private-subnet Lambda processes 5 TB/mo of S3 logs through a NAT Gateway ($260/mo bill). | Startup runs out of cloud credits; attacker also probes VPC endpoint policy. | Remove NAT Gateway, attach free S3 Gateway Endpoint, and lock down Endpoint Policy to org bucket. | $15/mo |
| **8** | **Guardrail Clash** | Organizations SCPs vs Identity Policies | Security team attaches an OU-level SCP; suddenly production backups in `eu-central-1` fail with `AccessDenied`. | Ransomware actor simultaneously attempts to spin up `p4d.24xlarge` crypto miners in `ap-east-1`. | Craft an SCP Region Deny rule with an exemption for the DR backup role, while blocking non-approved EC2 instance types. | $45/mo |

## 6. Technical Architecture & Stack Specification

To match GonnaCrash's instant responsiveness and zero-backend operational overhead, **AccessDenied** is designed as a static, client-side application with optional local persistence.

### Technology Stack

| Layer | Choice | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript + Vite | Fast HMR, strict type safety for IAM policy AST and graph structures. |
| **Whiteboard Canvas** | `@xyflow/react` (React Flow) | Purpose-built node/edge graph canvas with custom node rendering, viewport pan/zoom, and custom SVG edge animations. |
| **Policy Code Editor** | `@monaco-editor/react` (or CodeMirror 6) | Provides JSON syntax highlighting, autocomplete for AWS IAM Actions (`s3:*`, `iam:*`), and real-time schema linting. |
| **State Management** | Zustand + Immer | Lightweight immutable state updates for board graph, active simulation ticks, and player progress. |
| **Styling & UI** | Tailwind CSS + Lucide Icons | Dark-mode AWS-inspired engineering console aesthetic with high-contrast status indicators. |
| **Testing** | Vitest + Playwright | Unit test suite for the IAM Policy Evaluation Engine (`100%` branch coverage on evaluation order) and E2E level solution verification. |
| **Deployment** | Cloudflare Pages / GitHub Pages / AWS S3 + CloudFront | Zero server cost, instant global CDN delivery. |

### Core Data Schemas (`src/types/engine.ts`)

```typescript
export type Effect = 'Allow' | 'Deny';

export interface PolicyStatement {
  Sid?: string;
  Effect: Effect;
  Principal?: string | { AWS?: string | string[]; Service?: string | string[] };
  Action: string | string[];
  Resource: string | string[];
  Condition?: Record<string, Record<string, string | string[] | boolean | number>>;
}

export interface PolicyDocument {
  Version: '2012-10-17';
  Statement: PolicyStatement[];
}

export type NodeCategory = 'principal' | 'resource' | 'network' | 'governance';

export interface CloudNodeData {
  id: string;
  type: 'iam_user' | 'iam_role' | 'ec2' | 'lambda' | 's3' | 'dynamodb' | 'kms' | 'rds' | 'nat_gw' | 'vpc_endpoint' | 'scp';
  label: string;
  arn: string;
  accountId: string;
  monthlyCost: number;
  config: {
    imdsVersion?: 'v1' | 'v2';
    blockPublicAccess?: boolean;
    requireExternalId?: string;
    inPrivateSubnet?: boolean;
    kmsKeyArn?: string;
  };
  identityPolicies: PolicyDocument[];
  resourcePolicy?: PolicyDocument;
  trustPolicy?: PolicyDocument;
  permissionBoundary?: PolicyDocument;
}

export interface SimulationPacket {
  id: string;
  name: string;
  kind: 'legitimate' | 'exploit';
  sourceNodeId: string;
  targetNodeId: string;
  action: string;
  resourceArn: string;
  context: Record<string, string | boolean | number>;
  expectedOutcome: 'ALLOW' | 'DENY';
}

export interface EvaluationTraceStep {
  stage: 'NETWORK' | 'EXPLICIT_DENY' | 'SCP' | 'RESOURCE_POLICY' | 'TRUST_POLICY' | 'IDENTITY_POLICY' | 'PERMISSION_BOUNDARY' | 'CONDITION';
  passed: boolean;
  reason: string;
  policySnippet?: PolicyStatement;
}
```

### Repository Directory Structure

```text
access-denied/
├── public/
│   └── icons/                  # AWS service SVG icons (IAM, S3, EC2, Lambda, KMS, VPC)
├── src/
│   ├── components/
│   │   ├── canvas/             # Custom React Flow nodes & animated packet SVG edges
│   │   ├── inspector/          # Slide-out Policy JSON editor & toggle switches
│   │   ├── hud/                # Top bar (Round info, Traffic status, Budget meter, Run button)
│   │   └── coach/              # Post-run diagnostic modal, evaluation trace tree & hints
│   ├── engine/
│   │   ├── evaluator.ts        # AWS IAM Policy Evaluation Logic implementation
│   │   ├── matcher.ts          # Wildcard (*, ?) glob matching for Actions and ARNs
│   │   ├── conditions.ts       # Condition block operators (StringEquals, ArnLike, IpAddress)
│   │   ├── network.ts          # VPC, Subnet, NAT Gateway, and Endpoint reachability solver
│   │   └── exploitChains.ts    # Multi-hop privilege escalation & SSRF resolver
│   ├── levels/
│   │   ├── round1-leaky-bucket.ts
│   │   ├── round2-imds-heist.ts
│   │   ├── round3-confused-deputy.ts
│   │   └── index.ts
│   ├── store/
│   │   └── useGameStore.ts     # Zustand store for board graph, simulation state, stars earned
│   └── types/
│       └── engine.ts
├── tests/
│   ├── evaluator.test.ts       # Exhaustive unit tests for IAM policy evaluation edge cases
│   └── levels.test.ts          # Automated verification that every level's target solution earns 3 stars
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 7. UI/UX Wireframe & Interaction Design

### Main Game Viewport
- **Top HUD Bar**:
  - **Left**: `AccessDenied` logo, Mode selector (`Learn` | `Incidents` | `Sandbox`), Current Round selector.
  - **Center Metrics**:
    - `Workloads: 0/12 Passed`
    - `Exploits Blocked: 0/4`
    - `Budget: $20 / $25 mo`
  - **Right**: Primary **Simulate** button (`Run`), Speed toggle (`1x` / `2x`), Reset Board.
- **Left Component Dock**:
  - Draggable cards showing service icon, name, and monthly cost (e.g., `S3 Gateway Endpoint · $0/mo`, `IAM Role · $0/mo`).
  - Locked components unlock progressively as players advance through rounds.
- **Center Interactive Whiteboard**:
  - Dot-grid dark canvas.
  - VPC and AWS Account boundaries rendered as translucent group containers.
  - Nodes display miniature badges indicating active security posture (e.g., `IMDSv2` shield badge on EC2, `Public Block ON` padlock on S3).
  - Edges animate glowing particles during simulation runs, pausing on the exact node where a `403 AccessDenied` or `BREACH` occurs.
- **Right Inspector Drawer (opens on node click)**:
  - **Quick Toggles**: Beginner-friendly switches in early rounds (e.g., toggle `Block Public Access`, select `Allowed Actions` checkboxes).
  - **Raw JSON Policy Tab**: Full Monaco editor for writing and debugging raw `"Version": "2012-10-17"` IAM policy statements, complete with a live byte-size counter and syntax validator.
- **Bottom Diagnostic Console / Coach Banner**:
  - Displays step-by-step evaluation traces when a round fails (e.g., `❌ Legitimate packet 'Save Order' failed at stage PERMISSION_BOUNDARY: Action 'dynamodb:PutItem' was allowed by Identity Policy but missing from attached Permission Boundary`).
  - Progressive 3-tier Hint system (`Nudge` -> `Root Cause` -> `Policy Diff`).

## 8. Sprint-by-Sprint Implementation Roadmap

### Sprint 1: Deterministic IAM & Network Engine (Days 1–5)
- Implement `matcher.ts` supporting AWS glob wildcards (`*` and `?`) for Action strings and ARN patterns, plus policy variable interpolation (`${aws:username}`, `${cognito-identity.amazonaws.com:sub}`).
- Implement `conditions.ts` supporting `StringEquals`, `StringLike`, `ArnLike`, `Bool`, `IpAddress`, and `ForAllValues:StringEquals`.
- Build `evaluator.ts` executing the exact 7-step IAM evaluation pipeline and returning a structured `EvaluationTraceStep[]` array explaining why access was allowed or denied.
- Build `network.ts` to verify subnet routing, NAT Gateway egress costs, and VPC Endpoint policies.
- Write 40+ Vitest unit tests covering IAM edge cases (explicit deny override, SCP intersection, cross-account trust + resource policy logic, KMS key policy delegation).

### Sprint 2: Interactive Whiteboard & Inspector UI (Days 6–11)
- Scaffold Vite + React + TypeScript + Tailwind project and integrate `@xyflow/react`.
- Build custom node components for Principals (`EC2`, `Lambda`, `IAM Role`), Resources (`S3`, `DynamoDB`, `KMS`), and Containers (`AWS Account`, `VPC`, `Private Subnet`).
- Build the slide-out **Policy Inspector Drawer** with both a visual rule builder (for fast edits) and a raw JSON Monaco editor with schema validation.
- Implement connection rules (e.g., attaching an `IAM Role` to `Lambda` updates the Lambda's execution role reference; connecting a `VPC Endpoint` to `Private Subnet` updates the route table).

### Sprint 3: Packet Animator & Diagnostic Coach (Days 12–16)
- Build the simulation tick scheduler that steps through legitimate workload packets followed by adversary exploit packets.
- Create custom SVG animated edges showing green workload pulses and red exploit pulses, with floating status pills (`200 OK`, `403 AccessDenied`, `EXPLOIT: SSRF`).
- Build the **IAM Coach** diagnostic modal that renders the visual policy evaluation checklist (`[✓] SCP -> [✓] Identity Policy -> [✗] Permission Boundary`) so players immediately see why a request failed.

### Sprint 4: Campaign Levels, Sandbox & Polish (Days 17–21)
- Author JSON level definitions for Rounds 1–8 in the **Learn** track and 4 comprehensive SAA-C03 / real-world breach challenges in the **Incidents** track (e.g., Capital One SSRF scenario, Twitch/Codecov CI token leak scenario).
- Implement **Sandbox Mode** with an import/export JSON feature (allowing users to share puzzling IAM setups via URL hash or file download).
- Add `localStorage` progress saving, 3-star completion badges, and keyboard shortcuts (`Space` to run simulation, `Esc` to close drawer).
