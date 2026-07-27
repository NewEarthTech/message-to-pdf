# infra

Terraform roots, one directory per stack. Each has its own state, its own README, and its own OIDC deploy role, so a stack can be applied without touching any other.

| Stack | What it is |
|---|---|
| [`www/`](www/) | Hosting for the marketing site at message-to-pdf.com: private S3 behind CloudFront, ACM, Route53, and the deploy role CI assumes. |

Every root expects `AWS_PROFILE=newearth-admin` (account 735853783919) and keeps state in `s3://john-carmack-terraform-state/<name>/terraform.tfstate`. The state key is set in each root's `providers.tf` and is independent of where the directory sits, so moving a stack does not migrate its state.

The purchase funnel's server-side pieces (the Paddle webhook Lambda, the entitlement-gated download endpoint, the DMG's own distribution, and SES) are not here. They live in the `NewEarthTech/newearth.llc` repo and are shared with the company site rather than duplicated.
