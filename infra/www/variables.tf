variable "domain_name" {
  description = "Apex domain for the marketing site."
  type        = string
  default     = "message-to-pdf.com"
}

variable "bucket_name" {
  description = "Private S3 bucket holding the built static site (served only via CloudFront OAC)."
  type        = string
  default     = "message-to-pdf-com-site"
}

variable "github_owner" {
  description = "GitHub org that owns the repo allowed to assume the deploy role."
  type        = string
  default     = "NewEarthTech"
}

variable "github_repo_name" {
  description = "Repository allowed to assume the deploy role."
  type        = string
  default     = "message-to-pdf"
}

# This org's Actions OIDC subject claim carries numeric ids, not just names:
#
#   repo:NewEarthTech@147949794/message-to-pdf@1285563802:ref:refs/heads/main
#
# A trust policy written against the documented `repo:OWNER/NAME:ref:...` form
# therefore never matches, and the job fails at AssumeRoleWithWebIdentity. Read
# the real prefix with:
#
#   gh api /repos/<owner>/<repo>/actions/oidc/customization/sub
#
# Pinning the ids is stronger than pinning names (it survives a rename, and a
# deleted-then-recreated repo of the same name gets a new id and is refused),
# but a transfer to another org changes the owner id and needs a re-apply.
variable "github_owner_id" {
  description = "Numeric GitHub id of the owning org, as it appears in the OIDC subject claim."
  type        = string
  default     = "147949794"
}

variable "github_repo_id" {
  description = "Numeric GitHub id of the repo, as it appears in the OIDC subject claim."
  type        = string
  default     = "1285563802"
}
