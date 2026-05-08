# S3 Bucket สำหรับ Static Website Hosting (Reporter Portal)
resource "aws_s3_bucket" "portal" {
  bucket        = "${var.project_name}-portal"
  force_destroy = true

  tags = {
    Name = "${var.project_name}-portal"
  }
}

# เปิด Static Website Hosting
resource "aws_s3_bucket_website_configuration" "portal" {
  bucket = aws_s3_bucket.portal.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# เปิด Public Access
resource "aws_s3_bucket_public_access_block" "portal" {
  bucket = aws_s3_bucket.portal.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket Policy: ให้ทุกคนอ่านไฟล์ได้ (Static Website)
resource "aws_s3_bucket_policy" "portal" {
  bucket     = aws_s3_bucket.portal.id
  depends_on = [aws_s3_bucket_public_access_block.portal]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.portal.arn}/*"
      }
    ]
  })
}

# Upload ไฟล์ Portal
resource "aws_s3_object" "portal_html" {
  bucket       = aws_s3_bucket.portal.id
  key          = "index.html"
  source       = "../reporter-portal/index.html"
  content_type = "text/html; charset=utf-8"
  etag         = filemd5("../reporter-portal/index.html")
}

resource "aws_s3_object" "portal_js" {
  bucket       = aws_s3_bucket.portal.id
  key          = "script.js"
  source       = "../reporter-portal/script.js"
  content_type = "application/javascript"
  etag         = filemd5("../reporter-portal/script.js")
}

resource "aws_s3_object" "portal_css" {
  bucket       = aws_s3_bucket.portal.id
  key          = "style.css"
  source       = "../reporter-portal/style.css"
  content_type = "text/css"
  etag         = filemd5("../reporter-portal/style.css")
}
