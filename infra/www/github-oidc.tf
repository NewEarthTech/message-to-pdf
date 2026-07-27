# GitHub Actions deploy role for the marketing site (OIDC, no stored keys).
#
# Reuses the account's single GitHub OIDC provider (created by the public
# my-infra/github-oidc root), referenced here as a data source. Trust is pinned
# to this repo's main branch; the role may sync the site bucket and invalidate
# the distribution, nothing else. It is deliberately separate from the release
# role that signs and publishes the DMG, so a website deploy can never touch a
# release artifact. Applied once locally with admin credentials
# (AWS_PROFILE=newearth-admin); the deploy workflow then assumes it from CI.

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "deploy_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Only the main branch (push or workflow_dispatch on main) may assume this.
    #
    # Note the numeric ids: this org's OIDC subject claim is
    # `repo:OWNER@OWNER_ID/REPO@REPO_ID:ref:...`, not the plain
    # `repo:OWNER/REPO:ref:...` in most documentation. See variables.tf.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_owner}@${var.github_owner_id}/${var.github_repo_name}@${var.github_repo_id}:ref:refs/heads/main"
      ]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name                 = "github-actions-message-to-pdf-www-deploy"
  description          = "Deploy role for ${var.github_owner}/${var.github_repo_name} (OIDC): marketing site S3 sync + CloudFront invalidation"
  assume_role_policy   = data.aws_iam_policy_document.deploy_trust.json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "deploy" {
  statement {
    sid       = "ListSiteBucket"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.site.arn]
  }

  statement {
    sid    = "WriteSiteObjects"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${aws_s3_bucket.site.arn}/*"]
  }

  statement {
    sid       = "InvalidateDistribution"
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [aws_cloudfront_distribution.site.arn]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "site-deploy"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
