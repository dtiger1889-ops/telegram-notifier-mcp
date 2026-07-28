# telegram-notifier-mcp

A minimal MCP (Model Context Protocol) server that gives an AI agent one tool: `send_message(text, parse_mode?)`, which posts a message to a Telegram chat via a bot. Useful for "notify me when the long job finishes" workflows from Claude Code, Claude Desktop, or any MCP client.

No database, no state, one dependency surface: the server reads `BOT_TOKEN` and `CHAT_ID` from the environment and calls the Telegram Bot API.

## Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the HTTP API token (format `123456789:AAxxxx...`).
2. Get your chat ID: message your bot once, then visit `https://api.telegram.org/bot<TOKEN>/getUpdates` and read `message.chat.id`.
3. Install dependencies: `npm install`.

## Use with Claude Code / any MCP client

Register as a stdio MCP server:

```json
{
  "mcpServers": {
    "telegram-notifier": {
      "command": "node",
      "args": ["path/to/server/index.js"],
      "env": { "BOT_TOKEN": "<your bot token>", "CHAT_ID": "<your chat id>" }
    }
  }
}
```

The `manifest.json` also makes this packageable as an MCPB desktop extension, with the token and chat ID collected as user config at install time.

## Where it can run

This is a **local stdio server**: it works in any session executing on the machine where it's registered (interactive Claude Code / Desktop, and scheduled tasks bound to a local runtime). A **cloud/hosted scheduled run cannot spawn it** — those sandboxes have no local MCP servers. From cloud runs, post to the Telegram Bot API directly over HTTPS (`https://api.telegram.org/bot<TOKEN>/sendMessage`) instead; the whole server is a thin wrapper around that one endpoint anyway.

## License

MIT. See [LICENSE](LICENSE).
