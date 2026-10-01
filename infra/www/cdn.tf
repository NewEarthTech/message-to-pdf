data "aws_route53_zone" "site" {
  name         = "${var.domain_name}."
  private_zone = false
}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_response_headers_policy" "security" {
  name = "Managed-SecurityHeadersPolicy"
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.domain_name}-oac"
  description                       = "OAC for the ${var.domain_name} static site"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# The site is prerendered to directory-style keys (/pricing/index.html), so a
# request for /pricing has to be rewritten before it reaches S3. CloudFront's
# default_root_object only covers "/", not nested paths, which is why this
# function exists rather than an SPA-style catch-all rewrite: each route is a
# real document with its own <title>, meta description, and status code.
#
# It also keeps every page at one URL. www, a trailing slash, and an explicit
# index.html all reach the same document, so each of them 301s to the
# extensionless apex URL that the canonicals and the sitemap name. CloudFront
# hands the function query string values still percent-encoded, so they are
# joined back as they arrived, which keeps /success?_ptxn=<txn> intact.
resource "aws_cloudfront_function" "directory_index" {
  name    = "message-to-pdf-directory-index"
  runtime = "cloudfront-js-2.0"
  comment = "Redirect to the canonical URL, append index.html to extensionless paths"
  publish = true
  code    = <<-JS
    function handler(event) {
      var request = event.request;
      var uri = request.uri;
      var host = request.headers.host ? request.headers.host.value.toLowerCase().split(':')[0] : '';

      var canonical = uri.replace(/\/index\.html$/, '/').replace(/\/+$/, '') || '/';
      if (host !== '${var.domain_name}' || canonical !== uri) {
        return {
          statusCode: 301,
          statusDescription: 'Moved Permanently',
          headers: {
            location: { value: 'https://${var.domain_name}' + canonical + querystring(request.querystring) },
            // A 301 with no caching headers can stick in a browser for good;
            // an hour keeps a mistake here fixable.
            'cache-control': { value: 'max-age=3600' }
          }
        };
      }

      if (uri.charAt(uri.length - 1) === '/') {
        request.uri = uri + 'index.html';
        return request;
      }

      // Only the last segment decides: a path with no dot in its final segment
      // is a route, not a file, so it maps onto that route's index.html.
      var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);
      if (lastSegment.indexOf('.') === -1) {
        request.uri = uri + '/index.html';
      }

      return request;
    }

    function querystring(params) {
      var pairs = [];
      for (var name in params) {
        var values = params[name].multiValue || [params[name]];
        for (var i = 0; i < values.length; i++) {
          pairs.push(name + '=' + values[i].value);
        }
      }
      return pairs.length ? '?' + pairs.join('&') : '';
    }
  JS
}

# --- TLS certificate (DNS-validated, apex + www) ---
resource "aws_acm_certificate" "site" {
  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.site.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  allow_overwrite = true
  zone_id         = data.aws_route53_zone.site.zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 60
  records         = [each.value.record]
}

resource "aws_acm_certificate_validation" "site" {
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# --- Distribution ---
resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain_name, "www.${var.domain_name}"]
  price_class         = "PriceClass_100"
  comment             = "${var.domain_name} marketing site"
  wait_for_deployment = false

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-${var.bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id           = "s3-${var.bucket_name}"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.directory_index.arn
    }
  }

  # A real 404, not a soft 200. Serving index.html with a 200 for every unknown
  # URL is what makes a search engine index junk paths as duplicates of the home
  # page, so unknown routes get the prerendered 404 document and a 404 status.
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
