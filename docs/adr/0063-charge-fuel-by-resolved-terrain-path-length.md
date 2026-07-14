# Charge integer fuel per resolved terrain column

Tank fuel is integer-valued. For each next whole Surface Heightmap column, movement cost is the ceiling of the tank definition's fuel rate multiplied by the grounded distance to that column, including horizontal and vertical change. Resolution stops before an unaffordable column and Partial Movement charges only completed columns, while vertical Tank Settlement is free; the server never creates fractional fuel or a fractional final movement step.
