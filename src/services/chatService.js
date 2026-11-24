import { initChatModel } from "langchain";
import {
    HumanMessage,
    AIMessage,
    SystemMessage,
} from "@langchain/core/messages";

import pool from "../database/db.js";
import config from "../config/index.js";
import { getMemories } from "./memoryService.js";

// Initialize model once
const model = await initChatModel(config.llmModel, {
    modelProvider: config.llmModelProvider,
    apiKey: config.llmApiKey,
});

// Retrieve conversation history
async function getChatHistory(conversationId) {
    const query = `
        SELECT role, content
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC, id ASC
        LIMIT 50
    `;

    const { rows } = await pool.query(query, [
        conversationId,
    ]);

    return rows.map((message) => {
        if (message.role === "human") {
            return new HumanMessage(message.content);
        }

        return new AIMessage(message.content);
    });
}

// Save message
async function saveMessage(conversationId, role, content) {
    const query = `
        INSERT INTO messages
        (conversation_id, role, content)
        VALUES ($1, $2, $3)
        RETURNING *
    `;

    const { rows } = await pool.query(query, [
        conversationId,
        role,
        content,
    ]);

    return rows[0];
}

// Generate AI response
export async function sendMessage(
    userId,
    conversationId,
    userMessage
) {
    // 1. Verify conversation ownership
    const conversationQuery = `
        SELECT id
        FROM conversations
        WHERE id = $1 AND user_id = $2
    `;

    const conversationResult = await pool.query(
        conversationQuery,
        [conversationId, userId]
    );

    if (conversationResult.rowCount === 0) {
        throw new Error("Conversation not found");
    }

    // 2. Retrieve previous chat history
    const history = await getChatHistory(conversationId);

    // 3. Retrieve long-term user memories
    const memories = await getMemories(userId);

    const memoryContext = memories.length
        ? memories.map(
            (memory) => `- ${memory.category}: ${memory.content}`
        ).join("\n")
        : "No saved user memories.";

    // 4. Build system prompt
    const systemMessage = new SystemMessage(`
        You are a helpful AI assistant.

        User information:
        ${memoryContext}

        Use this information when relevant.
        Do not assume that missing information is true.
    `);

    // 5. Save current user message
    await saveMessage(
        conversationId,
        "human",
        userMessage
    );

    // 6. Send system prompt + history + current message
    const response = await model.invoke([
        systemMessage,
        ...history,
        new HumanMessage(userMessage),
    ]);

    // 7. Extract AI response
    const aiResponse = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    // 8. Save AI response
    await saveMessage(
        conversationId,
        "assistant",
        aiResponse
    );

    // 9. Update conversation timestamp and title
    await pool.query(
        `UPDATE conversations
         SET updated_at = NOW(),
             title = CASE
                 WHEN title = 'New conversation'
                 THEN LEFT($2, 60)
                 ELSE title
             END
         WHERE id = $1`,
        [conversationId, userMessage]
    );

    return aiResponse;
}