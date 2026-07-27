terraform {
  required_version = ">= 1.10"

  backend "s3" {
    bucket       = "john-carmack-terraform-state"
    key          = "message-to-pdf.com/terraform.tfstate"
    region       = "us-west-2"
    use_lockfile = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

# CloudFront, its functions, and its ACM certificate must live in us-east-1.
provider "aws" {
  region = "us-east-1"
}
