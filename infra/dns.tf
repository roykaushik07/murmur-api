resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api.murmurclips.app"
  content = "murmur-api.fly.dev"
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "clips" {
  zone_id = var.cloudflare_zone_id
  name    = "clips.murmurclips.app"
  content = "100::"
  type    = "AAAA"
  proxied = true
  comment = "Placeholder for the murmur-clipper Worker route"
}
