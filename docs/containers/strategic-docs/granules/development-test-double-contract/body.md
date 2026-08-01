## Test Double Contract

This section defines when a test double can be used without changing the
development route. The development route itself is chosen by this matrix.

A focused test or fixture in a neighboring package can stay inside a `one shot`
only when all of these are true:

- it verifies the original task through the neighboring package public
  contract;
- it imports only exported symbols from the package entry point;
- it does not import, inspect, spy on or mock private paths;
- it does not change production source, exports, package dependencies or the
  internal dependency graph of the neighboring package;
- any local test double implements the public interface/type signature needed by
  the tested interaction.

If the test needs semantic guarantees beyond that local interaction, the work is
no longer a `one shot`: re-cut the route as `membrana-local-sprint` or a
container route and name the responsible holder.
