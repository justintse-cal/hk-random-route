# Route Generator Context

Web app that generates a random jogging/walking route over the HK 3D Pedestrian Network, filtered by user criteria.

## Language

**Segment**:
A single walkable unit of the pedestrian network (one feature in the dataset, a polyline with attributes such as Location, WeatherProof, WheelchairBarrier, Gradient).
_Avoid_: link, edge

**Origin**:
The user's chosen starting point, snapped onto the nearest network node.
_Avoid_: start point

**Route**:
A connected sequence of segments that a runner can follow, generated to satisfy the chosen criteria.
_Avoid_: path, pathfinding result

**Criteria**:
The user's selections (target distance, covered, barrier-free, flat, loop) that constrain which segments a route may use. The covered criterion is also a soft preference: when off, the generator still leans toward covered segments without requiring them.
_Avoid_: filters, constraints

**Loop**:
A closed route that returns to its origin without repeating a segment.
_Avoid_: circuit, round trip

**One-way route**:
A route that ends at a random point without returning to its origin.
_Avoid_: one-way walk, A-to-B

**Out-and-back**:
A route that walks to a turnaround point and retraces the same path back to its origin.
v1 does not generate these: when the network cannot support a Loop near the origin, the generator returns a clear no-route error instead.
