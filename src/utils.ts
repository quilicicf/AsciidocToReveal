export function entries<KEY extends string, VALUE> (input: Record<KEY, VALUE>): [ KEY, VALUE ][] {
  return Object.entries(input) as [ KEY, VALUE ][];
}
