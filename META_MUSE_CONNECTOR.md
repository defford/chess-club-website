# Meta Muse ↔ CNLSCC Custom Connector

This repository exposes a private API specifically so the **real Meta Muse product** can update and read CNLSCC chess data.

## What the connector can do

The connector gives Meta Muse four tools:

1. **Search players** — read-only; returns student ID, name, and grade.
2. **Get player summary** — read-only; returns games, W/D/L, ladder rank/points, Elo, attendance count, achievements, and recent chess-development observations.
3. **Record chess event** — write; records:
   - game results,
   - attendance,
   - player-development observations such as candidate generation, threat detection, calculation, evaluation, decision-making, helping others, and Stockfish survival.
4. **Undo chess event** — write; reverses a connector-recorded action. Game undo recalculates Elo and affected achievements.

The website does **not** provide its own Muse-like microphone UI. Voice interaction happens in Meta Muse.

## Authentication

Set a private server environment variable:

```
MUSE_CONNECTOR_API_KEY=<long-random-secret>
```

The API also accepts the legacy `MUSE_API_KEY` variable as a fallback.

Meta Muse should send the key in:

```
x-api-key: <secret>
```

The key must remain only in your hosting environment and Muse's Secure Credentials Store. Do not commit it to this repository.

## Connecting from Meta Muse

The deployed OpenAPI document is:

```
https://cnlscc.com/api/meta-muse/openapi
```

In Meta Muse, ask it to create a **Custom Connector** for the CNLSCC chess club using that OpenAPI URL. When Muse asks for credentials, supply the value of `MUSE_CONNECTOR_API_KEY`.

Meta documents Custom Connectors as a way to connect services not already in the connector list; Muse can guide the setup and stores credentials in its Secure Credentials Store.

## Example voice requests after connection

- "Record that Lucas beat Ethan in a ladder game."
- "Mark Ben, Sarah, Ethan, and Noah present at chess club tonight."
- "Record that Sophie captained our Stockfish survival game and survived 27 moves."
- "Give Emma a threat-detection development observation for tonight."
- "How is Emma progressing this season?"
- "Undo the game I just recorded."

## Player ambiguity

The API never silently chooses between ambiguous names. If "Jack" matches more than one student, the write returns a clarification response with candidate names/grades. Muse should ask which student was intended and then retry with the clarified name.

## Data model

Meta Muse writes facts/events. It does not directly increment wins, overwrite Elo, or edit calculated statistics. The existing chess system derives those values from the canonical game/event records.

The existing `muse_actions`, `player_events`, and persistent `achievements` tables are retained because they are useful for the real Meta Muse integration and for player-development history.
