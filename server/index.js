#!/usr/bin/env node
// Minimal Telegram notification MCP server.
// Exposes one tool: send_message(text, parse_mode?)
// Reads BOT_TOKEN and CHAT_ID from environment (injected by MCPB user_config).

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error(
    "telegram-notifier: BOT_TOKEN and CHAT_ID must both be set in the MCP config."
  );
  process.exit(1);
}

const server = new Server(
  { name: "telegram-notifier", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "send_message",
      description:
        "Send a text message to the configured Telegram chat via the Bot API. Returns the Telegram message_id on success.",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description:
              "Message body. Respects Telegram's 4096-char limit (longer messages will be rejected by the API — split client-side if needed).",
          },
          parse_mode: {
            type: "string",
            enum: ["Markdown", "MarkdownV2", "HTML"],
            description:
              "Optional formatting mode. Omit for plain text. Use 'Markdown' for basic *bold* / _italic_ / `code`.",
          },
        },
        required: ["text"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== "send_message") {
    return {
      content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
      isError: true,
    };
  }

  const { text, parse_mode } = req.params.arguments ?? {};
  if (typeof text !== "string" || text.length === 0) {
    return {
      content: [{ type: "text", text: "Parameter `text` is required and must be a non-empty string." }],
      isError: true,
    };
  }

  const body = { chat_id: CHAT_ID, text };
  if (parse_mode) body.parse_mode = parse_mode;

  let apiResponse;
  try {
    apiResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  } catch (err) {
    return {
      content: [{ type: "text", text: `Network error contacting Telegram: ${err.message}` }],
      isError: true,
    };
  }

  let json;
  try {
    json = await apiResponse.json();
  } catch (err) {
    return {
      content: [
        { type: "text", text: `Telegram returned non-JSON (HTTP ${apiResponse.status}): ${err.message}` },
      ],
      isError: true,
    };
  }

  if (!apiResponse.ok || !json.ok) {
    return {
      content: [{ type: "text", text: `Telegram API error: ${JSON.stringify(json)}` }],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Message sent (message_id=${json.result.message_id}).`,
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
