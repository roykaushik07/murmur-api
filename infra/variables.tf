variable "cloudflare_api_token" {
  description = "API token with DNS edit rights on the murmurclips zone"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Zone ID of the murmurclips zone"
  type        = string
}
