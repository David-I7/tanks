# Send the resolved path in movement segments

Each Movement Segment response carries the ordered authoritative path points resolved by the server, including terrain-following and settlement motion, rather than only start and end positions. Clients interpolate along that path so confirmed tanks follow the terrain exactly and do not reconstruct authoritative movement from potentially divergent local assumptions.
