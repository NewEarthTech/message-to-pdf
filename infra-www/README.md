# message-to-pdf.com — hosting infrastructure

Terraform for the marketing site at **message-to-pdf.com**: a private S3 bucket fronted by CloudFront (Origin Access Control) with a DNS-validated ACM certificate. The site is the Vite app in [`../www/`](../www/); `pnpm build` prerenders it to `www/dist/`, which is synced to the bucket.

This stack covers the website only. The purchase funnel's other pieces (the Paddle webhook Lambda, the entitlement-gated download endpoint, and the DMG's own CloudFront distribution) live in the `NewEarthTech/newearth.llc` repo and are shared, not duplicated here.

## What it manages

- `aws_s3_bucket.site` — private bucket (`message-to-pdf-com-site`); all public access blocked.
- `aws_cloudfront_origin_access_control.site` + `aws_s3_bucket_policy.site` — OAC grant, scoped to this distribution by ARN.
- `aws_acm_certificate.site` (us-east-1) — `message-to-pdf.com` + `www.message-to-pdf.com`, DNS-validated.
- `aws_cloudfront_function.directory_index` — rewrites extensionless paths onto `<route>/index.html`. The site is prerendered per route, so `/pricing` is a real document, not an SPA shell.
- `aws_cloudfront_distribution.site` — redirect-to-https, compression, managed `CachingOptimized` and `SecurityHeadersPolicy`, and 403/404 mapped to the prerendered `/404.html` **with a 404 status** (not a soft 200).
- `aws_route53_record.*` — the live A/AAAA aliases for the apex and `www`. This zone was created for this site alone, so unlike newearth.llc the records live with the stack rather than in `my-infra-private`.
- `aws_iam_role.deploy` — the OIDC role the deploy workflow assumes. Separate from the release-signing role by design: a website deploy can never touch a release artifact.

## Usage

```sh
export AWS_PROFILE=newearth-admin   # account 735853783919
terraform init
terraform plan
terraform apply
```

State: `s3://john-carmack-terraform-state/message-to-pdf.com/terraform.tfstate`.

After the first apply, publish the role ARN so CI can assume it:

```sh
gh variable set AWS_WWW_DEPLOY_ROLE_ARN -R NewEarthTech/message-to-pdf \
  --body "$(terraform output -raw deploy_role_arn)"
gh variable set WWW_DISTRIBUTION_ID -R NewEarthTech/message-to-pdf \
  --body "$(terraform output -raw distribution_id)"
gh variable set WWW_BUCKET -R NewEarthTech/message-to-pdf \
  --body "$(terraform output -raw bucket)"
```

## Deploying the site

Pushing to `main` with changes under `www/**` runs `.github/workflows/deploy-www.yml`, which builds and syncs. To deploy by hand:

```sh
cd ../www && pnpm install && pnpm build
aws s3 sync dist/ "s3://$(terraform -chdir=../infra-www output -raw bucket)/" --delete
aws cloudfront create-invalidation \
  --distribution-id "$(terraform -chdir=../infra-www output -raw distribution_id)" --paths '/*'
```

The build refuses to run without a matching `VITE_PADDLE_ENV` / `VITE_PADDLE_CLIENT_TOKEN` pair, so a sandbox token can never ship to production.
