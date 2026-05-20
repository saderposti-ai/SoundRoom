# Security Specification for "Room Noise"

## 1. Data Invariants
- **Room State (`/rooms/{roomId}`)**:
  - `user_count` must be a non-negative integer.
  - `mood_counts` and `active_sounds` must be key-value maps.
- **Messages (`/rooms/{roomId}/messages/{messageId}`)**:
  - `text` must be a string <= 70 characters.
  - `mood` must be one of the supported moods: "studying", "relaxing", "sad", "overthinking", "cozy", "sleepy", "productive", "lonely", "vibing".
  - `userCountry` must be a string between 2 and 50 characters.
  - `createdAt` must be set to `request.time`.
- **Presence (`/rooms/{roomId}/presences/{presenceId}`)**:
  - `x` and `y` must be floats between `0` and `100` representing screen coordinates.
  - `activeSounds` must be a list of sound IDs representing active ambient toggles.
  - `lastActive` must be set to `request.time`.

## 2. Hostile Payloads ("Dirty Dozen")
The following payloads will be strictly blocked:
1. Message text > 70 characters to avoid canvas pollution.
2. Message text as non-string (e.g., boolean or map).
3. Presence coordinates exceeding `100` or below `0`.
4. Spammed bulk writes with missing required timestamp/fields.
5. Setting country to a massive 1MB string.
6. Deleting the root Room structure by unauthorized entities.
7. Modifying `createdAt` field on subsequent updates of messages.
8. Injecting invalid types into `active_sounds` or `mood_counts` inside the global room.
9. Writing custom properties outside the strict blueprint model keys.
10. Submitting messages with a non-existent or malicious mood.
11. Injecting nested maps into the `activeSounds` list.
12. Attempting to hijack another session ID presence.
