# JavaScript Closures — A Short Guide

A **closure** is when a function remembers variables from the place where it was created, even after that outer function has finished running.

## Why closures matter

Closures let you keep private data while still exposing behavior. This pattern appears in callbacks, event handlers, and module-style code in JavaScript.

## Example

```javascript
function makeCounter() {
  let count = 0;
  return function () {
    count += 1;
    return count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
```

Here, the inner function closes over `count`. Each call to `counter()` updates the same `count` variable.

## Common mistake

Beginners sometimes expect a loop variable to stay fixed inside a `setTimeout` callback. Without `let` or an IIFE, all callbacks may see the final value of `var i`.

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Often prints 3, 3, 3
```

Using `let` in the loop gives each iteration its own binding, which fixes the behavior.

## Summary

- A closure links a function to its lexical environment.
- Inner functions can read (and often update) outer variables.
- Closures are widely used for encapsulation and factory functions.
