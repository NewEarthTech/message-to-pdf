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

variable "github_repo" {
  description = "Repository allowed to assume the deploy role via OIDC."
  type        = string
  default     = "NewEarthTech/message-to-pdf"
}
