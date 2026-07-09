# Keep aim local until fire

Online aim changes stay local until the player fires. The active client can render angle and power immediately without sending every adjustment, and the server only validates and applies the final angle, power, and projectile choice in the fire intent that produces authoritative state diffs.
