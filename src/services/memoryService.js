import pool from "../database/db";

export const saveMemory = async (userId, category, content) => {
    const query = `
        INSERT INTO user_memories
        (user_id, category, content)
        VALUES ($1, $2, $3)
        RETURNING *
    `;

    const { rows } = await pool.query(query, [userId, category, content]);

    return rows[0]
}

export const getMemories = async (userId) => {
    const query = `
        SELECT id, category, content
        FROM user_memories
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT 20
    `;

    const { rows } = pool.query(query, [userId]);

    return rows;
}

export const deleteMemory = async (userId, memoryId) => {
    const query = `
        DELETE FROM user_memories
        WHERE id = $1 AND user_id = $2
        RETURNING id
    `;

    const { rows } = pool.query(query, [memoryId, userId])

    return rows.length > 0
}