import { customAlphabet } from 'nanoid'

// Base62 alphabet: [0-9A-Za-z]. 10 chars gives ~59.5 bits of entropy â€”
// collision risk is negligible even at millions of notes, and we still
// verify uniqueness against Redis before committing a new note.
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const generate = customAlphabet(BASE62, 10)

export function generateSlug(): string {
  return generate()
}
